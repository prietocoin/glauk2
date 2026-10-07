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

    // 2. GETTERS COMPUTADOS
    get sujetoAuditado() { return !this.filtroSocio ? 'CONSOLIDADO GENERAL' : `SOCIO / ENTIDAD: ${this.filtroSocio}`; },
    get saldoAnterior() { return 0.00; },
    get saldoActualTotal() { return (this.saldoAnterior || 0) + (this.movimientoFiltradoTotal || 0); },
    
    get comprobantesProcesadosYOrdenados() {
      const lista = Array.isArray(this.items) ? this.items : [];
      if (!lista.length) return [];

      return lista.map(item => {
        try {
          return prepararEdicionComprobante(item, this.loteActivo) || item;
        } catch (e) {
          return item;
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

    // 3. INICIALIZACIÓN SECUENCIAL (Carga diferida pos-montaje DOM)
    init() {
      setTimeout(() => {
        this.cargarComprobantes();
      }, 100);
    },

    async cargarComprobantes() {
      this.cargando = true;
      
      // Sanitización de filtros para evitar considerar 'TODOS' como valor literal de búsqueda
      const limpiarFiltro = (val) => (!val || val.toUpperCase() === 'TODOS') ? '' : val;

      const params = {
        rol: limpiarFiltro(this.filtroRol),
        socio: limpiarFiltro(this.filtroSocio),
        fechaInicio: this.filtroFechaInicio,
        fechaFin: this.filtroFechaFin,
        desdeHash: limpiarFiltro(this.filtroDesdeHash),
        hastaHash: limpiarFiltro(this.filtroHastaHash),
        orden: this.filtroOrden,
        hash: this.filtroHash
      };
      
      const raw = (await obtenerComprobantes(params)) || [];
      const lista = Array.isArray(raw) ? raw : (raw.objects || raw.comprobantes || []);
      
      this.items = lista;
      this.comprobantes = this.items;
      this.cargando = false;
    },

    // 4. FORMATEADORES ATÓMICOS
    formatMonto, formatTasa, obtenerME1, obtenerME2, obtenerTasaSocioCalculada, claseInsignia
  };

  Object.assign(state, crearAccionesModal(state));

  return state;
}
