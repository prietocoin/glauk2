const db = require('#config/db');

async function obtenerDirectorio() {
  const { rows } = await db.query('SELECT * FROM perfiles_glaukov ORDER BY nombre ASC;');
  return rows;
}

async function obtenerListaSocios() {
  const { rows } = await db.query(`
    SELECT DISTINCT TRIM(nombre) AS nombre 
    FROM perfiles_glaukov 
    WHERE nombre IS NOT NULL AND TRIM(nombre) != '' AND (mostrar->>'tasas')::boolean = TRUE
    ORDER BY nombre ASC;
  `);
  return rows.map(r => r.nombre);
}

module.exports = { obtenerDirectorio, obtenerListaSocios };
