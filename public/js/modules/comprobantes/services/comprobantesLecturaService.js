/**
 * @file comprobantesLecturaService.js
 * @path public/js/modules/comprobantes/services/comprobantesLecturaService.js
 * @description Servicio atómico de lectura HTTP para PostgreSQL con soporte estricto de fechas.
 */

export async function obtenerComprobantes(params = {}) {
  try {
    const query = new URLSearchParams();

    if (params.socio && params.socio.toUpperCase() !== 'TODOS' && params.socio.toUpperCase() !== 'TODOS LOS SOCIOS') {
      query.append('socio', params.socio.trim());
    }

    if (params.rol && params.rol.toUpperCase() !== 'TODOS') query.append('rol', params.rol.trim());
    
    // Soporte transparente para filtroFechaInicio o filtroFecha
    const fInicio = params.fechaInicio || params.fecha;
    if (fInicio) query.append('fechaInicio', fInicio.trim());
    if (params.fechaFin) query.append('fechaFin', params.fechaFin.trim());

    if (params.desdeHash) query.append('desdeHash', params.desdeHash.trim());
    if (params.hastaHash) query.append('hastaHash', params.hastaHash.trim());
    if (params.hash) query.append('hash', params.hash.trim());
    if (params.orden) query.append('orden', params.orden.trim());

    const response = await fetch(`/api/comprobantes?${query.toString()}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    return await response.json();
  } catch (error) {
    console.error('[comprobantesLecturaService ❌ Error al obtener comprobantes]:', error);
    return [];
  }
}
