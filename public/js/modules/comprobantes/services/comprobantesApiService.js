/**
 * @file comprobantesApiService.js
 * @description Servicio atómico de red para consumir la API v2 y acciones de comprobantes.
 */

const API_V2_URL = 'https://automat-gaukapi.fyi6ur.easypanel.host/api/v2/comprobantes';

/**
 * Carga paginada de comprobantes
 */
export async function fetchComprobantesPaginados(params = {}) {
  try {
    const { page = 1, limit = 20, socio = '', rol = '', fechaInicio = '', fechaFin = '' } = params;

    const url = new URL(API_V2_URL);
    url.searchParams.append('page', page);
    url.searchParams.append('limit', limit);
    if (socio) url.searchParams.append('socio', socio);
    if (rol) url.searchParams.append('rol', rol);
    if (fechaInicio) url.searchParams.append('fechaInicio', fechaInicio);
    if (fechaFin) url.searchParams.append('fechaFin', fechaFin);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

    const json = await res.json();
    return json?.comprobantes || json?.data || (Array.isArray(json) ? json : []);
  } catch (err) {
    console.error('[comprobantesApiService ❌ Fetch Error]:', err.message);
    return [];
  }
}

/**
 * Guarda cambios de un comprobante editado
 */
export async function guardarCambiosComprobante(hashLargo, payload, loteActivo = 'T070') {
  try {
    const res = await fetch(`${API_V2_URL}/${hashLargo || payload?.hash_largo}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, loteActivo })
    });
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    return true;
  } catch (err) {
    console.error('[comprobantesApiService ❌ Save Error]:', err.message);
    return false;
  }
}

/**
 * Solicita relectura con IA
 */
export async function solicitarRelecturaIA(hashLargo) {
  try {
    const res = await fetch(`${API_V2_URL}/${hashLargo}/releer-ia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    return true;
  } catch (err) {
    console.error('[comprobantesApiService ❌ IA Re-read Error]:', err.message);
    return false;
  }
}

/**
 * Elimina un comprobante por su hash
 */
export async function eliminarComprobantePorHash(hashLargo) {
  try {
    const res = await fetch(`${API_V2_URL}/${hashLargo}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    return true;
  } catch (err) {
    console.error('[comprobantesApiService ❌ Delete Error]:', err.message);
    return false;
  }
}
