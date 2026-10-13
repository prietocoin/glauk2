/**
 * @file comprobantesState.js
 * @description Estado reactivo Alpine.js con soporte atómico de Infinite Scroll y tope DOM (200 cards max).
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

export function comprobantesState() {
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
    filtroFechaInicio: '', 
    filtroFechaFin: '',
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

    // 🟢 ALIAS REQUERIDO POR VISTAS / EVENTOS EJS
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

    // 🟢 CARGA PAGINADA CON CAP MÁXIMO DE 200 ELEMENTOS EN DOM
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

        // Aplica cortafuegos de 2 socios obligatorios (x2)
        const filtrados = filtrarComprobantesAtómico(mapeados, this.directorio, {
          filtroSocio: this.filtroSocio,
          filtroFechaInicio: this.filtroFechaInicio,
          filtroFechaFin: this.filtroFechaFin,
          filtroHash: this.filtroHash,
          filtroOrden: this.filtroOrden
        });

        // Acumular respetando el CAP de 200 elementos
        let acumulados = [...this.items, ...filtrados];
        if (acumulados.length > this.capMaximoDOM) {
          acumulados = acumulados.slice(acumulados.length - this.capMaximoDOM);
        }

        this.items = acumulados;
        this.comprobantes = acumulados;
        this.paginaActual++;

        // 🟢 AUTO-REFILL: Si el filtro descartó basuras y la pantalla quedó con pocos ítems, pedir la siguiente página
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
      }, { rootMargin: '200px' });

      const sentinel = document.getElementById('sentinel-scroll');
      if (sentinel) observer.observe(sentinel);
    },

    // 🟢 ELIMINACIÓN ATÓMICA DE TARJETAS
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
        // Remoción inmediata en interfaz reactiva
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

    // 4. FORMATEADORES EXPORTADOS
    formatMonto, formatTasa, obtenerME1, obtenerME2, obtenerTasaSocioCalculada, claseInsignia, formatDiaHora
  };

  Object.assign(state, crearAccionesModal(state));

  return state;
}
