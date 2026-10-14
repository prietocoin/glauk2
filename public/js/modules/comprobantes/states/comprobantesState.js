/**
 * @file comprobantesState.js
 * @description Estado reactivo Alpine.js con Infinite Scroll atómico (20 en 20 hasta 200).
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
    // 1. REGISTROS Y CONTROL
    todosLosItems: [], // Almacén completo filtrado desde la API
    items: [],          // Arreglo visible renderizado en DOM (20, 40, 60... máx 200)
    directorio: [], 
    cargando: false, 
    hayMasDatos: true,
    
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

    // 2. METRICAS REACTIVAS SOBRE TARJETAS VISIBLES
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

    // 3. CICLO DE VIDA
    init() {
      this.$nextTick(() => {
        this.resetearYRefrescar();
        this.iniciarObserverFallback();
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

    // 🟢 DOSIFICADOR DE SCROLL INFINITO (INCREMENTOS DE 20 EN 20)
    async cargarSiguientePagina() {
      if (this.cargando || !this.hayMasDatos) return;
      this.cargando = true;

      try {
        // A) Petición inicial a la API si el buffer interno está vacío
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

        // B) Incremento del corte visible en el DOM
        const corteObjetivo = this.bloqueActual * this.tamanoLote;
        const limiteReal = Math.min(corteObjetivo, this.capMaximoDOM, this.todosLosItems.length);

        this.items = this.todosLosItems.slice(0, limiteReal);
        this.bloqueActual++;

        // C) Evaluar si llegamos al tope de 200 o si no quedan más registros
        if (this.items.length >= this.capMaximoDOM || this.items.length >= this.todosLosItems.length) {
          this.hayMasDatos = false;
        }

      } catch (err) {
        console.error('❌ Error al cargar lote de comprobantes:', err);
      } finally {
        this.cargando = false;
      }
    },

    // Respaldo por IntersectionObserver nativo si no se usa x-intersect
    iniciarObserverFallback() {
      const conectar = () => {
        const sentinel = document.getElementById('sentinel-scroll');
        if (!sentinel) {
          setTimeout(conectar, 200);
          return;
        }

        const observer = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting && !this.cargando && this.hayMasDatos) {
            this.cargarSiguientePagina();
          }
        }, { rootMargin: '250px', threshold: 0.01 });

        observer.observe(sentinel);
      };

      conectar();
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
