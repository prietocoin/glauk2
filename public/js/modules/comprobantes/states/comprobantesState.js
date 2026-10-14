/**
 * @file comprobantesState.js
 * @description Estado reactivo Alpine.js con cortafuegos de 2 socios (x2),
 * sondeo activo de scroll y carga incremental de 20 en 20 hasta 200.
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
    todosLosItems: [], // Buffer depurado que CUMPLE con la regla de 2 socios
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

    // 🟢 CARGA CON CORTAFUEGOS 2X + DOSIFICADOR DE SCROLL (20 EN 20)
    async cargarSiguientePagina() {
      if (this.cargando || !this.hayMasDatos) return;
      this.cargando = true;

      try {
        // A) Petición a la API y depuración atómica estricta (solo items 2x válidos)
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

          // 🟢 CORTAFUEGOS ATÓMICO: Descarta registros sin 2 socios o incompletos
          const depurados2x = filtrarComprobantesAtómico(mapeados, this.directorio, {
            filtroSocio: this.filtroSocio,
            filtroFechaInicio: this.filtroFechaInicio,
            filtroFechaFin: this.filtroFechaFin,
            filtroHash: this.filtroHash,
            filtroOrden: this.filtroOrden
          });

          // Filtrado adicional explícito
          this.todosLosItems = depurados2x.filter(item => {
            const s2 = String(item.nombre_socio_2 || item.socio_2 || item.grupo_2?.grupo || '').toUpperCase().trim();
            const es2xValido = s2 !== '' && s2 !== 'GENERAL' && s2 !== 'NO DEFINIDO';
            return item.es_x2 || es2xValido;
          });
        }

        // B) Incremento del corte visible en el DOM en bloques de 20
        const corteObjetivo = this.bloqueActual * this.tamanoLote;
        const limiteReal = Math.min(corteObjetivo, this.capMaximoDOM, this.todosLosItems.length);

        this.items = this.todosLosItems.slice(0, limiteReal);
        this.bloqueActual++;

        // C) Evaluar si alcanzamos el tope de 200 o se agotó el catálogo
        if (this.items.length >= this.todosLosItems.length || this.items.length >= this.capMaximoDOM) {
          this.hayMasDatos = false;
        } else {
          this.hayMasDatos = true;
        }

      } catch (err) {
        console.error('❌ Error al cargar lote de comprobantes:', err);
      } finally {
        this.cargando = false;
      }
    },

    // 🟢 DETECTOR INFALIBLE DE SCROLL (CAPTURA DE PROXIMIDAD + POLLING + INTERSECTION OBSERVER)
    iniciarObserverFallback() {
      this.$nextTick(() => {
        const verificarProximidad = () => {
          if (this.cargando || !this.hayMasDatos) return;

          const sentinel = document.getElementById('sentinel-scroll');
          if (!sentinel) return;

          const rect = sentinel.getBoundingClientRect();
          const windowHeight = window.innerHeight || document.documentElement.clientHeight;

          // Dispara cuando el centinela esté a menos de 600px del final visible
          if (rect.top <= windowHeight + 600) {
            this.cargarSiguientePagina();
          }
        };

        // 1. Atrapa eventos de scroll en la ventana y en cualquier contenedor interno
        document.addEventListener('scroll', verificarProximidad, { capture: true, passive: true });

        // 2. Intervalo de sondeo (polling) activo por si el scroll no emite evento
        setInterval(verificarProximidad, 400);

        // 3. Respaldo por IntersectionObserver
        const sentinel = document.getElementById('sentinel-scroll');
        if (sentinel) {
          const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !this.cargando && this.hayMasDatos) {
              this.cargarSiguientePagina();
            }
          }, { rootMargin: '500px' });

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
