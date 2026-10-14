/**
 * @file comprobantesState.js
 * Solución definitiva de Infinite Scroll mediante escucha directa de eventos de interacción.
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
    todosLosItems: [],
    items: [],
    directorio: [], 
    cargando: false, 
    hayMasDatos: true,
    
    tamanoLote: 20,
    capMaximoDOM: 200,

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
      this.hayMasDatos = true;
      this.cargando = false;
      return this.cargarSiguientePagina();
    },

    // 🟢 CARGA INCREMENTAL INFALIBLE
    async cargarSiguientePagina() {
      if (this.cargando || !this.hayMasDatos) return;
      this.cargando = true;

      try {
        if (this.todosLosItems.length === 0) {
          const params = {
            page: 1,
            limit: 200,
            socio: this.filtroSocio, 
            rol: this.filtroRol,
            fechaInicio: this.filtroFechaInicio, 
            fechaFin: this.filtroFechaFin
          };

          const raw = await fetchComprobantesPaginados(params);
          const lista = Array.isArray(raw) ? raw : (raw?.datos || raw?.comprobantes || []);

          const mapeados = lista.map(item => prepararEdicionComprobante(item, this.loteActivo));

          // Cortafuegos atómico de 2 socios
          this.todosLosItems = mapeados.filter(item => {
            const s2 = String(item.nombre_socio_2 || item.socio_2 || item.grupo_2?.grupo || '').toUpperCase().trim();
            const es2xValido = s2 !== '' && s2 !== 'GENERAL' && s2 !== 'NO DEFINIDO';
            return item.es_x2 || es2xValido;
          });
        }

        if (this.todosLosItems.length === 0) {
          this.items = [];
          this.hayMasDatos = false;
          return;
        }

        // Calcular nuevo lote (+20)
        const proximoLimite = Math.min(
          this.items.length + this.tamanoLote,
          this.capMaximoDOM,
          this.todosLosItems.length
        );

        this.items = this.todosLosItems.slice(0, proximoLimite);

        // Evaluar fin
        this.hayMasDatos = this.items.length < this.todosLosItems.length && this.items.length < this.capMaximoDOM;

      } catch (err) {
        console.error('❌ Error al cargar lote de comprobantes:', err);
      } finally {
        setTimeout(() => {
          this.cargando = false;
        }, 200);
      }
    },

    // 🟢 DISPARADOR DE CARGA POR INTERACCIÓN DIRECTA (RUEDA / TOUCH / SCROLL)
   // 🟢 DETECTOR DE SCROLL ULTRA-SENSIBLE E INFALIBLE
    iniciarEscuchadoresScroll() {
      this.$nextTick(() => {
        const intentarCargar = () => {
          if (this.cargando || !this.hayMasDatos) return;

          const sentinel = document.getElementById('sentinel-scroll');
          if (!sentinel) return;

          const rect = sentinel.getBoundingClientRect();
          const vh = window.innerHeight || document.documentElement.clientHeight;

          // Si el centinela se acerca a menos de 500px del área visible de la pantalla
          if (rect.top <= vh + 500) {
            this.cargarSiguientePagina();
          }
        };

        // 1. ESCUCHA CAPTURADORA UNIVERSAL (Atrapa el scroll en CUALQUIER div interno)
        document.addEventListener('scroll', intentarCargar, { capture: true, passive: true });
        window.addEventListener('scroll', intentarCargar, { passive: true });

        // 2. ESCUCHA DE LA RUEDA DEL MOUSE Y PANTALLA TÁCTIL
        document.addEventListener('wheel', intentarCargar, { capture: true, passive: true });
        document.addEventListener('touchmove', intentarCargar, { capture: true, passive: true });

        // 3. SONDEO ACTIVO (Comprueba la posición del centinela constantemente)
        setInterval(intentarCargar, 250);

        // 4. INTERSECTION OBSERVER SOBRE EL VIEWPORT
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
