/**
 * @file comprobantesState.js
 * @description Estado reactivo Alpine.js con Infinite Scroll progresivo (20 en 20 hasta 200).
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
    // ESTADO DE DATOS
    todosLosItems: [],  // Catálogo completo de la API
    items: [],          // Lote visible en pantalla (20, 40, 60... máx 200)
    directorio: [], 
    cargando: false, 
    hayMasDatos: true,
    
    // RANGOS Y PÁGINA
    bloqueActual: 1,
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
        this.iniciarObserverScrollInfinito();
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
      this.bloqueActual = 1;
      this.hayMasDatos = true;
      return this.cargarSiguientePagina();
    },

    // 🟢 PAGINACIÓN PROGRESIVA FLUIDA (20 EN 20 -> MÁX 200)
    async cargarSiguientePagina() {
      if (this.cargando || !this.hayMasDatos) return;
      this.cargando = true;

      try {
        // 1. Si no hemos pedido los datos a la API, los traemos todos
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

          this.todosLosItems = lista.map(item => prepararEdicionComprobante(item, this.loteActivo));
        }

        // 2. Calcular cuántos items mostrar en este paso
        const objetivo = this.bloqueActual * this.tamanoLote;
        const limiteFinal = Math.min(objetivo, this.capMaximoDOM, this.todosLosItems.length);

        this.items = this.todosLosItems.slice(0, limiteFinal);
        this.bloqueActual++;

        // 3. Evaluar si quedan más tarjetas por revelar
        if (this.items.length >= this.capMaximoDOM || this.items.length >= this.todosLosItems.length) {
          this.hayMasDatos = false;
        }

      } catch (err) {
        console.error('❌ Error al cargar comprobantes:', err);
      } finally {
        this.cargando = false;
      }
    },

    iniciarObserverScrollInfinito() {
      this.$nextTick(() => {
        const sentinel = document.getElementById('sentinel-scroll');
        if (!sentinel) return;

        const observer = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting && !this.cargando && this.hayMasDatos) {
            this.cargarSiguientePagina();
          }
        }, { 
          root: null,
          rootMargin: '200px', // Carga antes de llegar exactamente al fondo
          threshold: 0.1 
        });

        observer.observe(sentinel);
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
