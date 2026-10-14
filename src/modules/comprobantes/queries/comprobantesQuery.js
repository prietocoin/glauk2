/**
 * @file comprobantesQuery.js
 */
const db = require('#config/database');

async function obtenerComprobantesFinalPaginados(filtros = {}) {
  const page = parseInt(filtros.page, 10) || 1;
  const limit = parseInt(filtros.limit, 10) || 50;
  const offset = (page - 1) * limit;

  const socio = String(filtros.socio || '').trim();
  const fechaInicio = String(filtros.fechaInicio || filtros.fecha_inicio || '').trim();
  const fechaFin = String(filtros.fechaFin || filtros.fecha_fin || '').trim();

  let whereClauses = ['1=1'];
  let params = [];

  if (socio && socio.toUpperCase() !== 'GENERAL' && socio.toUpperCase() !== 'TODOS') {
    params.push(`%${socio.toLowerCase()}%`);
    whereClauses.push(`(
      LOWER(COALESCE(nombre_socio_1, '')) LIKE $${params.length} 
      OR LOWER(COALESCE(nombre_socio_2, '')) LIKE $${params.length}
    )`);
  }

  if (fechaInicio) {
    params.push(`${fechaInicio} 00:00:00`);
    whereClauses.push(`fecha_hora_input >= $${params.length}`);
  }

  if (fechaFin) {
    params.push(`${fechaFin} 23:59:59`);
    whereClauses.push(`fecha_hora_input <= $${params.length}`);
  }

  const query = `
    SELECT *
    FROM comprobantes_final
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY fecha_hora_input DESC NULLS LAST
    LIMIT $${params.length + 1} OFFSET $${params.length + 2};
  `;

  params.push(limit, offset);

  const { rows } = await db.query(query, params);
  return rows;
}

module.exports = { obtenerComprobantesFinalPaginados };
