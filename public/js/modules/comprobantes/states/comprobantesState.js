/**
 * @file comprobantesState.js
 * @path public/js/modules/comprobantes/states/comprobantesState.js
 * @description Átomo de estado reactivo Alpine.js (fuente de verdad pura).
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
import { filtrarComprobantesPorSocio, limpiarFiltro } from '../services/comprobantesFilterService.js';

export function comprobantesState() {
  const state = {
    // 1. PROPIEDADES REACTIVAS
    rawItems: [],
    items: [],
    comprobantes: [],
    directorio: [],
    cargando: true,
    modalAbierto: false,
    itemEdicion: null,
    loteActivo: 'T052',

    filtroRol: '',
    filtroSocio: '',
    filtroFechaInicio: '',
    filtroFechaFin: '',
    filtroDesdeHash: '',
    filtroHastaHash: '',
    ordenarPor: 'fecha_desc',
    filtroHashBusqueda: '',
    saldoAnterior: 0,

    // 2. GETTERS COMPUTADOS (DELEGACIÓN DIRECTA A SERVICIOS)
    get sujetoAuditado() {
      return this.filtroSocio ? this.filtroSocio.toUpperCase() : 'TODOS LOS SOCIOS';
    },

    get movimientoFiltradoTotal() {
      return calcularMovimientoFiltradoTotal(this.items, this.filtroSocio);
    },

    get saldoActualTotal() {
      return (parseFloat(this.saldoAnterior) || 0) + this.movimientoFiltradoTotal;
    },

    get sociosPendientesConsolidado() {
      return calcularSociosPendientesConsolidado(this.directorio, this.items, {
        fechaInicio: this.filtroFechaInicio,
        fechaFin: this.filtroFechaFin
      });
    },

    // 3. CICLO DE VIDA Y DELEGACIÓN
    init() {
      this.$nextTick(() => {
        this.cargarComprobantes();
      });
    },

    actualizarSocioSeleccionado() {
      const socioNom = (this.filtroSocio || '').trim().toUpperCase();
      if (socioNom) {
        const socioFound = (this.directorio || []).find(d => (d.nombre || '').trim().toUpperCase() === socioNom);
        const saldoVal = socioFound?.saldo_inicial ?? socioFound?.saldo_anterior;
        this.saldoAnterior = (saldoVal !== undefined && saldoVal !== null) ? parseFloat(saldoVal) || 0 : 0;
      } else {
        this.saldoAnterior = 0;
      }
      this.aplicarFiltroLocal();
    },

    // DELEGACIÓN PURA AL SERVICIO ATÓMICO
    aplicarFiltroLocal() {
      const filtrados = filtrarComprobantesPorSocio(this.rawItems, this.directorio, this.filtroSocio);
      this.items = filtrados;
      this.comprobantes = filtrados;
    },

    async cargarComprobantes(silencioso = false) {
      if (!silencioso) this.cargando = true;

      const params = {
        rol: limpiarFiltro(this.filtroRol),
        fechaInicio: this.filtroFechaInicio,
        fechaFin: this.filtroFechaFin,
        hash: this.filtroHashBusqueda,
        orden: this.ordenarPor
      };

      const raw = (await obtenerComprobantes(params)) || [];
      const lista = Array.isArray(raw) ? raw : (raw.objects || raw.comprobantes || []);

      // Prepara datos con el mapper y los guarda en rawItems
      this.rawItems = lista.map(item => prepararEdicionComprobante(item, this.loteActivo));
      
      // Aplica el servicio de filtrado y asigna a la reactividad de la vista (items)
      this.aplicarFiltroLocal();
      this.cargando = false;
    },

    // 4. FORMATEADORES ATÓMICOS
    formatMonto,
    formatTasa,
    obtenerME1,
    obtenerME2,
    obtenerTasaSocioCalculada,
    claseInsignia
  };

  Object.assign(state, crearAccionesModal(state));

  return state;
}
