/**
 * @file comprobantesSnapshotService.js
 * @description Orquestador de actualización de comprobantes y snapshots automáticos.
 */
const db = require('#config/database');
const liquidacionService = require('#modules/comprobantes/services/liquidacionSnapshot.service');
const { liquidarComprobante } = require('./comprobantesLiqService');
const { cargarContextoSnapshot } = require('./comprobantesPerfilService');

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
    valMonto, datos.moneda || null,
    datos.banco ? datos.banco.toUpperCase().trim() : null,
    datos.referencia ? datos.referencia.trim() : null,
    datos.titular ? datos.titular.toUpperCase().trim() : null,
    targetHash
  ]);

  const idLote = datos.lote_tasa_asignado || datos.lote_tasa || datos.id_tasa || 'T052';
  const socio1Nombre = datos.nombre_socio_1 || datos.socio_1 || datos.socio1 || 'GENERAL';
  const socio2Nombre = datos.nombre_socio_2 || datos.socio_2 || datos.socio2 || 'GENERAL';

  const { tasaLote, socio1Data, socio2Data, funddaData } = await cargarContextoSnapshot(socio1Nombre, socio2Nombre, idLote);

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

async function liquidarAutomaticoPorOmision(hashLargo) {
  const targetHash = String(hashLargo || '').trim();
  const { rows } = await db.query(`
    SELECT 
      c.hash_largo, c.monto, c.moneda, c.creado_en,
      COALESCE(n_grupo1.nombre, n_user1.nombre, 'GENERAL') AS socio_1_auto,
      COALESCE(n_grupo2.nombre, n_user2.nombre, 'GENERAL') AS socio_2_auto,
      (
        SELECT t.id_tasa FROM tasas_glaukov t 
        WHERE t.created_at <= COALESCE(c.creado_en, NOW())
        ORDER BY t.created_at DESC, t.id DESC LIMIT 1
      ) AS lote_historico
    FROM comprobantes_raw c
    LEFT JOIN impactos_raw i1 ON LOWER(TRIM(i1.hash_largo)) = LOWER(TRIM(c.hash_largo))
    LEFT JOIN perfiles_glaukov n_grupo1 ON i1.grupo_raw IS NOT NULL AND LOWER(TRIM(n_grupo1.id_grupo)) = LOWER(TRIM(i1.grupo_raw))
    LEFT JOIN perfiles_glaukov n_user1 ON i1.usuario_raw IS NOT NULL AND LOWER(TRIM(n_user1.id_grupo)) = LOWER(TRIM(i1.usuario_raw))
    LEFT JOIN impactos_raw i2 ON LOWER(TRIM(i2.hash_largo)) = LOWER(TRIM(c.hash_largo)) AND i2.id != i1.id
    LEFT JOIN perfiles_glaukov n_grupo2 ON i2.grupo_raw IS NOT NULL AND LOWER(TRIM(n_grupo2.id_grupo)) = LOWER(TRIM(i2.grupo_raw))
    LEFT JOIN perfiles_glaukov n_user2 ON i2.usuario_raw IS NOT NULL AND LOWER(TRIM(n_user2.id_grupo)) = LOWER(TRIM(i2.usuario_raw))
    WHERE LOWER(TRIM(c.hash_largo)) = LOWER(TRIM($1))
    LIMIT 1;
  `, [targetHash]);

  if (rows.length === 0) return;
  const comp = rows[0];
  const idLote = comp.lote_historico || 'T052';

  const { tasaLote, socio1Data, socio2Data, funddaData } = await cargarContextoSnapshot(comp.socio_1_auto, comp.socio_2_auto, idLote);

  const rawData = {
    hash_largo: targetHash,
    monto: comp.monto || 0,
    moneda: comp.moneda || 'COP',
    tipo_manual: 'P',
    id_tasa: idLote
  };

  const snapshot = calcularSnapshotFinanciero(rawData, socio1Data, socio2Data, tasaLote, funddaData);
  await liquidarComprobante(snapshot);
}

module.exports = { actualizarComprobante, liquidarAutomaticoPorOmision };
