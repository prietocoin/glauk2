/**
 * @file comprobantesState.js
 * Estado reactivo Alpine.js con filtro automático de Mes en Curso (America/Caracas),
 * Infinite Scroll en lotes de 20 y tope máximo DOM de 200 tarjetas.
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
import { filtrarComprobantesAtómico } from '../services/comprobantesFilterService.js';
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
    items: [], 
    comprobantes: [], 
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
    
    // 🟢 RANGO AUTOMÁTICO DE MES EN CURSO
    filtroFechaInicio: inicioMes, 
    filtroFechaFin: finMes,
    
    filtroDesdeHash: '', 
    filtroHastaHash: '', 
    filtroOrden: 'fecha_desc',
    filtroHash: '', 
    saldoAnterior: 0,

    obtenerSujetoAuditado,
    obtenerInsigniaRol,

    // 2. CÁLCULOS REACTIVOS
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

    resetearYRefrescar() {
      this.items = [];
      this.comprobantes = [];
      this.paginaActual = 1;
      this.hayMasDatos = true;
      return this.cargarSiguientePagina();
    },

    // 🟢 CARGA PAGINADA EN LOTES DE 20
    async cargarSiguientePagina() {
      if (this.cargando || !this.hayMasDatos) return;
      this.cargando = true;

      const params = {
        page: this.paginaActual,
        limit: this.limitePorPagina,
        socio: this.filtroSocio, 
        rol: this.filtroRol,
        fechaInicio: this.filtroFechaInicio, 
        fechaFin: this.filtroFechaFin
      };

      try {
        const raw = await fetchComprobantesPaginados(params);
        
        if (!Array.isArray(raw) || raw.length < this.limitePorPagina) {
          this.hayMasDatos = false;
        }

        const mapeados = (Array.isArray(raw) ? raw : []).map(item => prepararEdicionComprobante(item, this.loteActivo));

        // Aplica cortafuegos de 2 socios obligatorios (x2) y filtros de fecha
        const filtrados = filtrarComprobantesAtómico(mapeados, this.directorio, {
          filtroSocio: this.filtroSocio,
          filtroFechaInicio: this.filtroFechaInicio,
          filtroFechaFin: this.filtroFechaFin,
          filtroHash: this.filtroHash,
          filtroOrden: this.filtroOrden
        });

        // Acumular respetando el CAP de 200 elementos
        let acumulados = [...this.items, ...filtrados];
        
        if (acumulados.length >= this.capMaximoDOM) {
          acumulados = acumulados.slice(0, this.capMaximoDOM);
          this.hayMasDatos = false;
        }

        this.items = acumulados;
        this.comprobantes = acumulados;
        this.paginaActual++;

        if (this.items.length < 10 && this.hayMasDatos) {
          this.cargando = false;
          return this.cargarSiguientePagina();
        }

      } catch (err) {
        console.error('❌ Error al cargar página de comprobantes:', err);
      } finally {
        this.cargando = false;
      }
    },

    iniciarObserverScrollInfinito() {
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !this.cargando && this.hayMasDatos) {
          this.cargarSiguientePagina();
        }
      }, { rootMargin: '150px' });

      const sentinel = document.getElementById('sentinel-scroll');
      if (sentinel) observer.observe(sentinel);
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
        this.items = this.items.filter(item => {
          return (
            String(item.hash_largo || '') !== idStr &&
            String(item.hash || '') !== idStr &&
            String(item.id || '') !== idStr &&
            String(item._id || '') !== idStr &&
            String(item.referencia || '') !== idStr
          );
        });
        this.comprobantes = [...this.items];
      }
    },

    formatMonto, formatTasa, obtenerME1, obtenerME2, obtenerTasaSocioCalculada, claseInsignia, formatDiaHora
  };

  Object.assign(state, crearAccionesModal(state));

  return state;
}
