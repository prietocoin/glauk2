/**
 * @file comprobantesSnapshotService.js
 * @description Orquestador de actualización directa y snapshots sobre comprobantes_final.
 */
const db = require('#config/database');

/**
 * Sanitiza montos y números impidiendo valores inválidos.
 */
function sanitizarNumero(val, fallback = 0) {
  if (val === 'N/A' || val === null || val === undefined) return fallback;
  const num = parseFloat(String(val).replace(/,/g, '').trim());
  return isNaN(num) ? fallback : num;
}

/**
 * Actualiza directamente un comprobante editado en comprobantes_final.
 */
async function actualizarComprobante(hashLargo, datos = {}) {
  const targetHash = String(hashLargo || datos.hash_largo || '').trim();
  if (!targetHash) throw new Error('El hash_largo es obligatorio para actualizar.');

  const montoVal = sanitizarNumero(datos.monto, 0);
  const monedaVal = String(datos.moneda || 'USDT').toUpperCase().trim();
  const bancoVal = String(datos.banco || 'BANCO').toUpperCase().trim();
  const refVal = String(datos.referencia || 'N/A').trim();
  const titularVal = String(datos.titular || 'TITULAR NO DEFINIDO').toUpperCase().trim();
  const tipoVal = String(datos.tipo || datos.tipo_manual || 'D').toUpperCase().trim();
  const idLote = String(datos.lote || datos.lote_tasa_asignado || 'T072').trim().toUpperCase();

  const s1 = String(datos.nombre_socio_1 || datos.socio_1 || 'GENERAL').trim();
  const s2 = String(datos.nombre_socio_2 || datos.socio_2 || 'GENERAL').trim();

  const t1 = sanitizarNumero(datos.tasa_1, 1);
  const t2 = sanitizarNumero(datos.tasa_2, 1);

  const m1 = sanitizarNumero(datos.monto_1 ?? datos.m1_socio, montoVal);
  const m2 = sanitizarNumero(datos.monto_2 ?? datos.m2_socio, montoVal);

  const me1Val = sanitizarNumero(datos.me1, m1);
  const me2Val = sanitizarNumero(datos.me2, m2);

  const pol1 = String(datos.polaridad_1 || '+').trim();
  const pol2 = String(datos.polaridad_2 || '-').trim();

  // 🟢 ACTUALIZACIÓN ESTRICTA SOBRE EL ESQUEMA REAL DE COMPROBANTES_FINAL
  const queryUpdateFinal = `
    UPDATE comprobantes_final SET
      monto = $1,
      moneda = $2,
      banco = $3,
      referencia = $4,
      titular = $5,
      tipo = $6,
      tipo_manual = $6,
      lote = $7,
      lote_tasa_asignado = $7,
      nombre_socio_1 = $8,
      socio_1 = $8,
      tasa_1 = $9,
      monto_1 = $10,
      m1_socio = $10,
      me1 = $11,
      polaridad_1 = $12,
      nombre_socio_2 = $13,
      socio_2 = $13,
      tasa_2 = $14,
      monto_2 = $15,
      m2_socio = $15,
      me2 = $16,
      polaridad_2 = $17,
      es_edicion_manual = true,
      updated_at = CURRENT_TIMESTAMP
    WHERE LOWER(TRIM(hash_largo)) = LOWER(TRIM($18))
    RETURNING *;
  `;

  const values = [
    montoVal, monedaVal, bancoVal, refVal, titularVal,
    tipoVal, idLote,
    s1, t1, m1, me1Val, pol1,
    s2, t2, m2, me2Val, pol2,
    targetHash
  ];

  const { rows } = await db.query(queryUpdateFinal, values);

  if (rows.length === 0) {
    throw new Error(`No se encontró el comprobante con hash ${targetHash}`);
  }

  // 🟢 Respaldo opcional en comprobantes_raw sin bloquear la operación principal
  try {
    await db.query(`
      UPDATE comprobantes_raw SET
        monto = COALESCE($1, monto),
        moneda = COALESCE($2, moneda),
        banco = COALESCE($3, banco),
        referencia = COALESCE($4, referencia),
        titular = COALESCE($5, titular)
      WHERE LOWER(TRIM(hash_largo)) = LOWER(TRIM($6));
    `, [montoVal > 0 ? montoVal : null, monedaVal, bancoVal, refVal, titularVal, targetHash]);
  } catch (rawErr) {
    console.warn(`[comprobantesSnapshotService ⚠️ Warning raw update]:`, rawErr.message);
  }

  return { 
    success: true, 
    message: 'Comprobante actualizado y congelado exitosamente', 
    data: rows[0] 
  };
}

/**
 * Endpoint de compatibilidad para liquidarComprobante
 */
async function liquidarComprobante(payload) {
  const hash = payload.hash_largo || payload.id;
  return actualizarComprobante(hash, payload);
}

module.exports = { 
  actualizarComprobante, 
  liquidarComprobante 
};
