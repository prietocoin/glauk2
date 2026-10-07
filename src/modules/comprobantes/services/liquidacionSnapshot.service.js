/**
 * @file liquidacionSnapshot.service.js
 * @description Servicio atómico para obtención de datos, cálculo y congelado de comprobantes.
 */
const db = require('#config/database');
const { calcularSnapshotFinanciero } = require('#modules/comprobantes/services/snapshotCalculator');
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

  const rawRes = await db.query('SELECT * FROM comprobantes_raw WHERE LOWER(hash_largo) = $1;', [hashClean]);
  if (rawRes.rows.length === 0) return null;
  const raw = rawRes.rows[0];

  const impRes = await db.query(`
    SELECT usuario_raw, grupo_raw FROM impactos_raw 
    WHERE LOWER(hash_largo) = $1 ORDER BY id ASC LIMIT 2;
  `, [hashClean]);

  const s1Id = (impRes.rows[0]?.grupo_raw || impRes.rows[0]?.usuario_raw || '').trim();
  const s2Id = (impRes.rows[1]?.grupo_raw || impRes.rows[1]?.usuario_raw || '').trim();

  const socio1Data = (await buscarPerfilSocio(s1Id)) || { nombre: 'GENERAL', moneda_base: 'USDT', monedas: {} };
  const socio2Data = await buscarPerfilSocio(s2Id);
  const loteTasa = await mercadoService.obtenerUltimasTasas();

  const snap = calcularSnapshotFinanciero(raw, socio1Data, socio2Data, loteTasa);

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
    snap.hash_largo, snap.socio_1, snap.tipo_op1, snap.monto_1, snap.tasa_1, snap.me1,
    snap.socio_2, snap.tipo_op2, snap.monto_2, snap.tasa_2, snap.me2, snap.lote_tasa
  ]);

  return { status: 'completado', hash_largo: hashClean };
}

module.exports = { procesarSnapshotComprobante };
