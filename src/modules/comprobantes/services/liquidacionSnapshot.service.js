/**
 * @file liquidacionSnapshot.service.js
 * @description Servicio atómico para obtención de datos, cálculo y congelado de comprobantes en comprobantes_final.
 */
const db = require('#config/database');
const { calcularSnapshotFinanciero } = require('#modules/comprobantes/services/snapshotCalculator');
const { obtenerLoteVigentePorFecha } = require('./comprobantesPerfilService');

/**
 * Sanitiza valores numéricos evitando "N/A" o NaN en consultas SQL.
 */
function sanitizarNumero(val, fallback = 0) {
  if (val === 'N/A' || val === null || val === undefined) return fallback;
  const num = parseFloat(val);
  return isNaN(num) ? fallback : num;
}

async function buscarPerfilSocio(identificador) {
  if (!identificador) return null;
  const target = identificador.trim().toLowerCase();
  const { rows } = await db.query(`
    SELECT * FROM perfiles_glaukov 
    WHERE (id_grupo IS NOT NULL AND id_grupo <> '' AND LOWER(id_grupo) = $1)
       OR LOWER(nombre) = $1
    LIMIT 1;
  `, [target]);
  return rows[0] || null;
}

async function procesarSnapshotComprobante(hashLargoRaw) {
  const hashClean = String(hashLargoRaw || '').trim().toLowerCase();
  if (!hashClean) return null;

  // 1. LEER DATOS BASE DE COMPROBANTES_RAW
  const rawRes = await db.query('SELECT * FROM comprobantes_raw WHERE LOWER(hash_largo) = $1;', [hashClean]);
  if (rawRes.rows.length === 0) return null;
  const raw = rawRes.rows[0];

  // 2. LEER SOCIOS/IMPACTOS DIRECTOS
  const impRes = await db.query(`
    SELECT usuario_raw, grupo_raw FROM impactos_raw 
    WHERE LOWER(hash_largo) = $1 ORDER BY id ASC LIMIT 2;
  `, [hashClean]);

  const s1Id = (impRes.rows[0]?.grupo_raw || impRes.rows[0]?.usuario_raw || '').trim();
  const s2Id = (impRes.rows[1]?.grupo_raw || impRes.rows[1]?.usuario_raw || '').trim();

  const socio1Data = (await buscarPerfilSocio(s1Id)) || { nombre: 'GENERAL', moneda_base: 'USDT', monedas: {} };
  const socio2Data = await buscarPerfilSocio(s2Id);
  const loteTasa = await obtenerLoteVigentePorFecha(raw.moneda, raw.creado_en);

  // 3. CÁLCULO FINANCIERO DEL SNAPSHOT
  const snap = calcularSnapshotFinanciero(raw, socio1Data, socio2Data, loteTasa);

  const m1 = sanitizarNumero(snap.monto_1, 0);
  const t1 = sanitizarNumero(snap.tasa_1, 0);
  const me1 = sanitizarNumero(snap.me1, m1);

  const m2 = sanitizarNumero(snap.monto_2, 0);
  const t2 = sanitizarNumero(snap.tasa_2, 0);
  const me2 = sanitizarNumero(snap.me2, m2);

  const lote = String(snap.lote_tasa || 'T070').trim();

  // 🟢 4. PERSISTENCIA ATÓMICA EN COMPROBANTES_FINAL (Single Source of Truth)
  const queryFinal = `
    UPDATE comprobantes_final SET
      nombre_socio_1 = $2,
      socio_1 = $2,
      tipo_op1 = $3,
      monto_1 = $4,
      m1_socio = $4,
      tasa_1 = $5,
      me1 = $6,
      nombre_socio_2 = $7,
      socio_2 = $7,
      tipo_op2 = $8,
      monto_2 = $9,
      m2_socio = $9,
      tasa_2 = $10,
      me2 = $11,
      lote_tasa = $12,
      esta_liquidado = true,
      actualizado_en = NOW()
    WHERE LOWER(TRIM(hash_largo)) = LOWER(TRIM($1));
  `;

  await db.query(queryFinal, [
    hashClean,
    snap.socio_1 || 'GENERAL',
    snap.tipo_op1 || 'D',
    m1, t1, me1,
    snap.socio_2 || 'GENERAL',
    snap.tipo_op2 || 'D',
    m2, t2, me2,
    lote
  ]);

  // 🟢 5. RESPALDO / RETROCOMPATIBILIDAD EN COMPROBANTES_LIQ
  const queryUpsert = `
    INSERT INTO comprobantes_liq (
      hash_largo, socio_1, tipo_op1, monto_1, tasa_1, me1,
      socio_2, tipo_op2, monto_2, tasa_2, me2, lote_tasa, actualizado_en
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
    ON CONFLICT (hash_largo) DO UPDATE SET
      socio_1 = EXCLUDED.socio_1, tipo_op1 = EXCLUDED.tipo_op1, monto_1 = EXCLUDED.monto_1,
      tasa_1 = EXCLUDED.tasa_1, me1 = EXCLUDED.me1, socio_2 = EXCLUDED.socio_2,
      tipo_op2 = EXCLUDED.tipo_op2, monto_2 = EXCLUDED.monto_2, tasa_2 = EXCLUDED.tasa_2,
      me2 = EXCLUDED.me2, lote_tasa = EXCLUDED.lote_tasa, actualizado_en = NOW();
  `;

  await db.query(queryUpsert, [
    hashClean, snap.socio_1, snap.tipo_op1, m1, t1, me1,
    snap.socio_2, snap.tipo_op2, m2, t2, me2, lote
  ]);

  return { status: 'completado', hash_largo: hashClean };
}

module.exports = { procesarSnapshotComprobante };
