/**
 * @file comprobantesBorradoService.js
 * @description Eliminación limpia en cascada de comprobantes en las 3 tablas.
 */
const db = require('#config/database');

async function eliminarComprobante(hashLargo) {
  const targetHash = String(hashLargo || '').trim();
  if (!targetHash) return { success: false, error: 'Hash no proporcionado' };

  await db.query(`DELETE FROM comprobantes_raw WHERE LOWER(TRIM(hash_largo)) = LOWER(TRIM($1));`, [targetHash]);
  await db.query(`DELETE FROM impactos_raw WHERE LOWER(TRIM(hash_largo)) = LOWER(TRIM($1));`, [targetHash]);
  await db.query(`DELETE FROM comprobantes_liq WHERE LOWER(TRIM(hash_largo)) = LOWER(TRIM($1));`, [targetHash]);

  return { success: true };
}

module.exports = { eliminarComprobante };
