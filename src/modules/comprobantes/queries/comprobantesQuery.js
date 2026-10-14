/**
 * @file comprobantesQuery.js
 * @description Consulta directa a la Single Source of Truth asegurando renderizado 2x.
 */
const db = require('#config/database');

async function obtenerComprobantesFinalPaginados(filtros = {}) {
  const { page = 1, limit = 50, socio = '', fechaInicio = '', fechaFin = '' } = filtros;
  const offset = (page - 1) * limit;

  let whereClauses = ['1=1'];
  let params = [];

  if (socio) {
    params.push(`%${socio.trim().toLowerCase()}%`);
    whereClauses.push(`(LOWER(nombre_socio_1) LIKE $${params.length} OR LOWER(nombre_socio_2) LIKE $${params.length})`);
  }

  if (fechaInicio) {
    params.push(fechaInicio);
    whereClauses.push(`fecha_hora_input >= $${params.length}`);
  }

  if (fechaFin) {
    params.push(fechaFin);
    whereClauses.push(`fecha_hora_input <= $${params.length}`);
  }

  const query = `
    SELECT 
      hash_largo,
      COALESCE(banco, 'BANCO') AS banco,
      COALESCE(referencia, 'N/A') AS referencia,
      COALESCE(titular, 'TITULAR NO DEFINIDO') AS titular,
      COALESCE(monto, 0) AS monto,
      COALESCE(moneda, 'USDT') AS moneda,
      COALESCE(nombre_socio_1, 'GENERAL') AS nombre_socio_1,
      COALESCE(socio_1, 'GENERAL') AS socio_1,
      COALESCE(monto_1, m1_socio, monto, 0) AS monto_1,
      COALESCE(tasa_1, 1.0) AS tasa_1,
      COALESCE(me1, 0) AS me1,
      COALESCE(nombre_socio_2, 'GENERAL') AS nombre_socio_2,
      COALESCE(socio_2, 'GENERAL') AS socio_2,
      COALESCE(monto_2, m2_socio, monto, 0) AS monto_2,
      COALESCE(tasa_2, 1.0) AS tasa_2,
      COALESCE(me2, 0) AS me2,
      COALESCE(lote_tasa, 'T070') AS lote_tasa,
      COALESCE(tipo_op1, 'D') AS tipo_op1,
      COALESCE(tipo_op2, 'D') AS tipo_op2,
      url_imagen,
      fecha_hora_input,
      creado_en
    FROM comprobantes_final
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY creado_en DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2};
  `;

  params.push(limit, offset);

  const { rows } = await db.query(query, params);
  return rows;
}

module.exports = { obtenerComprobantesFinalPaginados };
