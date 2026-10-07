/**
 * @file comprobantesLiqService.js
 * @description Persistencia y congelamiento de snapshots en comprobantes_liq.
 */
const db = require('#config/database');

async function liquidarComprobante(payload) {
  const {
    hash_largo, socio_1, tipo_op1, monto_1, tasa_1, me1,
    socio_2, tipo_op2, monto_2, tasa_2, me2, lote_tasa
  } = payload;

  if (!hash_largo) throw new Error('El hash_largo es obligatorio para registrar la liquidación.');

  const query = `
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

  const targetHash = String(hash_largo).trim();
  const s1 = String(socio_1 || 'GENERAL').trim();
  const tOp1 = String(tipo_op1 || 'D-USDT').trim();
  const m1 = parseFloat(monto_1);
  const t1 = parseFloat(tasa_1);
  const e1 = parseFloat(me1);
  const s2 = String(socio_2 && socio_2 !== 'GENERAL' ? socio_2 : 'GENERAL').trim();
  const tOp2 = String(tipo_op2 || tOp1).trim();
  const m2 = parseFloat(monto_2);
  const t2 = parseFloat(tasa_2);
  const e2 = parseFloat(me2);

  await db.query(query, [
    targetHash, s1, tOp1,
    !isNaN(m1) ? m1 : 0, !isNaN(t1) ? t1 : 1.0, !isNaN(e1) ? e1 : 0,
    s2, tOp2,
    !isNaN(m2) ? m2 : 0, !isNaN(t2) ? t2 : 1.0, !isNaN(e2) ? e2 : 0,
    lote_tasa || 'T052'
  ]);

  return { success: true };
}

module.exports = { liquidarComprobante };
