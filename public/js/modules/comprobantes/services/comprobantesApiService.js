/**
 * @file comprobantesApiService.js
 * @description Servicio atómico de red para consumir la API v2 de comprobantes.
 */

const API_V2_URL = 'https://automat-gaukapi.fyi6ur.easypanel.host/api/v2/comprobantes';

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
