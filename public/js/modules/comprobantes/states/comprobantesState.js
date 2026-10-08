/**
 * @file comprobantesState.js
 * @path public/js/modules/comprobantes/states/comprobantesState.js
 * @description Átomo de estado reactivo Alpine.js (Contenedor puro de estado).
 */

import { 
  formatMonto, formatTasa, obtenerME1, obtenerME2, 
  obtenerTasaSocioCalculada, claseInsignia 
} from '../utils/saldosFilterUtils.js';

import { 
  calcularSociosPendientesConsolidado, 
  calcularMovimientoFiltradoTotal 
} from '../services/saldosCalculatorService.js';

import { obtenerComprobantes } from '../services/comprobantesLecturaService.js';
import { crearAccionesModal } from '../services/comprobantesModalActions.js';
import { prepararEdicionComprobante } from '../services/comprobantesMapperService.js';
import { filtrarComprobantesAtómico } from '../services/comprobantesFilterService.js';
import { obtenerSaldoAnteriorSocio } from '../services/comprobantesSaldosService.js';

export function comprobantesState() {
  const state = {
    // 1. PROPIEDADES REACTIVAS BASE
    items: [], comprobantes: [], directorio: [], cargando: true, modalAbierto: false, itemEdicion: null,
    loteActivo: 'T052',

    // Filtros
    filtroRol: '', filtroSocio: '', filtroFechaInicio: '', filtroFechaFin: '',
    filtroDesdeHash: '', filtroHastaHash: '', ordenarPor: 'fecha_desc', filtroHashBusqueda: '',
    saldoAnterior: 0,

    // 2. GETTERS DELEGADOS
    get sujetoAuditado() {
      return (this.filtroSocio && this.filtroSocio !== 'TODOS') ? this.filtroSocio.toUpperCase() : 'TODOS LOS SOCIOS';
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

    // 3. COMUNICACIÓN Y ORQUESTACIÓN (1 LÍNEA POR ACCIÓN)
    init() {
      this.$nextTick(() => this.cargarComprobantes());
    },

    actualizarSocioSeleccionado() {
      this.saldoAnterior = obtenerSaldoAnteriorSocio(this.directorio, this.filtroSocio);
      this.cargarComprobantes();
    },

    async cargarComprobantes(silencioso = false) {
      if (!silencioso) this.cargando = true;

      const params = {
        socio: this.filtroSocio, rol: this.filtroRol,
        fechaInicio: this.filtroFechaInicio, fechaFin: this.filtroFechaFin,
        desdeHash: this.filtroDesdeHash, hastaHash: this.filtroHastaHash,
        hash: this.filtroHashBusqueda, orden: this.ordenarPor
      };

      const raw = await obtenerComprobantes(params);
      const mapeados = (Array.isArray(raw) ? raw : []).map(item => prepararEdicionComprobante(item, this.loteActivo));

      // Delegación completa del filtrado al servicio atómico
      const resultadoFinal = filtrarComprobantesAtómico(mapeados, this.directorio, this);

      this.items = resultadoFinal;
      this.comprobantes = resultadoFinal;
      this.cargando = false;
    },

    // 4. MÉTODOS AUXILIARES
    formatMonto, formatTasa, obtenerME1, obtenerME2, obtenerTasaSocioCalculada, claseInsignia
  };

  Object.assign(state, crearAccionesModal(state));

  return state;
}
