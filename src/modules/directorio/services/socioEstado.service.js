const db = require('../../../config/db');

async function cambiarEstadoSocio(nombre, activo) {
  const estadoTasas = nombre.trim().toUpperCase() === 'GENERAL' ? true : Boolean(activo);
  const { rows } = await db.query(`
    UPDATE perfiles_glaukov 
    SET mostrar = jsonb_set(COALESCE(mostrar, '{"tasas": true}'::jsonb), '{tasas}', to_jsonb($1::boolean)) 
    WHERE UPPER(TRIM(nombre)) = UPPER(TRIM($2)) RETURNING nombre, mostrar;
  `, [estadoTasas, nombre.trim()]);
  return rows[0];
}

async function desactivarTodosSocios() {
  await db.query(`UPDATE perfiles_glaukov SET mostrar = jsonb_set(COALESCE(mostrar, '{}'::jsonb), '{tasas}', 'false'::jsonb) WHERE UPPER(TRIM(nombre)) != 'GENERAL';`);
  await db.query(`UPDATE perfiles_glaukov SET mostrar = jsonb_set(COALESCE(mostrar, '{}'::jsonb), '{tasas}', 'true'::jsonb) WHERE UPPER(TRIM(nombre)) = 'GENERAL';`);
  return { success: true };
}

async function guardarSociosVigentes() {
  await db.query(`ALTER TABLE perfiles_glaukov ADD COLUMN IF NOT EXISTS recordar_mostrar JSONB;`);
  await db.query(`UPDATE perfiles_glaukov SET recordar_mostrar = mostrar;`);
  return { success: true };
}

async function restaurarSociosVigentes() {
  await db.query(`UPDATE perfiles_glaukov SET mostrar = COALESCE(recordar_mostrar, '{"tasas": false}'::jsonb);`);
  await db.query(`UPDATE perfiles_glaukov SET mostrar = jsonb_set(COALESCE(mostrar, '{}'::jsonb), '{tasas}', 'true'::jsonb) WHERE UPPER(TRIM(nombre)) = 'GENERAL';`);
  return { success: true };
}

module.exports = { cambiarEstadoSocio, desactivarTodosSocios, guardarSociosVigentes, restaurarSociosVigentes };
