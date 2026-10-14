/**
 * @file comprobantesPerfilService.js
 * @description Carga de perfiles de socios (por JID) y resolución atómica de Naturaleza + Tasas para snapshots.
 */
const db = require('#config/database');

/**
 * Busca la tasa/lote más próximo anterior o igual a la fecha del primer impacto.
 * Retorna objeto de tasa o null si no existe.
 */
async function obtenerLoteVigentePorFecha(moneda, timestampMsg) {
  try {
    if (!moneda) return null;
    
    // Convertir Unix timestamp (segundos) o cadena ISO a Date
    const fechaImpacto = timestampMsg 
      ? (!isNaN(timestampMsg) ? new Date(Number(timestampMsg) * 1000) : new Date(timestampMsg))
      : new Date();

    const res = await db.query(
      `SELECT * FROM tasas_glaukov 
       WHERE UPPER(TRIM(moneda)) = UPPER(TRIM($1)) 
         AND creado_en <= $2 
       ORDER BY creado_en DESC 
       LIMIT 1`,
      [String(moneda).trim(), fechaImpacto]
    );

    const row = res.rows[0];
    if (row) {
      // Saneamiento atómico de tasa contra valores N/A
      const numTasa = (row.tasa === 'N/A' || isNaN(row.tasa) || row.tasa === null) ? 0 : parseFloat(row.tasa);
      return { ...row, tasa: numTasa };
    }

    return null;
  } catch (e) {
    console.warn(`⚠️ [comprobantesPerfilService] Error buscando lote vigente para ${moneda}:`, e.message);
    return null;
  }
}

/**
 * Carga el contexto completo del comprobante cruzando por JID y Moneda.
 */
async function cargarContextoSnapshot(grupoRaw1, usuarioRaw1, grupoRaw2, usuarioRaw2, moneda, timestampMsg) {
  try {
    // 1. RESOLUCIÓN DE LOTE Y TASA VIGENTE POR FECHA IMPACTO
    const tasaLote = await obtenerLoteVigentePorFecha(moneda, timestampMsg);

    // 2. BÚSQUEDA SOCIO 1 POR JID
    let socio1Data = { nombre: 'GENERAL', moneda_base: 'USDT' };
    if (grupoRaw1 || usuarioRaw1) {
      const res1 = await db.query(
        `SELECT * FROM perfiles_glaukov 
         WHERE (jid_grupo IS NOT NULL AND TRIM(jid_grupo) = TRIM($1)) 
            OR (jid_usuario IS NOT NULL AND TRIM(jid_usuario) = TRIM($2)) 
         LIMIT 1`,
        [grupoRaw1 || '', usuarioRaw1 || '']
      );
      if (res1.rows.length > 0) socio1Data = res1.rows[0];
    }

    // 3. BÚSQUEDA SOCIO 2 POR JID (Contraparte)
    let socio2Data = { nombre: 'GENERAL', moneda_base: 'USDT' };
    if (grupoRaw2 || usuarioRaw2) {
      const res2 = await db.query(
        `SELECT * FROM perfiles_glaukov 
         WHERE (jid_grupo IS NOT NULL AND TRIM(jid_grupo) = TRIM($1)) 
            OR (jid_usuario IS NOT NULL AND TRIM(jid_usuario) = TRIM($2)) 
         LIMIT 1`,
        [grupoRaw2 || '', usuarioRaw2 || '']
      );
      if (res2.rows.length > 0) socio2Data = res2.rows[0];
    }

    // 4. EXTRAER NATURALEZA ATÓMICA DE LA OPERACIÓN
    const monedaCompUpper = String(moneda || '').toUpperCase().trim();
    const monedaBaseSocioUpper = String(socio1Data.moneda_base || 'USDT').toUpperCase().trim();

    let naturaleza = 'D'; // Fallback por defecto

    if (monedaCompUpper && monedaBaseSocioUpper) {
      if (monedaCompUpper === monedaBaseSocioUpper) {
        naturaleza = 'A'; // Abono
      } else {
        // Evaluación por matriz de perfiles o regla de permuta
        const reglasMoneda = socio1Data.monedas || {};
        const reglaEspecifica = reglasMoneda[monedaCompUpper] || {};
        naturaleza = reglaEspecifica.naturaleza || 'P'; // Pago / Permuta
      }
    }

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
  } catch (err) {
    console.error('[comprobantesPerfilService ❌ Error en cargarContextoSnapshot]:', err.message);
    return {
      tasaLote: null,
      socio1Data: { nombre: 'GENERAL', moneda_base: 'USDT' },
      socio2Data: { nombre: 'GENERAL', moneda_base: 'USDT' },
      funddaData: null,
      naturaleza: 'D'
    };
  }
}

module.exports = { cargarContextoSnapshot, obtenerLoteVigentePorFecha };
