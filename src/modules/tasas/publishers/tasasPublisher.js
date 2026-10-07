/**
 * @file tasasPublisher.js
 * @description Publicador atómico de trabajos a la cola BullMQ 'cola-tasas' en glauk2.
 * Inyecta el JID resuelto e inmutable de modo que el worker consuma a ciegas.
 */

const { Queue } = require('bullmq');
const redisConnection = require('../../../config/redis');
const { resolverDestinoJid } = require('../resolvers/jidResolver');

const tasasQueue = new Queue('cola-tasas', { connection: redisConnection });

/**
 * Encola la lista de socios procesados en la cola Redis de BullMQ en ráfaga masiva.
 * @param {Array<Object>} sociosProcesados - Lista de objetos de socio con su cartelera.
 * @param {Object} options - Opciones de despacho (modoPrueba, jidOverride).
 * @returns {Promise<{totalEncolados: number, socios: Array<string>}>}
 */
async function encolarNotificacionesTasas(sociosProcesados = [], options = {}) {
  if (!sociosProcesados || sociosProcesados.length === 0) {
    return { totalEncolados: 0, socios: [] };
  }

  const esModoPrueba = Boolean(options.modoPrueba || options.esPrueba);
  const overrideInput = options.jidOverride || options.destinationJid;

  const jobs = sociosProcesados.map(socio => {
    const jidFinal = resolverDestinoJid(socio.remoteJid, esModoPrueba, overrideInput);
    return {
      name: 'render-tasa-socio',
      data: {
        ...socio,
        remoteJid: jidFinal,
        jidOverride: jidFinal,
        modoPrueba: esModoPrueba
      },
      opts: { removeOnComplete: true, attempts: 3 }
    };
  });

  try {
    await tasasQueue.addBulk(jobs);
    return {
      totalEncolados: jobs.length,
      socios: sociosProcesados.map(s => s.nombre_socio)
    };
  } catch (err) {
    console.error('[TasasPublisher ❌ Error encolado masivo]:', err.message);
    throw err;
  }
}

module.exports = { tasasQueue, encolarNotificacionesTasas };
