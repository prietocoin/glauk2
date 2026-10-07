/**
 * @file adminColaService.js
 * @description Servicio atómico de base de datos para la cola administrativa de comprobantes.
 */
const db = require('../../../config/db');

function validarAdminKey(claveAdmin) {
  const adminSecret = process.env.ADMIN_KEY || 'ATENEA';
  return Boolean(claveAdmin && claveAdmin === adminSecret);
}

async function obtenerColaAdmin(claveAdmin) {
  if (!validarAdminKey(claveAdmin)) {
    throw new Error('Clave de administración inválida.');
  }

  const { rows } = await db.query(`
    SELECT hash_largo, hash_corto, timestamp, nombre_socio_1, nombre_socio_2, conteo, estado, url_imagen
    FROM cola_fb
    ORDER BY timestamp DESC
    LIMIT 100;
  `);
  return rows;
}

async function actualizarItemColaAdmin(hash_largo, datos = {}) {
  const { adminKey, nombre_socio_1, nombre_socio_2, estado, conteo, timestamp } = datos;
  if (!validarAdminKey(adminKey)) {
    throw new Error('Clave de administración inválida.');
  }

  const targetHash = String(hash_largo || '').trim().toLowerCase();

  await db.query(`
    UPDATE cola_fb
    SET nombre_socio_1 = $1,
        nombre_socio_2 = $2,
        estado = COALESCE($3, estado),
        conteo = COALESCE($4, conteo),
        timestamp = COALESCE($5, timestamp)
    WHERE LOWER(hash_largo) = $6;
  `, [
    nombre_socio_1 || null,
    nombre_socio_2 || null,
    estado || 'PROCESADO',
    conteo || 1,
    timestamp ? parseInt(timestamp, 10) : null,
    targetHash
  ]);

  return { success: true };
}

async function eliminarItemColaAdmin(hash_largo, adminKey) {
  if (!validarAdminKey(adminKey)) {
    throw new Error('Clave de administración inválida.');
  }

  const targetHash = String(hash_largo || '').trim().toLowerCase();

  // Ejecución en bloque para mantener integridad
  await db.query('BEGIN');
  try {
    await db.query('DELETE FROM comprobantes_fb WHERE LOWER(hash_largo) = $1;', [targetHash]);
    await db.query('DELETE FROM comprobantes_auditados_fb WHERE LOWER(hash_largo) = $1;', [targetHash]);
    await db.query('DELETE FROM cola_fb WHERE LOWER(hash_largo) = $1;', [targetHash]);
    await db.query('COMMIT');
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }

  return { success: true };
}

module.exports = {
  obtenerColaAdmin,
  actualizarItemColaAdmin,
  eliminarItemColaAdmin
};
