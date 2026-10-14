/**
 * @file comprobantesModalActions.js
 * @path public/js/modules/comprobantes/services/comprobantesModalActions.js
 * @description Acciones atómicas blindadas para el modal de comprobantes (CRUD sobre comprobantes_final).
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

        // 2. Mapeo preliminar desde la API v2
        const itemMapeado = typeof prepararEdicionComprobante === 'function' 
          ? prepararEdicionComprobante(itemClonado, state.loteActivo || 'T071') 
          : { ...itemClonado };

        // 3. BLINDAJE DINÁMICO: Prioriza los valores devueltos por comprobantes_final
        state.itemEdicion = {
          ...itemMapeado,
          socio_1: itemMapeado.socio_1 || item.nombre_socio_1 || item.socio_1 || 'GENERAL',
          socio_2: itemMapeado.socio_2 || item.nombre_socio_2 || item.socio_2 || 'GENERAL',
          monto_1: itemMapeado.monto_1 ?? item.monto_1 ?? item.m1_socio ?? item.me1 ?? 0,
          monto_2: itemMapeado.monto_2 ?? item.monto_2 ?? item.m2_socio ?? item.me2 ?? 0
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
      if (!state.itemEdicion) return;

      const hashLargo = state.itemEdicion.hash_largo || state.itemEdicion.id;
      const guardadoExitoso = await guardarCambiosComprobante(hashLargo, state.itemEdicion, state.loteActivo);

      if (guardadoExitoso) {
        state.modalAbierto = false;
        if (typeof state.cargarComprobantes === 'function') {
          await state.cargarComprobantes();
        }
      }
    },

    async releerIAModal() {
      if (!state.itemEdicion) return;

      const hashLargo = state.itemEdicion.hash_largo || state.itemEdicion.id;
      const relecturaExitosa = await solicitarRelecturaIA(hashLargo);

      if (relecturaExitosa) {
        state.modalAbierto = false;
        if (typeof state.cargarComprobantes === 'function') {
          await state.cargarComprobantes();
        }
      }
    },

    async eliminarComprobante(hashLargo) {
      const targetHash = hashLargo || state.itemEdicion?.hash_largo || state.itemEdicion?.id;
      if (!targetHash) return;

      const eliminadoExitoso = await eliminarComprobantePorHash(targetHash);

      if (eliminadoExitoso) {
        state.modalAbierto = false;
        if (typeof state.cargarComprobantes === 'function') {
          await state.cargarComprobantes();
        }
      }
    }
  };
}
