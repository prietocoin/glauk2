/**
 * @file comprobantesState.js
 * @description Estado reactivo de Alpine.js para la auditoría de comprobantes en glauk2.
 */
import { obtenerComprobantes, eliminarComprobantePorHash } from '../services/comprobantesApiService.js';

export function comprobantesState() {
  return {
    items: [],
    directorio: [],
    cargando: false,

    // Filtros reactivos
    filtroRol: '',
    filtroSocio: '',
    filtroFechaInicio: '',
    filtroFechaFin: '',
    filtroDesdeHash: '',
    filtroHastaHash: '',
    filtroOrden: 'fecha_desc',
    filtroHash: '',

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
      this.items = await obtenerComprobantes(params);
      this.cargando = false;
    },

    // Helpers de Formato y Cálculo Visual
    formatMonto(val) {
      const num = parseFloat(val) || 0;
      return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    formatTasa(val) {
      const num = parseFloat(val) || 0;
      return num > 99.99 ? Math.trunc(num).toLocaleString('en-US') : num.toFixed(2);
    },

    obtenerME1(item) {
      if (!item) return 0;
      return item.me1 !== undefined && item.me1 !== null 
        ? item.me1 
        : (item.monto_1 !== undefined ? item.monto_1 : item.monto || 0);
    },

    obtenerME2(item) {
      if (!item) return 0;
      return item.me2 !== undefined && item.me2 !== null 
        ? item.me2 
        : (item.monto_2 !== undefined ? item.monto_2 : 0);
    },

    obtenerTasaSocioCalculada(item, numSocio) {
      if (!item) return 1.0;
      return numSocio === 1 ? (item.tasa_1 || 1.0) : (item.tasa_2 || 1.0);
    },

    claseInsignia(tipoOp) {
      const t = String(tipoOp || 'D').toUpperCase().trim();
      if (t === 'D') return 'bg-emerald-950 text-emerald-300 border-emerald-500/40';
      if (t === 'P') return 'bg-rose-950 text-rose-300 border-rose-500/40';
      if (t === 'A') return 'bg-cyan-950 text-cyan-300 border-cyan-500/40';
      return 'bg-slate-800 text-slate-300 border-slate-600';
    },

    abrirModalEdicion(item) {
      this.$dispatch('abrir-modal-edicion', { item });
    },

    async eliminarComprobante(hashLargo) {
      const ok = await eliminarComprobantePorHash(hashLargo);
      if (ok) {
        await this.cargarComprobantes();
      }
    }
  };
}
