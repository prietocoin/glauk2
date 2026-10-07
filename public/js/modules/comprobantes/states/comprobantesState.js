/**
 * @file comprobantesState.js
 * @description Átomo de estado reactivo Alpine.js para la auditoría de comprobantes.
 */

import { 
  formatMonto, 
  formatTasa, 
  obtenerME1, 
  obtenerME2, 
  obtenerTasaSocioCalculada, 
  claseInsignia 
} from '../utils/comprobantesFormatters.js';

import { 
  calcularSociosPendientesConsolidado, 
  calcularMovimientoFiltradoTotal 
} from '../services/saldosCalculatorService.js';

import { 
  formatMonto, 
  formatTasa, 
  obtenerME1, 
  obtenerME2, 
  obtenerTasaSocioCalculada, 
  claseInsignia 
} from '../utils/comprobantesFormatters.js';

export function comprobantesState() {
  return {
    // 1. PROPIEDADES REACTIVAS
    items: [],
    comprobantes: [],
    cargando: false,
    modalAbierto: false,
    itemEdicion: null,

    // Filtros
    filtroRol: '',
    filtroSocio: '',
    filtroFechaInicio: '',
    filtroFechaFin: '',
    filtroDesdeHash: '',
    filtroHastaHash: '',
    filtroOrden: 'fecha_desc',
    filtroHash: '',

    // 2. GETTERS COMPUTADOS
    get sujetoAuditado() {
      return !this.filtroSocio ? 'CONSOLIDADO GENERAL' : `SOCIO / ENTIDAD: ${this.filtroSocio}`;
    },

    get saldoAnterior() {
      return 0.00;
    },

    get comprobantesProcesadosYOrdenados() {
      return this.items;
    },

    get movimientoFiltradoTotal() {
      return calcularMovimientoFiltradoTotal(this.items, this.filtroSocio);
    },

    get sociosPendientesConsolidado() {
      return calcularSociosPendientesConsolidado(this.directorio, this.items, {
        fechaInicio: this.filtroFechaInicio,
        fechaFin: this.filtroFechaFin
      });
    },

    // 3. ACCIONES Y FLUJOS
    async init() {
      await this.cargarComprobantes();
    },

    async cargarComprobantes() {
      this.cargando = true;
      const params = {
        rol: this.filtroRol,
        socio: this.filtroSocio,
        fechaInicio: this.filtroFechaInicio,
        fechaFin: this.filtroFechaFin,
        desdeHash: this.filtroDesdeHash,
        hastaHash: this.filtroHastaHash,
        orden: this.filtroOrden,
        hash: this.filtroHash
      };
      this.items = (await obtenerComprobantes(params)) || [];
      this.comprobantes = this.items;
      this.cargando = false;
    },

    abrirModal(item) {
      this.itemEdicion = prepararEdicionComprobante(item, this.loteActivo);
      this.modalAbierto = true;
    },

    async guardarCambios() {
      if (await guardarCambiosComprobante(this.itemEdicion?.hash_largo, this.itemEdicion, this.loteActivo)) {
        this.modalAbierto = false;
        await this.cargarComprobantes();
      }
    },

    async releerIAModal() {
      if (await solicitarRelecturaIA(this.itemEdicion?.hash_largo)) {
        this.modalAbierto = false;
        await this.cargarComprobantes();
      }
    },

    async eliminarComprobante(hashLargo) {
      if (await eliminarComprobantePorHash(hashLargo)) {
        this.modalAbierto = false;
        await this.cargarComprobantes();
      }
    },

    // 4. DELEGACIÓN A FORMATTEERS ATÓMICOS
    formatMonto,
    formatTasa,
    obtenerME1,
    obtenerME2,
    obtenerTasaSocioCalculada,
    claseInsignia
  };
}
