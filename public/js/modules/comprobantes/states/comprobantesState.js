/**
 * @file comprobantesState.js
 * @path public/js/modules/comprobantes/states/comprobantesState.js
 * @description Átomo de estado reactivo Alpine.js sincronizado con los servicios atómicos.
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
    // 1. PROPIEDADES REACTIVAS BASE
    rawItems: [], 
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

    // 2. GETTERS COMPUTADOS (DELEGACIÓN A SERVICIOS)
    get sujetoAuditado() { 
      return this.filtroSocio ? this.filtroSocio.toUpperCase() : 'TODOS LOS SOCIOS'; 
    },
    
    get saldoActualTotal() { 
      return (parseFloat(this.saldoAnterior) || 0) + this.movimientoFiltradoTotal; 
    },

    // GETTER PRINCIPAL DE COMPROBANTES FILTRADOS
    get comprobantesProcesadosYOrdenados() {
      return filtrarComprobantesPorSocio(this.rawItems, this.directorio, this.filtroSocio);
    },

    // ALIAS REACTIVO PARA MANTENER COMPATIBILIDAD CON "x-for='item in items'" EN LA VISTA
    get items() {
      return this.comprobantesProcesadosYOrdenados;
    },

    get movimientoFiltradoTotal() { 
      return calcularMovimientoFiltradoTotal(this.comprobantesProcesadosYOrdenados, this.filtroSocio); 
    },

    get sociosPendientesConsolidado() {
      return calcularSociosPendientesConsolidado(this.directorio, this.comprobantesProcesadosYOrdenados, {
        fechaInicio: this.filtroFechaInicio, 
        fechaFin: this.filtroFechaFin
      });
    },

    // 3. COMUNICACIÓN CON API
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

      // Mapea y almacena en la lista base sin filtrar
      this.rawItems = lista.map(item => prepararEdicionComprobante(item, this.loteActivo));
      this.comprobantes = this.rawItems;
      this.cargando = false;
    },

    // 4. MÉTODOS DE FORMATO E INTERFAZ
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
