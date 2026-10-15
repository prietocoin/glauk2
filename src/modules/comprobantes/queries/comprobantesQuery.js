/**
 * @file comprobantesQuery.js
 * @description Consulta directa a la Single Source of Truth comprobantes_final.
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

  // 🟢 1. Filtro de Socio usando las columnas reales de la tabla
  if (socio && socio.toUpperCase() !== 'GENERAL' && socio.toUpperCase() !== 'TODOS') {
    params.push(`%${socio.toLowerCase()}%`);
    whereClauses.push(`(
      LOWER(COALESCE(nombre_socio_1, socio_1, '')) LIKE $${params.length} 
      OR LOWER(COALESCE(nombre_socio_2, socio_2, '')) LIKE $${params.length}
    )`);
  }

  // 🟢 2. Filtro de Fechas nativo contra fecha_fmt (tipo DATE)
  if (fechaInicio) {
    params.push(fechaInicio);
    whereClauses.push(`fecha_fmt >= $${params.length}`);
  }

  if (fechaFin) {
    params.push(fechaFin);
    whereClauses.push(`fecha_fmt <= $${params.length}`);
  }

  // 🟢 3. Consulta directa y orden por timestamp ISO real
  const query = `
    SELECT *
    FROM comprobantes_final
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY fecha_hora_iso DESC NULLS LAST
    LIMIT $${params.length + 1} OFFSET $${params.length + 2};
  `;

  params.push(limit, offset);

  const { rows } = await db.query(query, params);
  return rows;
}

module.exports = { obtenerComprobantesFinalPaginados };
