/**
 * @file tasasPublicacion.service.js
 * @description Publicación oficial de lotes en PostgreSQL y registro de reenvíos.
 */
const db = require('../../../config/db');

async function generarSiguienteIdTasa() {
  const { rows } = await db.query("SELECT id_tasa FROM tasas_glaukov ORDER BY created_at DESC, id DESC LIMIT 1;");
  if (rows.length === 0) return 'T001';
  const match = rows[0].id_tasa.match(/\d+/);
  const num = match ? parseInt(match[0], 10) + 1 : 1;
  return `T${String(num).padStart(3, '0')}`;
}

async function publicarTasaOficial(id_tasa, tasas) {
  if (!tasas || Object.keys(tasas).length === 0) throw new Error('No se enviaron tasas para publicar.');

  const codigoTasa = id_tasa || (await generarSiguienteIdTasa());
  const tasasJson = typeof tasas === 'string' ? tasas : JSON.stringify(tasas);

  await db.query(`
    INSERT INTO tasas_glaukov (id_tasa, tasas) VALUES ($1, $2::jsonb)
    ON CONFLICT (id_tasa) DO UPDATE SET tasas = EXCLUDED.tasas, created_at = CURRENT_TIMESTAMP;
  `, [codigoTasa, tasasJson]);

  try {
    await db.query(`INSERT INTO notificaciones_tasas (id_tasa) VALUES ($1);`, [codigoTasa]);
  } catch (e) {
    console.warn('⚠️ [TasasPublicacion] No se pudo encolar notificación:', e.message);
  }

  return { id_tasa: codigoTasa };
}

async function reenviarTasa(id_tasa) {
  let codigoTasa = id_tasa;
  if (!codigoTasa) {
    const { rows } = await db.query("SELECT id_tasa FROM tasas_glaukov ORDER BY created_at DESC, id DESC LIMIT 1;");
    if (rows.length === 0) throw new Error('No hay tasas registradas para reenviar.');
    codigoTasa = rows[0].id_tasa;
  }
  await db.query(`INSERT INTO notificaciones_tasas (id_tasa) VALUES ($1);`, [codigoTasa]);
  return { id_tasa: codigoTasa };
}

module.exports = { publicarTasaOficial, reenviarTasa };
