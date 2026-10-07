/**
 * @file comprobantesPerfilService.js
 * @description Carga de perfiles de socios (incluyendo FUNDDA) y tasas para snapshots.
 */
const db = require('../../../../config/db');
const { obtenerTasaPorId, obtenerUltimasTasas } = require('../../mercado/services/mercadoService');

async function cargarContextoSnapshot(socio1Nombre, socio2Nombre, idLote) {
  let tasaLote = null;
  try {
    if (typeof obtenerTasaPorId === 'function') tasaLote = await obtenerTasaPorId(idLote);
  } catch (e) {
    console.warn(`⚠️ Error lote ${idLote}:`, e.message);
  }
  if (!tasaLote) tasaLote = await obtenerUltimasTasas();

  let socio1Data = { nombre: socio1Nombre || 'GENERAL', moneda_base: 'USDT' };
  let socio2Data = { nombre: socio2Nombre || 'GENERAL', moneda_base: 'USDT' };

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

  return { tasaLote, socio1Data, socio2Data, funddaData };
}

module.exports = { cargarContextoSnapshot };
