/**
 * @file tasasQuery.js
 * @description Capa de acceso a datos pura para la tabla 'tasas_glaukov'.
 */
const db = require('../../../config/db');

function normalizarLote(row) {
  if (!row) return null;
  const tasas = typeof row.tasas === 'string' ? JSON.parse(row.tasas) : (row.tasas || {});
  return { ...row, tasas };
}

/**
 * Consulta en PostgreSQL el lote actual y el lote anterior para comparación de tendencias.
 * @param {string|null} idTasaRequerida - ID del lote específico (ej. 'T052').
 */
async function obtenerLotesTasas(idTasaRequerida = null) {
  let loteActual = null;
  let loteAnterior = null;

  if (idTasaRequerida) {
    const sqlEspecifica = `
      SELECT id_tasa, tasas, created_at 
      FROM tasas_glaukov 
      WHERE id_tasa = $1 
      LIMIT 1;
    `;
    const res = await db.query(sqlEspecifica, [idTasaRequerida]);
    if (res.rows.length > 0) {
      loteActual = normalizarLote(res.rows[0]);
      loteAnterior = loteActual;
    }
  }

  if (!loteActual) {
    const sqlRecientes = `
      SELECT id_tasa, tasas, created_at 
      FROM tasas_glaukov 
      ORDER BY created_at DESC, id DESC 
      LIMIT 2;
    `;
    const res = await db.query(sqlRecientes);
    loteActual = normalizarLote(res.rows[0]) || { id_tasa: 'T001', tasas: {} };
    loteAnterior = normalizarLote(res.rows[1]) || loteActual;
  }

  return { loteActual, loteAnterior };
}

module.exports = {
  obtenerLotesTasas
};
