/**
 * @file comprobantesLecturaService.js
 * @path public/js/modules/comprobantes/services/comprobantesLecturaService.js
 * @description Servicio atómico de consulta HTTP a la API de PostgreSQL.
 */

export async function obtenerComprobantes(params = {}) {
  try {
    const query = new URLSearchParams();

    // Enviamos el socio a la BD para ejecutar la cláusula WHERE exacta
    if (params.socio && params.socio.toUpperCase() !== 'TODOS' && params.socio.toUpperCase() !== 'TODOS LOS SOCIOS') {
      query.append('socio', params.socio.trim());
    }

    if (params.rol && params.rol.toUpperCase() !== 'TODOS') query.append('rol', params.rol.trim());
    if (params.fechaInicio) query.append('fechaInicio', params.fechaInicio);
    if (params.fechaFin) query.append('fechaFin', params.fechaFin);
    if (params.desdeHash) query.append('desdeHash', params.desdeHash);
    if (params.hastaHash) query.append('hastaHash', params.hastaHash);
    if (params.hash) query.append('hash', params.hash);
    if (params.orden) query.append('orden', params.orden);

    const response = await fetch(`/api/comprobantes?${query.toString()}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    return await response.json();
  } catch (error) {
    console.error('[comprobantesLecturaService ❌ Error al obtener comprobantes]:', error);
    return [];
  }
}
