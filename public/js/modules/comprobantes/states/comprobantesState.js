/**
 * @file comprobantesState.js
 * @path public/js/modules/comprobantes/states/comprobantesState.js
 * @description Átomo de estado reactivo Alpine.js para la auditoría de comprobantes.
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

export function comprobantesState() {
  const state = {
    // 1. PROPIEDADES REACTIVAS Y FILTROS
    items: [], comprobantes: [], cargando: true, modalAbierto: false, itemEdicion: null,
    loteActivo: 'T052',
    filtroRol: '', filtroSocio: '', filtroFechaInicio: '', filtroFechaFin: '',
    filtroDesdeHash: '', filtroHastaHash: '', filtroOrden: 'fecha_desc', filtroHash: '',

    // 2. GETTERS COMPUTADOS
    get sujetoAuditado() { return !this.filtroSocio ? 'CONSOLIDADO GENERAL' : `SOCIO / ENTIDAD: ${this.filtroSocio}`; },
    get saldoAnterior() { return 0.00; },
    get saldoActualTotal() { return (this.saldoAnterior || 0) + (this.movimientoFiltradoTotal || 0); },
    
    get comprobantesProcesadosYOrdenados() {
      if (!Array.isArray(this.items) || this.items.length === 0) return [];
      return this.items.map(item => prepararEdicionComprobante(item, this.loteActivo));
    },

    get movimientoFiltradoTotal() { 
      return calcularMovimientoFiltradoTotal(this.comprobantesProcesadosYOrdenados, this.filtroSocio); 
    },

    get sociosPendientesConsolidado() {
      return calcularSociosPendientesConsolidado(this.directorio, this.comprobantesProcesadosYOrdenados, {
        fechaInicio: this.filtroFechaInicio, fechaFin: this.filtroFechaFin
      });
    },

    // 3. INICIALIZACIÓN Y CARGA DE API
    async init() { await this.cargarComprobantes(); },

    async cargarComprobantes() {
      this.cargando = true;
      const params = {
        rol: this.filtroRol, socio: this.filtroSocio,
        fechaInicio: this.filtroFechaInicio, fechaFin: this.filtroFechaFin,
        desdeHash: this.filtroDesdeHash, hastaHash: this.filtroHastaHash,
        orden: this.filtroOrden, hash: this.filtroHash
      };
      this.items = (await obtenerComprobantes(params)) || [];
      this.comprobantes = this.items;
      this.cargando = false;
    },

    // 4. FORMATEADORES ATÓMICOS
    formatMonto, formatTasa, obtenerME1, obtenerME2, obtenerTasaSocioCalculada, claseInsignia
  };

  Object.assign(state, crearAccionesModal(state));

  return state;
}
