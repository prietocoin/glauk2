/**
 * @file tasasSociosQuery.js
 * @description Consulta SQL para obtener perfiles con carteleras de tasas activas.
 */
const db = require('../../../config/db');

async function obtenerSociosConTasasActivas() {
  const { rows } = await db.query(`
    SELECT * FROM perfiles_glaukov 
    WHERE (mostrar->>'tasas')::boolean = TRUE;
  `);
  return rows || [];
}

module.exports = { obtenerSociosConTasasActivas };
