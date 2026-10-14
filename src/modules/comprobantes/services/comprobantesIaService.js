/**
 * @file comprobantesIaService.js
 * @description Encola la relectura mediante IA en BullMQ y actualiza estado_ia tanto en comprobantes_raw como en comprobantes_final.
 */
const { Queue } = require('bullmq');
const db = require('#config/database');
const redisConfig = require('../../../../config/redis');

const pipelineQueue = new Queue('cola-pipeline', { connection: redisConfig });

async function releerIA(hashLargo) {
  const targetHash = String(hashLargo || '').trim();
  if (!targetHash) throw new Error('Hash no proporcionado.');

  // 🟢 1. BUSCAR DATOS PRIMERO EN COMPROBANTES_FINAL Y LUEGO EN RAW COMO FALLBACK
  const { rows } = await db.query(`
    SELECT 
      f.hash_largo, 
      COALESCE(f.fecha_hora_iso, c.creado_en) AS creado_en, 
      COALESCE(f.url_r2_comprobante, c.url_r2, i.url_imagen) AS url_r2, 
      COALESCE(c.instancia, i.instancia, 'JAIRO') AS instancia, 
      i.caption, 
      i.timestamp_msg
    FROM comprobantes_final f
    LEFT JOIN comprobantes_raw c ON LOWER(TRIM(c.hash_largo)) = LOWER(TRIM(f.hash_largo))
    LEFT JOIN impactos_raw i ON LOWER(TRIM(i.hash_largo)) = LOWER(TRIM(f.hash_largo))
    WHERE LOWER(TRIM(f.hash_largo)) = LOWER(TRIM($1))
    ORDER BY i.id ASC
    LIMIT 1;
  `, [targetHash]);

  if (rows.length === 0) {
    throw new Error('Comprobante no encontrado en la base de datos.');
  }

  const comp = rows[0];

  // 🟢 2. ACTUALIZAR ESTADO DE RE-PROCESAMIENTO EN COMPROBANTES_FINAL Y RAW
  await db.query(`
    UPDATE comprobantes_final 
    SET estado_ia = 'RE-PROCESANDO', procesado_ia = false 
    WHERE LOWER(TRIM(hash_largo)) = LOWER(TRIM($1));
  `, [targetHash]);

  await db.query(`
    UPDATE comprobantes_raw 
    SET estado_ia = 'RE-PROCESANDO', procesado_ia = false 
    WHERE LOWER(TRIM(hash_largo)) = LOWER(TRIM($1));
  `, [targetHash]);

  // 🟢 3. ENCOLAR TRABAJO EN BULLMQ
  await pipelineQueue.add('releer-ia', {
    hash_largo: comp.hash_largo,
    url_r2: comp.url_r2,
    instancia: comp.instancia || 'JAIRO',
    caption: comp.caption,
    timestamp_msg: comp.timestamp_msg,
    creado_en: comp.creado_en
  }, {
    attempts: 3,
    removeOnComplete: true
  });

  return { success: true, message: 'Re-lectura encolada manteniendo fecha/tasa histórica intacta' };
}

module.exports = { releerIA };
