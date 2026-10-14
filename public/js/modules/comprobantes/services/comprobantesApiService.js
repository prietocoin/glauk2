/**
 * @file comprobantesApiService.js
 * @description Servicio atómico de red para consumir el CRUD directo de la API v2 (comprobantes_final).
 */

const API_V2_URL = 'https://automat-gaukapi.fyi6ur.easypanel.host/api/v2/comprobantes';

/**
 * Normaliza y limpia el identificador para evitar URLs malformadas como /undefined
 */
function obtenerIdentificadorValido(identificador, fallbackPayload = {}) {
  let target = '';

  if (typeof identificador === 'object' && identificador !== null) {
    target = identificador.hash_largo || 
             identificador.id || 
             identificador._id || 
             identificador.hash || 
             identificador.referencia || '';
  } else {
    target = identificador;
  }

  if (!target) {
    target = fallbackPayload?.hash_largo || 
             fallbackPayload?.hash || 
             fallbackPayload?.id || 
             fallbackPayload?._id || 
             fallbackPayload?.referencia || '';
  }

  return String(target || '').trim();
}

/**
 * Carga paginada de comprobantes directamente desde la API V2
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
 * Guarda cambios de un comprobante editado (PUT directo a comprobantes_final)
 */
export async function guardarCambiosComprobante(hashLargo, payload = {}, loteActivo = 'T070') {
  try {
    const idValido = obtenerIdentificadorValido(hashLargo, payload);
    if (!idValido) {
      throw new Error('No se proporcionó un hash o ID válido para actualizar');
    }

    const dataPayload = (typeof hashLargo === 'object' && hashLargo !== null) ? hashLargo : payload;

    const res = await fetch(`${API_V2_URL}/${encodeURIComponent(idValido)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...dataPayload, loteActivo })
    });

    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    return await res.json().catch(() => true);
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
    const idValido = obtenerIdentificadorValido(hashLargo);
    if (!idValido) {
      throw new Error('No se proporcionó un hash o ID válido para releer con IA');
    }

    // Alineado con la ruta /:hashLargo/releer de comprobantesRoutes.js
    const res = await fetch(`${API_V2_URL}/${encodeURIComponent(idValido)}/releer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    return await res.json().catch(() => true);
  } catch (err) {
    console.error('[comprobantesApiService ❌ IA Re-read Error]:', err.message);
    return false;
  }
}

/**
 * Elimina un comprobante por su hash o ID en la tabla comprobantes_final
 */
export async function eliminarComprobantePorHash(hashLargo) {
  try {
    const idValido = obtenerIdentificadorValido(hashLargo);
    if (!idValido) {
      throw new Error('No se proporcionó un hash o ID válido para eliminar');
    }

    const res = await fetch(`${API_V2_URL}/${encodeURIComponent(idValido)}`, {
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
