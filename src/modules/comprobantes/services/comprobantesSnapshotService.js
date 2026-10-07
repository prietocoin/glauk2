/**
 * @file comprobantesSnapshotService.js
 * @description Actualiza comprobantes_raw y congela/recalcula el snapshot en comprobantes_liq.
 */
const db = require('../../../../config/db');
const { obtenerTasaPorId, obtenerUltimasTasas } = require('../../mercado/services/mercadoService');
const { calcularSnapshotFinanciero } = require('./liquidacionService');

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

async function actualizarComprobante(hashLargo, datos = {}) {
  const targetHash = String(hashLargo || '').trim();
  const montoRawStr = String(datos.monto || '').replace(/,/g, '').trim();
  const montoSanitizado = parseFloat(montoRawStr);
  const valMonto = !isNaN(montoSanitizado) && montoSanitizado > 0 ? montoSanitizado : null;

  await db.query(`
    UPDATE comprobantes_raw SET
      monto = COALESCE($1, monto),
      moneda = COALESCE($2, moneda),
      banco = COALESCE($3, banco),
      referencia = COALESCE($4, referencia),
      titular = COALESCE($5, titular)
    WHERE LOWER(TRIM(hash_largo)) = LOWER(TRIM($6));
  `, [
    valMonto,
    datos.moneda || null,
    datos.banco ? datos.banco.toUpperCase().trim() : null,
    datos.referencia ? datos.referencia.trim() : null,
    datos.titular ? datos.titular.toUpperCase().trim() : null,
    targetHash
  ]);

  const idLote = datos.lote_tasa_asignado || datos.lote_tasa || datos.id_tasa || 'T052';
  const socio1Nombre = datos.nombre_socio_1 || datos.socio_1 || datos.socio1 || 'GENERAL';
  const socio2Nombre = datos.nombre_socio_2 || datos.socio_2 || datos.socio2 || 'GENERAL';

  let tasaLote = null;
  try {
    if (typeof obtenerTasaPorId === 'function') tasaLote = await obtenerTasaPorId(idLote);
  } catch (e) {
    console.warn(`⚠️ Error lote ${idLote}:`, e.message);
  }
  if (!tasaLote) tasaLote = await obtenerUltimasTasas();

  let socio1Data = { nombre: socio1Nombre, moneda_base: 'USDT' };
  let socio2Data = { nombre: socio2Nombre, moneda_base: 'USDT' };

  if (socio1Nombre && socio1Nombre.toUpperCase() !== 'GENERAL') {
    const res1 = await db.query(`SELECT * FROM perfiles_glaukov WHERE UPPER(TRIM(nombre)) = UPPER(TRIM($1)) LIMIT 1`, [socio1Nombre]);
    if (res1.rows.length > 0) socio1Data = res1.rows[0];
  }

  if (socio2Nombre && socio2Nombre.toUpperCase() !== 'GENERAL') {
    const res2 = await db.query(`SELECT * FROM perfiles_glaukov WHERE UPPER(TRIM(nombre)) = UPPER(TRIM($1)) LIMIT 1`, [socio2Nombre]);
    if (res2.rows.length > 0) socio2Data = res2.rows[0];
  }

  let funddaData = null;
  const resFundda = await db.query(`SELECT * FROM perfiles_glaukov WHERE UPPER(TRIM(nombre)) = 'FUNDDA' LIMIT 1`);
  if (resFundda.rows.length > 0) funddaData = resFundda.rows[0];

  const rawData = {
    hash_largo: targetHash,
    monto: valMonto || datos.monto || 0,
    moneda: datos.moneda || datos.moneda_recibo || 'COP',
    tipo_manual: datos.tipo_manual || datos.tipo_op || datos.tipo_op1 || 'P',
    id_tasa: idLote
  };

  const snapshot = calcularSnapshotFinanciero(rawData, socio1Data, socio2Data, tasaLote, funddaData);
  await liquidarComprobante(snapshot);

  return { success: true };
}

module.exports = { liquidarComprobante, actualizarComprobante };
