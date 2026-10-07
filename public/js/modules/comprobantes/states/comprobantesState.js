/**
 * @file comprobantesState.js
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

import { obtenerComprobantesApi } from '../services/comprobantesApiService.js';
import { crearAccionesModal } from '../services/comprobantesModalActions.js';

export function comprobantesState() {
  const state = {
    // 1. PROPIEDADES REACTIVAS Y FILTROS
    items: [], comprobantes: [], cargando: false, modalAbierto: false, itemEdicion: null,
    filtroRol: '', filtroSocio: '', filtroFechaInicio: '', filtroFechaFin: '',
    filtroDesdeHash: '', filtroHastaHash: '', filtroOrden: 'fecha_desc', filtroHash: '',

    // 2. GETTERS COMPUTADOS
    get sujetoAuditado() { return !this.filtroSocio ? 'CONSOLIDADO GENERAL' : `SOCIO / ENTIDAD: ${this.filtroSocio}`; },
    get saldoAnterior() { return 0.00; },
    get saldoActualTotal() { return (this.saldoAnterior || 0) + (this.movimientoFiltradoTotal || 0); },
    get comprobantesProcesadosYOrdenados() { return this.items; },
    get movimientoFiltradoTotal() { return calcularMovimientoFiltradoTotal(this.items, this.filtroSocio); },
    get sociosPendientesConsolidado() {
      return calcularSociosPendientesConsolidado(this.directorio, this.items, {
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
      this.items = (await obtenerComprobantesApi(params)) || [];
      this.comprobantes = this.items;
      this.cargando = false;
    },

    // 4. FORMATEADORES ATÓMICOS
    formatMonto, formatTasa, obtenerME1, obtenerME2, obtenerTasaSocioCalculada, claseInsignia
  };

  // Inyección de acciones del modal
  Object.assign(state, crearAccionesModal(state));

  return state;
}
