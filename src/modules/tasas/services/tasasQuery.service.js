/**
 * @file tasasQuery.service.js
 * @description Lectura atómica de lotes de tasas registradas en PostgreSQL.
 */
const db = require('../../../config/db');

const MONEDAS_BASE_DEFAULT = { USD: 1.0, USDT: 1.0, PYUSD: 1.2, ECU: 1.0, PAN: 1.0 };

async function obtenerUltimasTasas() {
  const { rows } = await db.query(`
    SELECT id_tasa, tasas, created_at 
    FROM tasas_glaukov ORDER BY created_at DESC, id DESC LIMIT 1;
  `);

  if (rows.length === 0) return { id_tasa: 'T001', tasas: MONEDAS_BASE_DEFAULT };

  const row = rows[0];
  const tasasObj = typeof row.tasas === 'string' ? JSON.parse(row.tasas) : row.tasas;
  return { id_tasa: row.id_tasa, tasas: { ...MONEDAS_BASE_DEFAULT, ...tasasObj }, created_at: row.created_at };
}

async function obtenerTasaPorId(id_tasa) {
  if (!id_tasa) return await obtenerUltimasTasas();

  const { rows } = await db.query(
    'SELECT id_tasa, tasas, created_at FROM tasas_glaukov WHERE id_tasa = $1 LIMIT 1;',
    [id_tasa]
  );

  if (rows.length === 0) return await obtenerUltimasTasas();

  const row = rows[0];
  const tasasObj = typeof row.tasas === 'string' ? JSON.parse(row.tasas) : row.tasas;
  return { id_tasa: row.id_tasa, tasas: { ...MONEDAS_BASE_DEFAULT, ...tasasObj }, created_at: row.created_at };
}

module.exports = { obtenerUltimasTasas, obtenerTasaPorId };
