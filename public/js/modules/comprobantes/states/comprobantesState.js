/**
 * =================================================================
 * @file comprobantesState.js
 * @path public/js/modules/comprobantes/states/comprobantesState.js
 * @description Estado reactivo puro Alpine.js.
 * =================================================================
 */

import { 
  formatMonto, formatTasa, obtenerME1, obtenerME2, 
  obtenerTasaSocioCalculada, claseInsignia, formatDiaHora 
} from '../utils/comprobantesFormatters.js';

import { 
  calcularSociosPendientesConsolidado, 
  calcularMovimientoFiltradoTotal 
} from '../services/saldosCalculatorService.js';

import { obtenerComprobantes } from '../services/comprobantesLecturaService.js';
import { comprobantesAcciones } from '../services/comprobantesAcciones.js'; // <-- Módulo de acciones modernizado
import { prepararEdicionComprobante } from '../services/comprobantesMapperService.js';
import { filtrarComprobantesAtómico } from '../services/comprobantesFilterService.js';
import { obtenerSaldoAnteriorSocio, obtenerSujetoAuditado } from '../services/comprobantesSaldosService.js';

export function comprobantesState() {
  const state = {
    // 1. ESTADO REACTIVO PURO
    items: [], 
    comprobantes: [], 
    directorio: [], 
    cargando: true, 
    modalAbierto: false, 
    modalEdicionAbierto: false,
    itemEdicion: null,
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

    // 2. HELPER EXPORTE PARA LA VISTA
    obtenerSujetoAuditado,

    // 3. CÁLCULOS RESTANTES DELEGADOS
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

    // 4. CICLO DE VIDA
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

    // 5. FORMATEADORES
    formatMonto, formatTasa, obtenerME1, obtenerME2, obtenerTasaSocioCalculada, claseInsignia, formatDiaHora
  };

  // Asignamos las acciones del modal y del flujo de comprobantes
  Object.assign(state, comprobantesAcciones);

  return state;
}
