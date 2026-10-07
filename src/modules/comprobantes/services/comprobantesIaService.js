/**
 * @file comprobantesIaService.js
 * @description Encola la relectura mediante IA en BullMQ y actualiza estado_ia.
 */
const { Queue } = require('bullmq');
const db = require('../../../../config/db');
const redisConfig = require('../../../../config/redis');

const pipelineQueue = new Queue('cola-pipeline', { connection: redisConfig });

async function releerIA(hashLargo) {
  const targetHash = String(hashLargo || '').trim();
  if (!targetHash) throw new Error('Hash no proporcionado.');

  const { rows } = await db.query(`
    SELECT c.hash_largo, c.creado_en, COALESCE(c.url_r2, i.url_imagen) AS url_r2, 
           COALESCE(c.instancia, i.instancia, 'JAIRO') AS instancia, i.caption, i.timestamp_msg
    FROM comprobantes_raw c
    LEFT JOIN impactos_raw i ON LOWER(TRIM(c.hash_largo)) = LOWER(TRIM(i.hash_largo))
    WHERE LOWER(TRIM(c.hash_largo)) = LOWER(TRIM($1))
    LIMIT 1;
  `, [targetHash]);

  if (rows.length === 0) {
    throw new Error('Comprobante no encontrado en la base de datos.');
  }

  const comp = rows[0];

  await db.query(`
    UPDATE comprobantes_raw 
    SET estado_ia = 'RE-PROCESANDO', procesado_ia = false 
    WHERE LOWER(TRIM(hash_largo)) = LOWER(TRIM($1));
  `, [targetHash]);

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
