/**
 * @file comprobantesState.js
 * @description Estado reactivo Alpine.js corregido con paginación real de 20 en 20 y cap de 200.
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

/**
 * Calcula el primer y último día del mes en curso en zona horaria America/Caracas (YYYY-MM-DD)
 */
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
    // 1. ESTADO REACTIVO Y CONTROLES DE PAGINACIÓN
    todosLosItems: [], // Buffer completo devuelto por la API
    items: [],          // Ítems visibles renderizados en el DOM (Inicial 20 -> Máx 200)
    directorio: [], 
    cargando: false, 
    hayMasDatos: true,
    paginaActual: 1,
    limitePorPagina: 20,
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

    // 2. CÁLCULOS REACTIVOS SOBRE LO VISIBLE
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

    // 3. CICLO DE VIDA E INFINITE SCROLL
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
      this.paginaActual = 1;
      this.hayMasDatos = true;
      return this.cargarSiguientePagina();
    },

    // 🟢 CARGA Y DOSIFICACIÓN CONTROLADA (20 EN 20 -> MÁX 200)
    async cargarSiguientePagina() {
      if (this.cargando || !this.hayMasDatos) return;
      this.cargando = true;

      try {
        // Si no hemos cargado la API aún, traemos los datos del mes
        if (this.todosLosItems.length === 0) {
          const params = {
            page: 1,
            limit: 200, // Solicitamos el cupo máximo al backend
            socio: this.filtroSocio, 
            rol: this.filtroRol,
            fechaInicio: this.filtroFechaInicio, 
            fechaFin: this.filtroFechaFin
          };

          const raw = await fetchComprobantesPaginados(params);
          const lista = Array.isArray(raw) ? raw : (raw?.datos || raw?.comprobantes || []);

          // Mapear el catálogo completo
          this.todosLosItems = lista.map(item => prepararEdicionComprobante(item, this.loteActivo));
        }

        // Determinar el siguiente bloque de 20 para el DOM
        const siguienteFin = this.paginaActual * this.limitePorPagina;
        const limiteReal = Math.min(siguienteFin, this.capMaximoDOM, this.todosLosItems.length);

        this.items = this.todosLosItems.slice(0, limiteReal);
        this.paginaActual++;

        // Evaluar fin de scroll
        if (this.items.length >= this.capMaximoDOM || this.items.length >= this.todosLosItems.length) {
          this.hayMasDatos = false;
        }

      } catch (err) {
        console.error('❌ Error al cargar página de comprobantes:', err);
      } finally {
        this.cargando = false;
      }
    },

    iniciarObserverScrollInfinito() {
      const sentinel = document.getElementById('sentinel-scroll');
      if (!sentinel) return;

      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !this.cargando && this.hayMasDatos) {
          this.cargarSiguientePagina();
        }
      }, { rootMargin: '200px' });

      observer.observe(sentinel);
    },

    async eliminarComprobante(identificador) {
      if (!identificador) return;

      if (!confirm('¿Confirmas que deseas eliminar este comprobante?')) {
        return;
      }

      const idStr = String(identificador).trim();

      try {
        await eliminarComprobantePorHash(idStr);
      } catch (err) {
        console.error('❌ Error al eliminar en API:', err);
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
