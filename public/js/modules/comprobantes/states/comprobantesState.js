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
    items: [], comprobantes: [], directorio: [], cargando: true, modalAbierto: false, itemEdicion: null,
    loteActivo: 'T052',
    filtroRol: '', filtroSocio: '', filtroFechaInicio: '', filtroFechaFin: '',
    filtroDesdeHash: '', filtroHastaHash: '', filtroOrden: 'fecha_desc', filtroHash: '',

    // 2. GETTERS COMPUTADOS (Con soporte para arreglos puros y respuestas envueltas)
    get sujetoAuditado() { return !this.filtroSocio ? 'CONSOLIDADO GENERAL' : `SOCIO / ENTIDAD: ${this.filtroSocio}`; },
    get saldoAnterior() { return 0.00; },
    get saldoActualTotal() { return (this.saldoAnterior || 0) + (this.movimientoFiltradoTotal || 0); },
    
    get comprobantesProcesadosYOrdenados() {
      const lista = Array.isArray(this.items) 
        ? this.items 
        : (this.items?.objects || this.items?.comprobantes || []);
      
      if (!lista.length) return [];

      return lista.map(item => {
        try {
          return prepararEdicionComprobante(item, this.loteActivo) || item;
        } catch (err) {
          console.error('[comprobantesState ⚠️ Error mapeando ítem]:', err, item);
          return item; // Fallback al objeto crudo para evitar vaciar la grilla
        }
      });
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
      const res = await obtenerComprobantes(params);
      this.items = Array.isArray(res) ? res : (res?.objects || res?.comprobantes || []);
      this.comprobantes = this.items;
      this.cargando = false;
    },

    // 4. FORMATEADORES ATÓMICOS
    formatMonto, formatTasa, obtenerME1, obtenerME2, obtenerTasaSocioCalculada, claseInsignia
  };

  Object.assign(state, crearAccionesModal(state));

  return state;
}
