/**
 * @file comprobantesModalActions.js
 * @path public/js/modules/comprobantes/services/comprobantesModalActions.js
 * @description Acciones atómicas de mutación y flujo para el modal de comprobantes.
 */
import { 
  guardarCambiosComprobante, 
  eliminarComprobantePorHash, 
  solicitarRelecturaIA 
} from './comprobantesApiService.js';
import { prepararEdicionComprobante } from './comprobantesMapperService.js';

export function crearAccionesModal(state) {
  const acciones = {
    abrirModal(item) {
      state.itemEdicion = prepararEdicionComprobante(item, state.loteActivo);
      state.modalAbierto = true;
    },

    abrirModalEdicion(item) {
      acciones.abrirModal(item);
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

  return acciones;
}
