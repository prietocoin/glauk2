const db = require('../../../config/db');

async function guardarSocioConfig(payload) {
  const { nombre, id_grupo, rol, moneda_base, saldo_inicial, mostrar, monedas, herencia } = payload;
  const nombreClean = String(nombre || '').trim().toUpperCase();
  
  const mostrarObj = (typeof mostrar === 'object' && mostrar !== null) ? mostrar : { tasas: true, dashboard: true };
  const monedasJson = (typeof monedas === 'object' && monedas !== null) ? JSON.stringify(monedas) : (monedas || '{}');

  const values = [
    id_grupo || '', rol || 'SOCIO', (moneda_base || 'USDT').toUpperCase(), 
    parseFloat(saldo_inicial) || 0, JSON.stringify(mostrarObj), monedasJson, 
    Boolean(herencia), nombreClean
  ];

  const { rows } = await db.query(`
    UPDATE perfiles_glaukov SET id_grupo = $1, rol = $2, moneda_base = $3, saldo_inicial = $4,
    mostrar = $5::jsonb, monedas = $6::jsonb, herencia = $7::boolean
    WHERE UPPER(TRIM(nombre)) = $8 RETURNING *;
  `, values);

  if (rows.length === 0) {
    const insertRes = await db.query(`
      INSERT INTO perfiles_glaukov (id_grupo, nombre, rol, moneda_base, saldo_inicial, mostrar, monedas, herencia)
      VALUES ($1, $8, $2, $3, $4, $5::jsonb, $6::jsonb, $7::boolean) RETURNING *;
    `, values);
    return insertRes.rows[0];
  }
  return rows[0];
}

async function eliminarSocio(nombre) {
  if (nombre.trim().toUpperCase() === 'GENERAL') throw new Error('No se puede eliminar GENERAL.');
  const { rows } = await db.query(`DELETE FROM perfiles_glaukov WHERE UPPER(TRIM(nombre)) = UPPER(TRIM($1)) RETURNING *;`, [nombre.trim()]);
  return rows[0];
}

module.exports = { guardarSocioConfig, eliminarSocio };
