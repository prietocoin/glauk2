/**
 * @file comprobantesState.js
 * @description Estado reactivo de Alpine.js - Glaukapi Dashboard.
 * Paginación fluida 20 en 20 (máx 200) y cortafuegos atómico 2x.
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
    // 1. ESTADO DE DATOS
    todosLosItems: [],  // Catálogo completo filtrado desde la API
    items: [],          // Ítems visibles en el DOM (20, 40, 60... máx 200)
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

    // 🟢 ALIAS CRÍTICOS PARA EVITAR 'ReferenceError: comprobantes is not defined' EN PLANTILLAS
    get comprobantes() {
      return this.items;
    },

    // 2. MÉTRICAS REACTIVAS
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

    // 3. CICLO DE VIDA E INICIALIZACIÓN
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

    // 🟢 PAGINACIÓN PROGRESIVA CONTROLADA (20 EN 20 HASTA 200)
    async cargarSiguientePagina() {
      if (this.cargando || !this.hayMasDatos) return;
      this.cargando = true;

      try {
        // A) Petición inicial a la API si el buffer está vacío
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

          // Cortafuegos de 2 socios (x2)
          this.todosLosItems = mapeados.filter(item => {
            const s2 = String(item.nombre_socio_2 || item.socio_2 || item.grupo_2?.grupo || '').toUpperCase().trim();
            const es2xValido = s2 !== '' && s2 !== 'GENERAL' && s2 !== 'NO DEFINIDO';
            return item.es_x2 || es2xValido;
          });
        }

        // B) Calcular el siguiente bloque a incorporar en el DOM
        const cantidadActual = this.items.length;
        const siguienteCorte = Math.min(
          cantidadActual + this.tamanoLote,
          this.capMaximoDOM,
          this.todosLosItems.length
        );

        // Si no hay más que mostrar o llegamos al cap de 200
        if (siguienteCorte <= cantidadActual || cantidadActual >= this.capMaximoDOM) {
          this.hayMasDatos = false;
          return;
        }

        // Asignación directa
        this.items = this.todosLosItems.slice(0, siguienteCorte);

        // Evaluar estado final
        if (this.items.length >= this.todosLosItems.length || this.items.length >= this.capMaximoDOM) {
          this.hayMasDatos = false;
        }

      } catch (err) {
        console.error('❌ Error al cargar lote de comprobantes:', err);
      } finally {
        this.cargando = false;
      }
    },

    // 🟢 DETECTOR DE SCROLL ULTRA-ROBUSTO
    iniciarEscuchadoresScroll() {
      const evaluarScroll = () => {
        if (this.cargando || !this.hayMasDatos) return;

        const sentinel = document.getElementById('sentinel-scroll');
        if (!sentinel) return;

        const rect = sentinel.getBoundingClientRect();
        const vh = window.innerHeight || document.documentElement.clientHeight;

        // Dispara la carga cuando el centinela esté a menos de 400px de entrar a pantalla
        if (rect.top <= vh + 400) {
          this.cargarSiguientePagina();
        }
      };

      // Escuchar eventos en fase de captura (atrapa scroll en divs internos)
      document.addEventListener('scroll', evaluarScroll, { capture: true, passive: true });

      // Respaldo mediante IntersectionObserver
      const sentinel = document.getElementById('sentinel-scroll');
      if (sentinel) {
        const observer = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting && !this.cargando && this.hayMasDatos) {
            this.cargarSiguientePagina();
          }
        }, { rootMargin: '300px' });

        observer.observe(sentinel);
      }
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
