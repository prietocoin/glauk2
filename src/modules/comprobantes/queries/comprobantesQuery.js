/**
 * @file comprobantesQuery.js
 * @description Consulta pura y directa a comprobantes_final (Single Source of Truth).
 */
const db = require('#config/database');

async function obtenerComprobantesFinalPaginados(filtros = {}) {
  try {
    // 1. Extraer filtros asegurando compatibilidad de nombres
    const page = parseInt(filtros.page) || 1;
    const limit = parseInt(filtros.limit) || 50;
    const offset = (page - 1) * limit;
    
    const socio = filtros.socio || '';
    const fechaInicio = filtros.fechaInicio || filtros.fecha_inicio || '';
    const fechaFin = filtros.fechaFin || filtros.fecha_fin || '';

    let whereClauses = ['1=1'];
    let params = [];

    // 2. Filtro de Socio (2x)
    if (socio && socio !== 'GENERAL') {
      params.push(`%${socio.trim().toLowerCase()}%`);
      whereClauses.push(`(LOWER(nombre_socio_1) LIKE $${params.length} OR LOWER(nombre_socio_2) LIKE $${params.length})`);
    }

    // 3. Filtro de Fechas (Abarcando todo el día límite)
    if (fechaInicio) {
      params.push(`${fechaInicio} 00:00:00`);
      whereClauses.push(`fecha_hora_input >= $${params.length}`);
    }

    if (fechaFin) {
      params.push(`${fechaFin} 23:59:59`);
      whereClauses.push(`fecha_hora_input <= $${params.length}`);
    }

    // 4. Consulta SQL Atómica
    // Usamos SELECT * porque el Frontend Mapper ya maneja TODAS las coalescencias, nulos y prioridades.
    const query = `
      SELECT *
      FROM comprobantes_final
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY creado_en DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2};
    `;

    params.push(limit, offset);

    const { rows } = await db.query(query, params);
    return rows;

  } catch (error) {
    // 🟢 Si hay un error SQL (columna faltante o tipo de dato), ahora lo veremos en la consola del backend.
    console.error('❌ [comprobantesQuery] Error al consultar comprobantes_final:', error.message);
    return [];
  }
}

module.exports = { obtenerComprobantesFinalPaginados };
