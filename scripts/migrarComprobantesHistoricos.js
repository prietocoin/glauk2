/**
 * @file migrarComprobantesHistoricos.js
 * @description Script CLI de migración para encolar comprobantes históricos no congelados en BullMQ.
 */
const db = require('../src/config/db');
const { liquidacionQueue } = require('../src/workers/liquidacion.worker');

async function migrarComprobantesHistoricos() {
  console.log('🚀 Buscando comprobantes no congelados en comprobantes_raw...');

  try {
    const { rows } = await db.query(`
      SELECT c.hash_largo 
      FROM comprobantes_raw c
      LEFT JOIN comprobantes_liq l ON c.hash_largo = l.hash_largo
      WHERE l.hash_largo IS NULL AND c.hash_largo IS NOT NULL;
    `);

    console.log(`📦 Encontrados ${rows.length} comprobantes pendientes de congelar.`);

    if (rows.length === 0) {
      console.log('✨ No hay comprobantes pendientes.');
      return;
    }

    // Transformación para ráfaga masiva en BullMQ (addBulk)
    const jobs = rows.map(row => ({
      name: 'liquidar-comprobante',
      data: { hash_largo: row.hash_largo },
      opts: { removeOnComplete: true, attempts: 3 }
    }));

    await liquidacionQueue.addBulk(jobs);

    console.log(`✅ ${jobs.length} comprobantes históricos encolados con éxito en BullMQ.`);
  } catch (err) {
    console.error('❌ Error durante la migración:', err.message);
  } finally {
    if (typeof liquidacionQueue.close === 'function') await liquidacionQueue.close();
    process.exit(0);
  }
}

migrarComprobantesHistoricos();
