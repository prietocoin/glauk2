/**
 * @file comprobantesModalActions.js
 * @path public/js/modules/comprobantes/services/comprobantesModalActions.js
 * @description Acciones atómicas blindadas para el modal de comprobantes.
 */
import { 
  guardarCambiosComprobante, 
  eliminarComprobantePorHash, 
  solicitarRelecturaIA 
} from './comprobantesApiService.js';
import { prepararEdicionComprobante } from './comprobantesMapperService.js';

export function crearAccionesModal(state) {
  return {
    abrirModalEdicion(item) {
      if (!item) return;
      
      try {
        // 1. Clonado profundo raw del item que viene del backend
        const itemClonado = JSON.parse(JSON.stringify(item));

        // 2. Mapeo preliminar
        const itemMapeado = typeof prepararEdicionComprobante === 'function' 
          ? prepararEdicionComprobante(itemClonado, state.loteActivo || 'T063') 
          : { ...itemClonado };

        // 3. BLINDAJE: Si el mapper borró los socios o montos netos, restaurar los del backend
        state.itemEdicion = {
          ...itemMapeado,
          socio_1: (itemMapeado.socio_1 && itemMapeado.socio_1 !== 'GENERAL') ? itemMapeado.socio_1 : (item.nombre_socio_1 || item.socio_1 || 'NELSY'),
          socio_2: (itemMapeado.socio_2 && itemMapeado.socio_2 !== 'GENERAL') ? itemMapeado.socio_2 : (item.nombre_socio_2 || item.socio_2 || 'MERLI'),
          monto_1: item.monto_1 !== null && item.monto_1 !== undefined ? item.monto_1 : (itemMapeado.monto_1 || item.me1),
          monto_2: item.monto_2 !== null && item.monto_2 !== undefined ? item.monto_2 : (itemMapeado.monto_2 || item.me2)
        };

      } catch (e) {
        console.warn('[ModalActions] Error en mapper, usando fallback copia directa:', e);
        state.itemEdicion = JSON.parse(JSON.stringify(item));
      }

      // Cambiar visibilidad del modal INMEDIATAMENTE
      state.modalAbierto = true;
    },

    abrirModal(item) {
      this.abrirModalEdicion(item);
    },

    cerrarModalEdicion() {
      state.modalAbierto = false;
      state.itemEdicion = null;
    },

    async guardarCambios() {
      if (await guardarCambiosComprobante(state.itemEdicion?.hash_largo, state.itemEdicion, state.loteActivo)) {
        state.modalAbierto = false;
        await state.cargarComprobantes();
      }
    },

    async releerIAModal() {
      if (await solicitarRelecturaIA(state.itemEdicion?.hash_largo)) {
        state.modalAbierto = false;
        await state.cargarComprobantes();
      }
    },

    async eliminarComprobante(hashLargo) {
      if (await eliminarComprobantePorHash(hashLargo)) {
        state.modalAbierto = false;
        await state.cargarComprobantes();
      }
    }
  };
}
