/**
 * @file comprobantesState.js
 * Estado reactivo Alpine.js con Paginación Real Servidor + Buffer Incremental.
 */

import { 
  formatMonto, formatTasa, obtenerME1, obtenerME2, 
  obtenerTasaSocioCalculada, claseInsignia, formatDiaHora 
} from '../utils/comprobantesFormatters.js';

import { 
  calcularSociosPendientesConsolidado, 
  calcularMovimientoFiltradoTotal 
} from '../services/saldosCalculatorService.js';

import { fetchComprobantesPaginados, eliminarComprobantePorHash } from '../services/comprobantesApiService.js';
import { crearAccionesModal } from '../services/comprobantesModalActions.js';
import { prepararEdicionComprobante, obtenerInsigniaRol } from '../services/comprobantesMapperService.js';
import { obtenerSaldoAnteriorSocio, obtenerSujetoAuditado } from '../services/comprobantesSaldosService.js';

function obtenerRangoMesActualCaracas() {
  const timeZone = 'America/Caracas';
  const ahora = new Date();
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });

  const primerDia = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const fechaInicio = fmt.format(primerDia);

  const ultimoDia = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
  const fechaFin = fmt.format(ultimoDia);

  return { fechaInicio, fechaFin };
}

export function comprobantesState() {
  const { fechaInicio: inicioMes, fechaFin: finMes } = obtenerRangoMesActualCaracas();

  const state = {
    // 1. CONTROL DE PAGINACIÓN SERVIDOR + DOM
    paginaAPI: 1,       // Página actual enviada al Backend
    limitAPI: 50,       // Lote que pedimos por llamada a la API
    todosLosItems: [],  // Buffer acumulado en memoria
    items: [],          // Visibles en pantalla
    directorio: [], 
    cargando: false, 
    hayMasDatos: true,
    
    tamanoLote: 20,
    capMaximoDOM: 300,  // Límite máximo en pantalla

    modalAbierto: false, 
    itemEdicion: null,
    loteActivo: 'T070',

    filtroRol: '', 
    filtroSocio: '', 
    filtroFechaInicio: inicioMes, 
    filtroFechaFin: finMes,
    filtroDesdeHash: '', 
    filtroHastaHash: '', 
    filtroOrden: 'fecha_desc',
    filtroHash: '', 
    saldoAnterior: 0,

    obtenerSujetoAuditado,
    obtenerInsigniaRol,

    get comprobantes() {
      return this.items;
    },

    get movimientoFiltradoTotal() {
      return calcularMovimientoFiltradoTotal(this.items, this.filtroSocio);
    },

    get saldoActualTotal() {
      return (parseFloat(this.saldoAnterior) || 0) + this.movimientoFiltradoTotal;
    },

    get sociosPendientesConsolidado() {
      return calcularSociosPendientesConsolidado(this.directorio, this.items, {
        fechaInicio: this.filtroFechaInicio, fechaFin: this.filtroFechaFin
      });
    },

    init() {
      this.$nextTick(() => {
        this.resetearYRefrescar();
        this.iniciarEscuchadoresScroll();
      });
    },

    actualizarSocioSeleccionado() {
      this.saldoAnterior = obtenerSaldoAnteriorSocio(this.directorio, this.filtroSocio);
      this.resetearYRefrescar();
    },

    async cargarComprobantes(silencioso = false) {
      return this.resetearYRefrescar();
    },

    async resetearYRefrescar() {
      this.items = [];
      this.todosLosItems = [];
      this.paginaAPI = 1;
      this.hayMasDatos = true;
      this.cargando = false;
      return this.cargarSiguientePagina();
    },

    // 🟢 PAGINACIÓN REAL CONTRA LA API + REVELADO PROGRESIVO DE 20 EN 20
    async cargarSiguientePagina() {
      if (this.cargando || !this.hayMasDatos) return;
      this.cargando = true;

      try {
        // A) Si el buffer local no tiene suficientes elementos para mostrar un nuevo lote de 20, pedimos más a la API
        if (this.items.length + this.tamanoLote > this.todosLosItems.length) {
          const params = {
            page: this.paginaAPI,
            limit: this.limitAPI,
            socio: this.filtroSocio, 
            rol: this.filtroRol,
            fechaInicio: this.filtroFechaInicio, 
            fechaFin: this.filtroFechaFin
          };

          const raw = await fetchComprobantesPaginados(params);
          const lista = Array.isArray(raw) ? raw : (raw?.datos || raw?.comprobantes || []);

          if (lista.length === 0) {
            this.hayMasDatos = false;
          } else {
            const mapeados = lista.map(item => prepararEdicionComprobante(item, this.loteActivo));

            // Cortafuegos de 2 socios (x2)
            const depurados2x = mapeados.filter(item => {
              const s2 = String(item.nombre_socio_2 || item.socio_2 || item.grupo_2?.grupo || '').toUpperCase().trim();
              const es2xValido = s2 !== '' && s2 !== 'GENERAL' && s2 !== 'NO DEFINIDO';
              return item.es_x2 || es2xValido;
            });

            // Evitar duplicados por HASH / ID
            const idsExistentes = new Set(this.todosLosItems.map(i => String(i.id || i.hash_largo)));
            const nuevosUnicos = depurados2x.filter(i => !idsExistentes.has(String(i.id || i.hash_largo)));

            this.todosLosItems = [...this.todosLosItems, ...nuevosUnicos];
            this.paginaAPI++;

            // Si la API devolvió menos del límite solicitado, ya se agotó la base de datos
            if (lista.length < this.limitAPI) {
              this.hayMasDatos = false;
            }
          }
        }

        // B) Revelar el siguiente lote de 20 en el DOM
        const proximoLimite = Math.min(
          this.items.length + this.tamanoLote,
          this.capMaximoDOM,
          this.todosLosItems.length
        );

        this.items = [...this.todosLosItems.slice(0, proximoLimite)];

        // Si ya alcanzamos el tope máximo en DOM (300) o se agotó el buffer y la API
        if (this.items.length >= this.capMaximoDOM) {
          this.hayMasDatos = false;
        }

      } catch (err) {
        console.error('❌ Error al cargar lote de comprobantes:', err);
      } finally {
        setTimeout(() => {
          this.cargando = false;
        }, 100);
      }
    },

    // 🟢 DETECTOR DE SCROLL ULTRA-SENSIBLE
    iniciarEscuchadoresScroll() {
      this.$nextTick(() => {
        const intentarCargar = () => {
          if (this.cargando || !this.hayMasDatos) return;

          const sentinel = document.getElementById('sentinel-scroll');
          if (!sentinel) return;

          const rect = sentinel.getBoundingClientRect();
          const vh = window.innerHeight || document.documentElement.clientHeight;

          if (rect.top <= vh + 600) {
            this.cargarSiguientePagina();
          }
        };

        document.addEventListener('scroll', intentarCargar, { capture: true, passive: true });
        window.addEventListener('scroll', intentarCargar, { passive: true });
        document.addEventListener('wheel', intentarCargar, { capture: true, passive: true });
        document.addEventListener('touchmove', intentarCargar, { capture: true, passive: true });

        setInterval(intentarCargar, 250);

        const sentinel = document.getElementById('sentinel-scroll');
        if (sentinel) {
          const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
              intentarCargar();
            }
          }, { rootMargin: '400px' });

          observer.observe(sentinel);
        }
      });
    },

    async eliminarComprobante(identificador) {
      if (!identificador) return;

      if (!confirm('¿Confirmas que deseas eliminar este comprobante?')) return;

      const idStr = String(identificador).trim();

      try {
        await eliminarComprobantePorHash(idStr);
      } catch (err) {
        console.error('❌ Error al eliminar:', err);
      } finally {
        this.items = this.items.filter(item => String(item.id || item.hash_largo || '') !== idStr);
        this.todosLosItems = this.todosLosItems.filter(item => String(item.id || item.hash_largo || '') !== idStr);
      }
    },

    formatMonto, formatTasa, obtenerME1, obtenerME2, obtenerTasaSocioCalculada, claseInsignia, formatDiaHora
  };

  Object.assign(state, crearAccionesModal(state));

  return state;
}
