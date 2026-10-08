/**
 * @file comprobantesState.js
 * @path public/js/modules/comprobantes/states/comprobantesState.js
 * @description Estado reactivo puro para el módulo de comprobantes.
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
    // 1. PROPIEDADES REACTIVAS DE LA VISTA
    items: [],
    comprobantes: [],
    directorio: [],
    cargando: true,
    modalAbierto: false,
    itemEdicion: null,
    loteActivo: 'T052',

    // Filtros vinculados a los inputs
    filtroRol: '',
    filtroSocio: '',
    filtroFechaInicio: '',
    filtroFechaFin: '',
    filtroDesdeHash: '',
    filtroHastaHash: '',
    ordenarPor: 'fecha_desc',
    filtroHashBusqueda: '',
    saldoAnterior: 0,

    // 2. GETTERS COMPUTADOS PURE
    get sujetoAuditado() {
      return (this.filtroSocio && this.filtroSocio !== 'TODOS' && this.filtroSocio !== 'TODOS LOS SOCIOS') 
        ? this.filtroSocio.toUpperCase() 
        : 'TODOS LOS SOCIOS';
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

    // 3. CICLO DE VIDA Y RE-CONSULTA A LA BASE DE DATOS SQL
    init() {
      this.$nextTick(() => {
        this.cargarComprobantes();
      });
    },

    actualizarSocioSeleccionado() {
      const socioNom = (this.filtroSocio || '').trim().toUpperCase();
      if (socioNom && socioNom !== 'TODOS' && socioNom !== 'TODOS LOS SOCIOS') {
        const socioFound = (this.directorio || []).find(d => (d.nombre || '').trim().toUpperCase() === socioNom);
        const saldoVal = socioFound?.saldo_inicial ?? socioFound?.saldo_anterior;
        this.saldoAnterior = (saldoVal !== undefined && saldoVal !== null) ? parseFloat(saldoVal) || 0 : 0;
      } else {
        this.saldoAnterior = 0;
      }
      
      // Consultamos a la BD con el nuevo socio seleccionado
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
        hash: this.filtroHashBusqueda,
        orden: this.ordenarPor
      };

      // Invocación directa a PostgreSQL a través del servicio
      const raw = await obtenerComprobantes(params);
      const lista = Array.isArray(raw) ? raw : [];

      // Mapeamos los elementos para la UI y asignamos a la lista
      const mapeados = lista.map(item => prepararEdicionComprobante(item, this.loteActivo));
      this.items = mapeados;
      this.comprobantes = mapeados;
      this.cargando = false;
    },

    // 4. FORMATEADORES IMPORTADOS DIRECTAMENTE
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
