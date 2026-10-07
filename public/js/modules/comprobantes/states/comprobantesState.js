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
    // 1. PROPIEDADES REACTIVAS
    items: [], comprobantes: [], directorio: [], cargando: true, modalAbierto: false, itemEdicion: null,
    loteActivo: 'T052',
    filtroRol: '', filtroSocio: '', filtroFechaInicio: '', filtroFechaFin: '',
    filtroDesdeHash: '', filtroHastaHash: '', filtroOrden: 'fecha_desc', filtroHash: '',

    // 2. GETTERS COMPUTADOS
    get sujetoAuditado() { 
      return (!this.filtroSocio || this.filtroSocio === 'TODOS' || this.filtroSocio === 'TODOS LOS SOCIOS') 
        ? 'CONSOLIDADO GENERAL' 
        : `SOCIO / ENTIDAD: ${this.filtroSocio}`; 
    },
    get saldoAnterior() { return 0.00; },
    get saldoActualTotal() { return (this.saldoAnterior || 0) + (this.movimientoFiltradoTotal || 0); },
    
    // GETTER DE FILTRADO ESTRICTO EN MEMORIA
    get comprobantesProcesadosYOrdenados() {
      if (!Array.isArray(this.items) || this.items.length === 0) return [];

      const socioBuscado = (this.filtroSocio || '').trim().toUpperCase();

      // Si no hay filtro o es 'TODOS', devuelve la lista de items completa
      if (!socioBuscado || socioBuscado === 'TODOS' || socioBuscado === 'TODOS LOS SOCIOS') {
        return this.items;
      }

      // Compara ÚNICAMENTE contra Socio 1 y Socio 2 (ignora Titular de banco)
      return this.items.filter(item => {
        const s1 = String(item.nombre_socio_1 || item.socio_1 || '').trim().toUpperCase();
        const s2 = String(item.nombre_socio_2 || item.socio_2 || '').trim().toUpperCase();

        return s1 === socioBuscado || s2 === socioBuscado;
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

    // 3. INICIALIZACIÓN
    init() {
      this.$nextTick(() => {
        this.cargarComprobantes();
      });
    },

    async cargarComprobantes() {
      this.cargando = true;
      const limpiarFiltro = (val) => (!val || String(val).toUpperCase() === 'TODOS' || String(val).toUpperCase() === 'TODOS LOS SOCIOS') ? '' : val;

      const params = {
        rol: limpiarFiltro(this.filtroRol),
        fechaInicio: this.filtroFechaInicio,
        fechaFin: this.filtroFechaFin,
        desdeHash: limpiarFiltro(this.filtroDesdeHash),
        hastaHash: limpiarFiltro(this.filtroHastaHash),
        orden: this.filtroOrden,
        hash: this.filtroHash
      };
      
      const raw = (await obtenerComprobantes(params)) || [];
      const lista = Array.isArray(raw) ? raw : (raw.objects || raw.comprobantes || []);
      
      this.items = lista.map(item => prepararEdicionComprobante(item, this.loteActivo));
      this.comprobantes = this.items;
      this.cargando = false;
    },

    // 4. FORMATEADORES ATÓMICOS
    formatMonto: (v) => typeof formatMonto === 'function' ? formatMonto(v || 0) : String(v || 0),
    formatTasa: (v) => typeof formatTasa === 'function' ? formatTasa(v || 1) : String(v || 1),
    obtenerME1: (item) => typeof obtenerME1 === 'function' ? obtenerME1(item) : (item?.me1 || 0),
    obtenerME2: (item) => typeof obtenerME2 === 'function' ? obtenerME2(item) : (item?.me2 || 0),
    obtenerTasaSocioCalculada: (item, n) => typeof obtenerTasaSocioCalculada === 'function' ? obtenerTasaSocioCalculada(item, n) : 1,
    claseInsignia: (t) => typeof claseInsignia === 'function' ? claseInsignia(t) : 'bg-slate-800 text-slate-200'
  };

  Object.assign(state, crearAccionesModal(state));

  return state;
}
