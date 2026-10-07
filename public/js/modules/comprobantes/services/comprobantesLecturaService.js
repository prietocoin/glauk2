/**
 * @file comprobantesLecturaService.js
 * @description Servicio atómico de consulta y lectura HTTP para comprobantes.
 */

/**
 * Consulta la lista de comprobantes aplicando los filtros activos de la UI.
 * @param {Object} params - Objeto de filtros (socio, rol, fechas, hash, orden).
 * @returns {Promise<Array>}
 */
export async function obtenerComprobantes(params = {}) {
  try {
    const paramsLimpios = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
    );
    const query = new URLSearchParams(paramsLimpios).toString();
    const response = await fetch(`/api/comprobantes${query ? `?${query}` : ''}`);
    if (!response.ok) throw new Error('Error al consultar comprobantes');
    
    const res = await response.json();
    return Array.isArray(res) ? res : (res.comprobantes || res.data || []);
  } catch (err) {
    console.error('[comprobantesLecturaService ❌ Error al obtener comprobantes]:', err);
    return [];
  }
}
