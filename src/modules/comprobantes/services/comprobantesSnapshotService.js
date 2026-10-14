/**
 * @file comprobantesSnapshotService.js
 * @description Orquestador de actualización de comprobantes y snapshots automáticos sobre comprobantes_final.
 */
const db = require('#config/database');
const { liquidarComprobante } = require('./comprobantesLiqService');
const { cargarContextoSnapshot } = require('./comprobantesPerfilService');
const { calcularSnapshotFinanciero } = require('./snapshotCalculator');

/**
 * Sanitiza montos y números impidiendo valores inválidos.
 */
function sanitizarNumero(val, fallback = 0) {
  if (val === 'N/A' || val === null || val === undefined) return fallback;
  const num = parseFloat(String(val).replace(/,/g, '').trim());
  return isNaN(num) ? fallback : num;
}

/**
 * Actualiza directamente un comprobante (override manual o auto) en comprobantes_final.
 */
async function actualizarComprobante(hashLargo, datos = {}) {
  const targetHash = String(hashLargo || '').trim();
  if (!targetHash) throw new Error('El hash_largo es obligatorio para actualizar.');

  const montoVal = sanitizarNumero(datos.monto, 0);
  const monedaVal = String(datos.moneda || 'USDT').toUpperCase().trim();
  const bancoVal = String(datos.banco || 'BANCO').toUpperCase().trim();
  const refVal = String(datos.referencia || 'N/A').trim();
  const titularVal = String(datos.titular || 'TITULAR NO DEFINIDO').toUpperCase().trim();

  // 1. OBTENER CONTEXTO DE PERFILES Y TASAS
  const { tasaLote, socio1Data, socio2Data, funddaData, naturaleza } = await cargarContextoSnapshot(
    datos.grupo_raw_1,
    datos.usuario_raw_1,
    datos.grupo_raw_2,
    datos.usuario_raw_2,
    monedaVal,
    datos.timestamp_msg
  );

  const idLote = datos.lote || datos.loteActivo || tasaLote?.lote_tasa || 'T070';

  // 🟢 2. ACTUALIZACIÓN DIRECTA EN COMPROBANTES_FINAL (Single Source of Truth)
  const queryUpdateFinal = `
    UPDATE comprobantes_final SET
      monto = $1,
      moneda = $2,
      banco = $3,
      referencia = $4,
      titular = $5,
      nombre_socio_1 = $6,
      socio_1 = $6,
      tasa_1 = $7,
      monto_1 = $8,
      m1_socio = $8,
      polaridad_1 = $9,
      nombre_socio_2 = $10,
      socio_2 = $10,
      tasa_2 = $11,
      monto_2 = $12,
      m2_socio = $12,
      polaridad_2 = $13,
      lote_tasa = $14,
      es_edicion_manual = true,
      esta_liquidado = true,
      actualizado_en = NOW()
    WHERE LOWER(TRIM(hash_largo)) = LOWER(TRIM($15));
  `;

  const s1 = String(datos.socio_1 || datos.nombre_socio_1 || socio1Data?.nombre || 'GENERAL').trim();
  const s2 = String(datos.socio_2 || datos.nombre_socio_2 || socio2Data?.nombre || 'GENERAL').trim();

  const t1 = sanitizarNumero(datos.tasa_1, 0);
  const t2 = sanitizarNumero(datos.tasa_2, 0);

  const m1 = sanitizarNumero(datos.monto_1 ?? datos.m1_socio, montoVal);
  const m2 = sanitizarNumero(datos.monto_2 ?? datos.m2_socio, montoVal);

  const pol1 = String(datos.polaridad_1 || '+').trim();
  const pol2 = String(datos.polaridad_2 || '-').trim();

  await db.query(queryUpdateFinal, [
    montoVal, monedaVal, bancoVal, refVal, titularVal,
    s1, t1, m1, pol1,
    s2, t2, m2, pol2,
    idLote, targetHash
  ]);

  // 🟢 3. RESPALDO / COMPATIBILIDAD EN COMPROBANTES_RAW
  await db.query(`
    UPDATE comprobantes_raw SET
      monto = COALESCE($1, monto),
      moneda = COALESCE($2, moneda),
      banco = COALESCE($3, banco),
      referencia = COALESCE($4, referencia),
      titular = COALESCE($5, titular)
    WHERE LOWER(TRIM(hash_largo)) = LOWER(TRIM($6));
  `, [
    montoVal > 0 ? montoVal : null,
    monedaVal,
    bancoVal,
    refVal,
    titularVal,
    targetHash
  ]);

  // 🟢 4. PERSISTENCIA VÍA SNAPSHOT FINANCIERO / LIQUIDACIÓN
  const rawData = {
    hash_largo: targetHash,
    monto: montoVal,
    moneda: monedaVal,
    tipo_manual: datos.tipo_manual || naturaleza || 'D',
    id_tasa: idLote
  };

  if (typeof calcularSnapshotFinanciero === 'function') {
    const snapshot = calcularSnapshotFinanciero(rawData, socio1Data, socio2Data, tasaLote, funddaData, naturaleza);
    await liquidarComprobante({ ...snapshot, ...datos, hash_largo: targetHash });
  }

  return { success: true, message: 'Comprobante actualizado y congelado exitosamente' };
}

/**
 * Liquidación por omisión o fallback automático.
 */
async function liquidarAutomaticoPorOmision(hashLargo) {
  const targetHash = String(hashLargo || '').trim();
  if (!targetHash) return;

  const { rows } = await db.query(`
    SELECT 
      f.hash_largo, f.monto, f.moneda, f.fecha_hora_iso,
      COALESCE(f.nombre_socio_1, 'GENERAL') AS socio_1_auto,
      COALESCE(f.nombre_socio_2, 'GENERAL') AS socio_2_auto
    FROM comprobantes_final f
    WHERE LOWER(TRIM(f.hash_largo)) = LOWER(TRIM($1))
    LIMIT 1;
  `, [targetHash]);

  if (rows.length === 0) return;
  const comp = rows[0];
  const idLote = 'T070';

  const { tasaLote, socio1Data, socio2Data, funddaData, naturaleza } = await cargarContextoSnapshot(
    null, null, null, null, comp.moneda, comp.fecha_hora_iso
  );

  const rawData = {
    hash_largo: targetHash,
    monto: sanitizarNumero(comp.monto, 0),
    moneda: comp.moneda || 'USDT',
    tipo_manual: naturaleza || 'P',
    id_tasa: idLote
  };

  if (typeof calcularSnapshotFinanciero === 'function') {
    const snapshot = calcularSnapshotFinanciero(rawData, socio1Data, socio2Data, tasaLote, funddaData, naturaleza);
    await liquidarComprobante(snapshot);
  }
}

module.exports = { actualizarComprobante, liquidarAutomaticoPorOmision };
