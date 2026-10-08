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
    // 1. PROPIEDADES REACTIVAS (ITEMS ES LA PROPIEDAD MAESTRA)
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

    // 2. GETTERS COMPUTADOS
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

    // 3. INICIALIZACIÓN Y FILTRADO ATÓMICO EN MEMORIA
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

    // FILTRADO ESTRICTO EXCLUSIVO SOBRE SOCIO 1 Y SOCIO 2
    aplicarFiltroLocal() {
      const socioBuscado = (this.filtroSocio || '').trim().toUpperCase();

      if (!socioBuscado || socioBuscado === 'TODOS' || socioBuscado === 'TODOS LOS SOCIOS') {
        this.items = [...this.rawItems];
        this.comprobantes = this.items;
        return;
      }

      // Set de validación con directorio para alias / herencias
      const sociosValidos = new Set([socioBuscado]);
      if (Array.isArray(this.directorio) && this.directorio.length > 0) {
        this.directorio.forEach(d => {
          const padre = String(d.padre || d.herencia || '').toUpperCase();
          const nombre = String(d.nombre || '').toUpperCase();
          if (padre === socioBuscado || nombre === socioBuscado) {
            if (d.nombre) sociosValidos.add(String(d.nombre).toUpperCase());
          }
        });
      }

      // Filtra estrictamente Socio 1 o Socio 2 (Descarta Titular Bancario)
      const filtrados = this.rawItems.filter(item => {
        const s1 = String(item?.nombre_socio_1 || item?.socio_1 || '').trim().toUpperCase();
        const s2 = String(item?.nombre_socio_2 || item?.socio_2 || '').trim().toUpperCase();
        return sociosValidos.has(s1) || sociosValidos.has(s2);
      });

      this.items = filtrados;
      this.comprobantes = filtrados;
    },

    async cargarComprobantes(silencioso = false) {
      if (!silencioso) this.cargando = true;

      const limpiar = (val) => (!val || String(val).toUpperCase() === 'TODOS' || String(val).toUpperCase() === 'TODOS LOS SOCIOS') ? '' : val;

      const params = {
        rol: limpiar(this.filtroRol),
        fechaInicio: this.filtroFechaInicio,
        fechaFin: this.filtroFechaFin,
        hash: this.filtroHashBusqueda,
        orden: this.ordenarPor
      };

      const raw = (await obtenerComprobantes(params)) || [];
      const lista = Array.isArray(raw) ? raw : (raw.objects || raw.comprobantes || []);

      // Guarda la lista maestra limpia
      this.rawItems = lista.map(item => prepararEdicionComprobante(item, this.loteActivo));
      
      // Procesa el filtro y asigna directamente a "items"
      this.aplicarFiltroLocal();
      this.cargando = false;
    },

    // 4. MÉTODOS Y FORMATEADORES IMPORTADOS DIRECTAMENTE
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
