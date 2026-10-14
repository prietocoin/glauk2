/**
 * @file comprobantesBorradoService.js
 * @description Eliminación limpia en cascada de comprobantes en todas las tablas, incluyendo comprobantes_final.
 */
const db = require('#config/database');

async function eliminarComprobante(hashLargo) {
  const targetHash = String(hashLargo || '').trim();
  if (!targetHash) return { success: false, error: 'Hash no proporcionado' };

  try {
    // 🟢 1. ELIMINACIÓN DIRECTA EN LA FUENTE DE VERDAD
    await db.query(`DELETE FROM comprobantes_final WHERE LOWER(TRIM(hash_largo)) = LOWER(TRIM($1));`, [targetHash]);

    // 🟢 2. LIMPIEZA EN CASCADA DE TABLAS HISTÓRICAS / INTERMEDIAS
    await db.query(`DELETE FROM comprobantes_raw WHERE LOWER(TRIM(hash_largo)) = LOWER(TRIM($1));`, [targetHash]);
    await db.query(`DELETE FROM impactos_raw WHERE LOWER(TRIM(hash_largo)) = LOWER(TRIM($1));`, [targetHash]);
    await db.query(`DELETE FROM comprobantes_liq WHERE LOWER(TRIM(hash_largo)) = LOWER(TRIM($1));`, [targetHash]);

    return { success: true };
  } catch (error) {
    console.error('[comprobantesBorradoService ❌ Error al eliminar comprobante]:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { eliminarComprobante };
