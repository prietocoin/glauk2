/**
 * @file comprobantesPerfilService.js
 * @description Carga de perfiles de socios (por JID) y resolución de Naturaleza + Tasas para snapshots.
 */
const db = require('#config/database');

/**
 * Busca la tasa/lote más próximo anterior o igual a la fecha del primer impacto
 */
async function obtenerLoteVigentePorFecha(moneda, timestampMsg) {
  try {
    // Si timestampMsg viene en segundos (Unix), lo convertimos a ISO/Date
    const fechaImpacto = timestampMsg ? new Date(Number(timestampMsg) * 1000) : new Date();

    const res = await db.query(
      `SELECT * FROM tasas_glaukov 
       WHERE UPPER(TRIM(moneda)) = UPPER(TRIM($1)) 
         AND creado_en <= $2 
       ORDER BY creado_en DESC 
       LIMIT 1`,
      [moneda, fechaImpacto]
    );

    return res.rows[0] || null;
  } catch (e) {
    console.warn(`⚠️ Error buscando lote vigente para ${moneda}:`, e.message);
    return null;
  }
}

/**
 * Carga el contexto completo del comprobante cruzando por JID y Moneda
 */
async function cargarContextoSnapshot(grupoRaw1, usuarioRaw1, grupoRaw2, usuarioRaw2, moneda, timestampMsg) {
  // 1. RESOLUCIÓN DE LOTE Y TASA VIGENTE POR FECHA IMPACTO
  const tasaLote = await obtenerLoteVigentePorFecha(moneda, timestampMsg);

  // 2. BÚSQUEDA SOCIO 1 POR JID
  let socio1Data = { nombre: 'GENERAL', moneda_base: 'USDT' };
  if (grupoRaw1 || usuarioRaw1) {
    const res1 = await db.query(
      `SELECT * FROM perfiles_glaukov 
       WHERE TRIM(jid_grupo) = TRIM($1) 
          OR TRIM(jid_usuario) = TRIM($2) 
       LIMIT 1`,
      [grupoRaw1, usuarioRaw1]
    );
    if (res1.rows.length > 0) socio1Data = res1.rows[0];
  }

  // 3. BÚSQUEDA SOCIO 2 POR JID (Contraparte)
  let socio2Data = { nombre: 'GENERAL', moneda_base: 'USDT' };
  if (grupoRaw2 || usuarioRaw2) {
    const res2 = await db.query(
      `SELECT * FROM perfiles_glaukov 
       WHERE TRIM(jid_grupo) = TRIM($1) 
          OR TRIM(jid_usuario) = TRIM($2) 
       LIMIT 1`,
      [grupoRaw2, usuarioRaw2]
    );
    if (res2.rows.length > 0) socio2Data = res2.rows[0];
  }

  // 4. EXTRAER NATURALEZA ATÓMICA (Socio 1 + Moneda)
  // Se lee la regla de la moneda dentro del JSON de monedas del perfil
  const reglasMoneda = socio1Data.monedas || {};
  const reglaEspecifica = reglasMoneda[moneda?.toUpperCase()] || {};
  const naturaleza = reglaEspecifica.naturaleza || 'D'; // Fallback a Depósito 'D'

  // 5. SOCIO SYSTEM / FUNDDA
  let funddaData = null;
  const resFundda = await db.query(`SELECT * FROM perfiles_glaukov WHERE UPPER(TRIM(nombre)) = 'FUNDDA' LIMIT 1`);
  if (resFundda.rows.length > 0) funddaData = resFundda.rows[0];

  return { 
    tasaLote, 
    socio1Data, 
    socio2Data, 
    funddaData, 
    naturaleza 
  };
}

module.exports = { cargarContextoSnapshot, obtenerLoteVigentePorFecha };
