/**
 * @file comprobantesState.js
 * @path public/js/modules/comprobantes/states/comprobantesState.js
 * @description Átomo de estado reactivo Alpine.js sincronizado con el HTML del motor Atenea.
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
    // 1. PROPIEDADES REACTIVAS CON LOS NOMBRES EXACTOS DE TU HTML
    items: [], comprobantes: [], directorio: [], cargando: true, modalAbierto: false, itemEdicion: null,
    loteActivo: 'T052',
    filtroRol: '', filtroSocio: '', filtroFechaInicio: '', filtroFechaFin: '',
    filtroDesdeHash: '', filtroHastaHash: '', ordenarPor: 'fecha_desc', filtroHashBusqueda: '',
    saldoAnterior: 0,

    // 2. GETTERS COMPUTADOS
    get sujetoAuditado() { 
      return this.filtroSocio ? this.filtroSocio.toUpperCase() : 'TODOS LOS SOCIOS'; 
    },
    
    get saldoActualTotal() { 
      return (parseFloat(this.saldoAnterior) || 0) + this.movimientoFiltradoTotal; 
    },

    // GETTER DE FILTRADO ESTRICTO (Filtra solo por Socio 1 y Socio 2)
    get comprobantesProcesadosYOrdenados() {
      const lista = Array.isArray(this.items) ? this.items : [];
      if (!lista.length) return [];

      const socioTarget = (this.filtroSocio || '').trim().toUpperCase();

      if (!socioTarget || socioTarget === 'TODOS' || socioTarget === 'TODOS LOS SOCIOS') {
        return lista;
      }

      // Descarta 100% las coincidencias en Titulares Bancarios
      return lista.filter(item => {
        const s1 = (item.nombre_socio_1 || item.socio_1 || '').trim().toUpperCase();
        const s2 = (item.nombre_socio_2 || item.socio_2 || '').trim().toUpperCase();
        return s1 === socioTarget || s2 === socioTarget;
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

    // 3. ACCIONES Y COMUNICACIÓN CON API
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
      this.cargando = true;

      const params = {};
      if (this.filtroRol) params.rol = this.filtroRol;
      if (this.filtroFechaInicio) params.fechaInicio = this.filtroFechaInicio;
      if (this.filtroFechaFin) params.fechaFin = this.filtroFechaFin;
      if (this.filtroHashBusqueda) params.hash = this.filtroHashBusqueda;
      if (this.ordenarPor) params.orden = this.ordenarPor;

      const raw = (await obtenerComprobantes(params)) || [];
      const lista = Array.isArray(raw) ? raw : (raw.objects || raw.comprobantes || []);

      this.items = lista.map(item => prepararEdicionComprobante(item, this.loteActivo));
      this.comprobantes = this.items;
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
