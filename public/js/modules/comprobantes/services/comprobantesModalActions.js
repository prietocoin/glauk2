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
        // Asignación mapeada con fallback directo si el mapper falla
        state.itemEdicion = typeof prepararEdicionComprobante === 'function' 
          ? prepararEdicionComprobante(item, state.loteActivo || 'T052') 
          : { ...item };
      } catch (e) {
        console.warn('[ModalActions] Error en mapper, usando fallback copia direct:', e);
        state.itemEdicion = { ...item };
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
