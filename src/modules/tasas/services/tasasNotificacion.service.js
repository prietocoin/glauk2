/**
 * @file tasasNotificacion.service.js
 * @description Servicio atómico de base de datos para la cola de notificaciones de tasas.
 */
const db = require('#config/database');

async function obtenerNotificacionActual() {
  const { rows } = await db.query('SELECT * FROM notificaciones_tasas LIMIT 1;');
  return rows || [];
}

async function crearNotificacionTasa(tasa) {
  await db.query('INSERT INTO notificaciones_tasas (tasa) VALUES ($1);', [tasa]);
  return true;
}

module.exports = {
  obtenerNotificacionActual,
  crearNotificacionTasa
};
