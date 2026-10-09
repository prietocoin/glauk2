/**
 * @file comprobantesQuery.js
 * @description Consulta SQL de lectura pura para comprobantes con resolución de JIDs en vivo.
 */
const db = require('#config/database');

async function obtenerComprobantesCompletos(socio = null) {
  const params = [];
  let whereClause = "WHERE UPPER(TRIM(c.instancia)) = 'JAIRO'";

  if (socio && socio.trim() !== '' && socio !== 'undefined' && socio !== 'null') {
    whereClause += ` AND (
      LOWER(COALESCE(l.socio_1, n_grupo1.nombre, n_user1.nombre, '')) LIKE LOWER($1) OR
      LOWER(COALESCE(l.socio_2, n_grupo2.nombre, n_user2.nombre, '')) LIKE LOWER($1) OR
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

      -- JIDs y timestamps crudos para orquestación en vivo
      i1.grupo_raw AS grupo_raw_1,
      i1.usuario_raw AS usuario_raw_1,
      i2.grupo_raw AS grupo_raw_2,
      i2.usuario_raw AS usuario_raw_2,
      i1.timestamp_msg,

      -- Datos congelados de comprobantes_liq (si existe liquidación)
      l.socio_1, l.monto_1, l.tasa_1, l.me1,
      l.socio_2, l.monto_2, l.tasa_2, l.me2, l.lote_tasa,

      -- Nombres de Socios resueltos por JID
      COALESCE(l.socio_1, n_grupo1.nombre, n_user1.nombre, 'GENERAL') AS nombre_socio_1,
      COALESCE(l.socio_2, n_grupo2.nombre, n_user2.nombre, NULL) AS nombre_socio_2,

      -- 🔴 RESOLUCIÓN DINÁMICA DE NATURALEZA SI NO ESTÁ LIQUIDADO
      COALESCE(
        l.tipo_op1,
        CASE 
          -- Regla Imperativa: Moneda Comprobante == Moneda Base Socio -> Abono ('A')
          WHEN UPPER(TRIM(c.moneda)) = UPPER(TRIM(COALESCE(n_grupo1.moneda_base, n_user1.moneda_base))) THEN 'A'
          -- Si no, intenta extraer del JSON de monedas del perfil o cae en 'D'
          ELSE COALESCE(
            (n_grupo1.monedas->UPPER(TRIM(c.moneda))->>'naturaleza'),
            (n_user1.monedas->UPPER(TRIM(c.moneda))->>'naturaleza'),
            'D'
          )
        END
      ) AS tipo_op1,

      COALESCE(l.tipo_op1, 'D') AS tipo_manual

    FROM comprobantes_raw c
    LEFT JOIN comprobantes_liq l ON LOWER(TRIM(l.hash_largo)) = LOWER(TRIM(c.hash_largo))
    LEFT JOIN impactos_ordenados i1 ON LOWER(TRIM(i1.hash_largo)) = LOWER(TRIM(c.hash_largo)) AND i1.num_impacto = 1
    LEFT JOIN impactos_ordenados i2 ON LOWER(TRIM(i2.hash_largo)) = LOWER(TRIM(c.hash_largo)) AND i2.num_impacto = 2

    -- 🔴 JOINs corregidos apuntando a jid_grupo y jid_usuario
    LEFT JOIN perfiles_glaukov n_grupo1 ON i1.grupo_raw IS NOT NULL AND LOWER(TRIM(n_grupo1.jid_grupo)) = LOWER(TRIM(i1.grupo_raw))
    LEFT JOIN perfiles_glaukov n_user1 ON i1.usuario_raw IS NOT NULL AND LOWER(TRIM(n_user1.jid_usuario)) = LOWER(TRIM(i1.usuario_raw))
    LEFT JOIN perfiles_glaukov n_grupo2 ON i2.grupo_raw IS NOT NULL AND LOWER(TRIM(n_grupo2.jid_grupo)) = LOWER(TRIM(i2.grupo_raw))
    LEFT JOIN perfiles_glaukov n_user2 ON i2.usuario_raw IS NOT NULL AND LOWER(TRIM(n_user2.jid_usuario)) = LOWER(TRIM(i2.usuario_raw))
    ${whereClause}
    ORDER BY c.creado_en DESC
    LIMIT 50;
  `;

  const { rows } = await db.query(sql, params);
  return rows || [];
}

module.exports = { obtenerComprobantesCompletos };
