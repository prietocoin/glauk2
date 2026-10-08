/**
 * =================================================================
 * @file comprobantesState.js
 * @path public/js/modules/comprobantes/states/comprobantesState.js
 * @description Estado reactivo magro Alpine.js (Orquestador ligero).
 * =================================================================
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
import { obtenerSaldoAnteriorSocio, obtenerSujetoAuditado } from '../services/comprobantesSaldosService.js';

export function comprobantesState() {
  const state = {
    // 1. ESTADO REACTIVO PURO (Sin funciones lógicas pesadas)
    items: [], comprobantes: [], directorio: [], cargando: true, modalAbierto: false, itemEdicion: null,
    loteActivo: 'T052',

    filtroRol: '', 
    filtroSocio: '', 
    filtroFechaInicio: '', 
    filtroFechaFin: '',
    filtroDesdeHash: '', 
    filtroHastaHash: '', 
    filtroOrden: 'fecha_desc',
    filtroHash: '', 
    saldoAnterior: 0,

    // 2. GETTERS MAGROS (Delegación directa a Servicios)
    get sujetoAuditado() {
      return obtenerSujetoAuditado(this.filtroSocio);
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

    // 3. CICLO DE VIDA Y ACCIONES DELEGADAS
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
        socio: this.filtroSocio, 
        rol: this.filtroRol,
        fechaInicio: this.filtroFechaInicio, 
        fechaFin: this.filtroFechaFin,
        desdeHash: this.filtroDesdeHash, 
        hastaHash: this.filtroHastaHash,
        hash: this.filtroHash, 
        orden: this.filtroOrden
      };

      const raw = await obtenerComprobantes(params);
      const mapeados = (Array.isArray(raw) ? raw : []).map(item => prepararEdicionComprobante(item, this.loteActivo));

      const resultadoFinal = filtrarComprobantesAtómico(mapeados, this.directorio, {
        filtroSocio: this.filtroSocio,
        filtroFechaInicio: this.filtroFechaInicio,
        filtroFechaFin: this.filtroFechaFin,
        filtroHash: this.filtroHash,
        filtroOrden: this.filtroOrden
      });

      this.items = resultadoFinal;
      this.comprobantes = resultadoFinal;
      this.cargando = false;
    },

    // 4. FORMATEADORES IMPORTADOS
    formatMonto, formatTasa, obtenerME1, obtenerME2, obtenerTasaSocioCalculada, claseInsignia
  };

  Object.assign(state, crearAccionesModal(state));

  return state;
}
