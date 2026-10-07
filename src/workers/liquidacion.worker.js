/**
 * @file liquidacion.worker.js
 * @description Worker BullMQ desacoplado para congelamiento de snapshots en glauk2.
 */
const { Worker, Queue } = require('bullmq');
const redis = require('#config/redis');
const { procesarSnapshotComprobante } = require('../modules/atenea/services/liquidacionSnapshot.service');

const liquidacionQueue = new Queue('cola-liquidaciones', { connection: redisConnection });

const liquidacionWorker = new Worker(
  'cola-liquidaciones',
  async (job) => {
    const { hash_largo } = job.data;
    if (!hash_largo) return;

    console.log(`[Glaukov Worker ⚙️] Procesando snapshot para: ${hash_largo.substring(0, 8)}`);
    const resultado = await procesarSnapshotComprobante(hash_largo);
    console.log(`[Glaukov Worker 🟢] Comprobante ${hash_largo.substring(0, 8)} congelado correctamente.`);
    return resultado;
  },
  { connection: redisConnection, concurrency: 3 }
);

module.exports = { liquidacionWorker, liquidacionQueue };
