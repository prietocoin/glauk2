/**
 * @file comprobantesQuery.js
 * @description Consulta SQL de lectura pura para comprobantes.
 */
const db = require('#config/database');

async function obtenerComprobantesCompletos(socio = null) {
  const params = [];
  let whereClause = "WHERE UPPER(TRIM(c.instancia)) = 'JAIRO'";

  if (socio && socio.trim() !== '' && socio !== 'undefined' && socio !== 'null') {
    whereClause += ` AND (
      LOWER(COALESCE(l.socio_1, '')) LIKE LOWER($1) OR
      LOWER(COALESCE(l.socio_2, '')) LIKE LOWER($1) OR
      LOWER(COALESCE(c.titular, '')) LIKE LOWER($1)
    )`;
    params.push(`%${socio.trim()}%`);
  }

  const sql = `
    WITH impactos_ordenados AS (
      SELECT 
        hash_largo, hash_corto, url_imagen, usuario_raw, grupo_raw, caption, timestamp_msg,
        ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(hash_largo)) ORDER BY id ASC) AS num_impacto
      FROM impactos_raw
      WHERE UPPER(TRIM(instancia)) = 'JAIRO'
    )
    SELECT 
      c.hash_largo,
      COALESCE(i1.hash_corto, SUBSTRING(c.hash_largo FROM 1 FOR 7)) AS hash_corto,
      COALESCE(c.creado_en, NOW()) AS fecha_hora_comprobante,
      COALESCE(c.monto, 0) AS monto,
      COALESCE(UPPER(c.moneda), 'USDT') AS moneda,
      COALESCE(c.banco, '-') AS banco,
      COALESCE(c.titular, '-') AS titular,
      COALESCE(c.referencia, '-') AS referencia,
      COALESCE(c.procesado_ia, FALSE) AS procesado_ia,
      COALESCE(c.url_r2, i1.url_imagen, '') AS url_imagen,
      (l.hash_largo IS NOT NULL) AS esta_liquidado,

      -- JIDs crudos para mapear en JS
      i1.grupo_raw AS grupo_raw_1,
      i1.usuario_raw AS usuario_raw_1,
      i2.grupo_raw AS grupo_raw_2,
      i2.usuario_raw AS usuario_raw_2,
      i1.timestamp_msg,

      -- Datos de comprobantes_liq
      l.socio_1, l.tipo_op1, l.monto_1, l.tasa_1, l.me1,
      l.socio_2, l.tipo_op2, l.monto_2, l.tasa_2, l.me2, l.lote_tasa
    FROM comprobantes_raw c
    LEFT JOIN comprobantes_liq l ON LOWER(TRIM(l.hash_largo)) = LOWER(TRIM(c.hash_largo))
    LEFT JOIN impactos_ordenados i1 ON LOWER(TRIM(i1.hash_largo)) = LOWER(TRIM(c.hash_largo)) AND i1.num_impacto = 1
    LEFT JOIN impactos_ordenados i2 ON LOWER(TRIM(i2.hash_largo)) = LOWER(TRIM(c.hash_largo)) AND i2.num_impacto = 2
    ${whereClause}
    ORDER BY c.creado_en DESC
    LIMIT 50;
  `;

  const { rows } = await db.query(sql, params);
  return rows || [];
}

module.exports = { obtenerComprobantesCompletos };
