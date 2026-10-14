/**
 * @file comprobantesLiqService.js
 * @description Persistencia y congelamiento de snapshots atómicos en comprobantes_final y comprobantes_liq.
 */
const db = require('#config/database');

/**
 * Sanitiza valores numéricos. Devuelve 0 si recibe 'N/A', null o NaN.
 */
function sanitizarNumero(val, fallback = 0) {
  if (val === 'N/A' || val === null || val === undefined) return fallback;
  const num = parseFloat(val);
  return isNaN(num) ? fallback : num;
}

async function liquidarComprobante(payload) {
  const {
    hash_largo, socio_1, tipo_op1, monto_1, tasa_1, me1,
    socio_2, tipo_op2, monto_2, tasa_2, me2, lote_tasa,
    polaridad_1, polaridad_2, moneda_base_socio1, moneda_base_socio2
  } = payload;

  if (!hash_largo) throw new Error('El hash_largo es obligatorio para registrar la liquidación.');

  const targetHash = String(hash_largo).trim();
  const s1 = String(socio_1 || 'GENERAL').trim();
  const tOp1 = String(tipo_op1 || 'D').trim();
  const m1 = sanitizarNumero(monto_1, 0);
  const t1 = sanitizarNumero(tasa_1, 0);
  const e1 = sanitizarNumero(me1, m1);

  const s2 = String(socio_2 && socio_2 !== 'GENERAL' ? socio_2 : 'GENERAL').trim();
  const tOp2 = String(tipo_op2 || tOp1).trim();
  const m2 = sanitizarNumero(monto_2, 0);
  const t2 = sanitizarNumero(tasa_2, 0);
  const e2 = sanitizarNumero(me2, m2);

  const lote = String(lote_tasa || 'T070').trim();
  const pol1 = String(polaridad_1 || '+').trim();
  const pol2 = String(polaridad_2 || '-').trim();

  try {
    // 🟢 1. PERSISTENCIA ATÓMICA EN COMPROBANTES_FINAL (Single Source of Truth)
    const queryFinal = `
      UPDATE comprobantes_final SET
        nombre_socio_1 = $2,
        socio_1 = $2,
        tipo_op1 = $3,
        monto_1 = $4,
        m1_socio = $4,
        tasa_1 = $5,
        me1 = $6,
        polaridad_1 = $7,
        nombre_socio_2 = $8,
        socio_2 = $8,
        tipo_op2 = $9,
        monto_2 = $10,
        m2_socio = $10,
        tasa_2 = $11,
        me2 = $12,
        polaridad_2 = $13,
        lote_tasa = $14,
        esta_liquidado = true,
        es_edicion_manual = true,
        actualizado_en = NOW()
      WHERE LOWER(TRIM(hash_largo)) = LOWER(TRIM($1));
    `;

    await db.query(queryFinal, [
      targetHash, s1, tOp1, m1, t1, e1, pol1,
      s2, tOp2, m2, t2, e2, pol2, lote
    ]);

    // 🟢 2. RESPALDO / RETROCOMPATIBILIDAD EN COMPROBANTES_LIQ
    const queryLiq = `
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

    await db.query(queryLiq, [
      targetHash, s1, tOp1, m1, t1, e1,
      s2, tOp2, m2, t2, e2, lote
    ]);

    return { success: true, message: 'Liquidación registrada y congelada en comprobantes_final' };
  } catch (error) {
    console.error('[comprobantesLiqService ❌ Error al liquidar]:', error.message);
    throw new Error(`Error en base de datos al congelar liquidación: ${error.message}`);
  }
}

module.exports = { liquidarComprobante };
