/**
 * @file tasas.worker.js
 * @description Worker consumidor atómico de BullMQ para el despacho de carteleras de tasas.
 */
const { Worker } = require('bullmq');
const redisConnection = require('../config/redis');
const { obtenerImagenTasasHub } = require('../modules/integrations/tasashubClient');
const { enviarImagenWhatsApp } = require('../modules/integrations/evolutionClient');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const tasasWorker = new Worker(
  'cola-tasas',
  async (job) => {
    const datosSocio = job.data;
    const destinoFinal = datosSocio.remoteJid || datosSocio.jidOverride;

    console.log(`[TasasWorker ⚙️] Procesando imagen para: ${datosSocio.nombre_socio}`);

    if (!destinoFinal) {
      console.log(`[TasasWorker ℹ️] ${datosSocio.nombre_socio} sin JID asignado. Omitiendo.`);
      return { status: 'omitido', socio: datosSocio.nombre_socio };
    }

    const imageBuffer = await obtenerImagenTasasHub(datosSocio.nombre_socio);

    console.log(`[TasasWorker 📤] Enviando tasa a WhatsApp JID: ${destinoFinal}`);
    await enviarImagenWhatsApp(
      destinoFinal,
      imageBuffer,
      `Hola 👋 *${datosSocio.nombre_socio}*. Adjunto la actualización de tasas 📊.`
    );

    console.log(`[TasasWorker 🛡️] Esperando 5 segundos (Anti-ban)...`);
    await delay(5000);

    return { status: 'completado', socio: datosSocio.nombre_socio, destino: destinoFinal };
  },
  { connection: redisConnection, concurrency: 1 }
);

tasasWorker.on('completed', (job) => {
  console.log(`[TasasWorker ✅] Trabajo ${job.id} finalizado exitosamente`);
});

tasasWorker.on('failed', (job, err) => {
  console.error(`[TasasWorker ❌] Trabajo ${job?.id} falló:`, err.message);
});

module.exports = { tasasWorker };
