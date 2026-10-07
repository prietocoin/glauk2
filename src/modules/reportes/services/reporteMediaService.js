/**
 * @file reporteMediaService.js
 * @description Obtiene el JID del socio y reutiliza evolutionClient para enviar reportes visuales.
 */
const db = require('../../../config/db');
const { enviarImagenWhatsApp } = require('../../integrations/evolutionClient');

async function obtenerJidSocio(nombreSocio) {
  const target = String(nombreSocio).trim().toLowerCase();
  const sql = `
    SELECT NULLIF(TRIM(id_grupo), '') AS jid
    FROM perfiles_glaukov
    WHERE LOWER(nombre) = $1 LIMIT 1;
  `;
  const { rows } = await db.query(sql, [target]);
  return rows[0]?.jid || null;
}

async function enviarMediaWhatsApp(datos) {
  const { socio, caption, base64 } = datos;

  if (!socio || !socio.trim()) throw new Error('El parámetro socio es requerido.');
  if (!base64) throw new Error('No se proporcionó la imagen en formato Base64.');

  const jidDestino = await obtenerJidSocio(socio);
  if (!jidDestino) {
    throw new Error(`El socio "${socio}" no posee un "id_grupo" configurado en perfiles_glaukov.`);
  }

  const base64Clean = base64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
  const imageBuffer = Buffer.from(base64Clean, 'base64');

  await enviarImagenWhatsApp(jidDestino, imageBuffer, caption || '');

  return { success: true, jid: jidDestino };
}

module.exports = { enviarMediaWhatsApp };
