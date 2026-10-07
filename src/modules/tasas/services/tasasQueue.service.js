/**
 * @file tasasQueue.service.js
 * @description Servicio atómico para el encolado y despacho de carteleras en BullMQ (cola-tasas).
 */
const { Queue } = require('bullmq');
const redisConnection = require('../../../config/redis');
const { obtenerSociosYProcesarTasas } = require('./tasasProcessor.service');

const tasasQueue = new Queue('cola-tasas', { connection: redisConnection });

tasasQueue.on('error', (err) => {
  console.error('❌ [BullMQ tasasQueue] Error en la cola de Redis:', err.message);
});

async function encolarNotificacionesTasas(options = {}) {
  const opts = typeof options === 'string' ? { filtroNombre: options } : (options || {});
  const esModoPrueba = Boolean(opts.modoPrueba || opts.esPrueba);
  const testJid = process.env.TEST_JID_OVERRIDE;
  const jidOverride = opts.jidOverride || opts.destinationJid || (esModoPrueba ? testJid : null);

  const socios = await obtenerSociosYProcesarTasas(opts);
  let totalEncolados = 0;

  for (const socio of socios) {
    const targetJid = (jidOverride && String(jidOverride).trim().length > 0)
      ? String(jidOverride).trim()
      : socio.remoteJid;

    const payloadJob = {
      ...socio,
      remoteJid: targetJid,
      jidOverride: targetJid,
      destinationJid: targetJid,
      modoPrueba: esModoPrueba
    };

    try {
      await tasasQueue.add('render-tasa-socio', payloadJob, { removeOnComplete: true, attempts: 3 });
      totalEncolados++;
    } catch (qErr) {
      console.error(`❌ Error al encolar tasa en Redis (${socio.nombre_socio}):`, qErr.message);
    }
  }

  return { totalEncolados, socios: socios.map(s => s.nombre_socio) };
}

module.exports = {
  encolarNotificacionesTasas,
  dispararPublicacionCartelera: encolarNotificacionesTasas
};
