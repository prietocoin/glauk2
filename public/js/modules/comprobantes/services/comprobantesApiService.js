/**
 * @file comprobantesApiService.js
 * @description Servicio unificado atómico para la API de comprobantes.
 * Realiza la resolución determinista de tasas T1 y T2 desde TasasHub y PostgreSQL.
 */

const db = require('../../../config/db');

const TASASHUB_BASE_URL = process.env.TASASHUB_URL || 'https://automat-tasashub.fyi6ur.easypanel.host/api/v1/tasas/calcular';
const REMITHUB_BASE_URL = process.env.REMITHUB_URL || 'https://automat-remithub.fyi6ur.easypanel.host/api/comprobantes';

/**
 * Consulta el perfil completo de un socio en perfiles_glaukov.
 */
async function obtenerPerfilSocio(nombreSocio) {
  if (!nombreSocio || nombreSocio === 'GENERAL' || nombreSocio === 'NO DEFINIDO') return null;

  try {
    const query = `
      SELECT nombre, id_grupo, moneda_base, monedas 
      FROM perfiles_glaukov 
      WHERE UPPER(TRIM(nombre)) = UPPER(TRIM($1)) 
      LIMIT 1;
    `;
    const { rows } = await db.query(query, [nombreSocio]);
    if (!rows[0]) return null;

    const perfil = rows[0];
    // Asegurar que 'monedas' sea un objeto válido
    if (typeof perfil.monedas === 'string') {
      try {
        perfil.monedas = JSON.parse(perfil.monedas);
      } catch (e) {
        perfil.monedas = {};
      }
    }
    return perfil;
  } catch (err) {
    console.warn(`[comprobantesApiService ⚠️ DB Perfil Error para ${nombreSocio}]:`, err.message);
    return null;
  }
}

/**
 * Consulta el lote de cotización en tasas_glaukov para cálculo de equivalentes (ME).
 */
async function obtenerLoteTasasGlaukov(idLote) {
  if (!idLote) return null;

  try {
    const query = `
      SELECT id_tasa, tasas, fecha 
      FROM tasas_glaukov 
      WHERE UPPER(TRIM(id_tasa)) = UPPER(TRIM($1)) 
      LIMIT 1;
    `;
    const { rows } = await db.query(query, [idLote]);
    if (!rows[0]) return null;

    const loteObj = rows[0];
    if (typeof loteObj.tasas === 'string') {
      try {
        loteObj.tasas = JSON.parse(loteObj.tasas);
      } catch (e) {
        loteObj.tasas = {};
      }
    }
    return loteObj;
  } catch (err) {
    console.warn(`[comprobantesApiService ⚠️ DB Lote Error para ${idLote}]:`, err.message);
    return null;
  }
}

/**
 * Consulta las tarjetas de un socio a TasasHub pasando explícitamente el lote.
 */
async function consultarTasasHub(socio, lote) {
  if (!socio || socio === 'GENERAL' || socio === 'NO DEFINIDO') return null;

  try {
    const socioQuery = encodeURIComponent(String(socio).trim());
    const loteQuery = lote ? `?lote=${encodeURIComponent(String(lote).trim())}` : '';
    const url = `${TASASHUB_BASE_URL}/${socioQuery}${loteQuery}`;

    const response = await fetch(url);
    if (!response.ok) return null;

    return await response.json();
  } catch (err) {
    console.warn(`[comprobantesApiService ⚠️ Error TasasHub socio: ${socio}]:`, err.message);
    return null;
  }
}

/**
 * Extrae la tasa exacta (compra o venta) del objeto tarjetas_paises de TasasHub.
 */
function extraerTasaHub(dataHub, monedaComprobante, naturaleza) {
  if (!dataHub || !Array.isArray(dataHub.tarjetas_paises)) return 'N/A';

  const mon = String(monedaComprobante || '').trim().toUpperCase();
  const nat = String(naturaleza || '').trim().toUpperCase();

  const tarjeta = dataHub.tarjetas_paises.find(
    (t) => String(t.code || '').trim().toUpperCase() === mon
  );

  if (!tarjeta) return 'N/A';

  if (nat === 'D') {
    const val = Number(tarjeta.compra);
    return !isNaN(val) && val > 0 ? val : 'N/A';
  }

  if (nat === 'P') {
    const val = Number(tarjeta.venta);
    return !isNaN(val) && val > 0 ? val : 'N/A';
  }

  return 'N/A';
}

/**
 * Procesa un registro individual de comprobante de forma atómica.
 */
async function procesarComprobanteAtomi(item) {
  const lote = String(item.lote_tasa || item.lote_tasa_asignado || item.id_tasa || 'T001').trim();
  const monto = Math.abs(Number(item.monto || item.monto_local || 0));
  const moneda = String(item.moneda || item.moneda_local || '').trim().toUpperCase();

  const rawS1 = item.grupo_raw_1 || item.nombre_socio_1 || item.socio_1 || 'GENERAL';
  const rawS2 = item.grupo_raw_2 || item.nombre_socio_2 || item.socio_2 || 'GENERAL';

  // Consultas en paralelo a DB y TasasHub
  const [perfil1, perfil2, loteGlaukov, dataHub1, dataHub2] = await Promise.all([
    obtenerPerfilSocio(rawS1),
    obtenerPerfilSocio(rawS2),
    obtenerLoteTasasGlaukov(lote),
    consultarTasasHub(rawS1, lote),
    consultarTasasHub(rawS2, lote)
  ]);

  const nombreS1 = perfil1?.nombre || rawS1;
  const nombreS2 = perfil2?.nombre || rawS2;

  const monBase1 = String(perfil1?.moneda_base || item.moneda_base_socio1 || 'USDT').trim().toUpperCase();
  const monBase2 = String(perfil2?.moneda_base || item.moneda_base_socio2 || 'USDT').trim().toUpperCase();

  // 1. Regla para Determinación de Tipo / Naturaleza (A, D, P)
  let tipoCalculado = item.tipo || item.tipo_op1 || item.naturaleza;

  if (!tipoCalculado || tipoCalculado === 'D') {
    if (moneda && monBase1 && moneda === monBase1) {
      tipoCalculado = 'A';
    } else if (perfil1?.monedas?.[moneda]?.tipo) {
      tipoCalculado = perfil1.monedas[moneda].tipo;
    } else if (moneda !== monBase1 && moneda !== '') {
      tipoCalculado = 'P';
    } else {
      tipoCalculado = 'D';
    }
  }

  // 2. Resolución Determinista de Tasas (T1 / T2)
  let tasa1 = 'N/A';
  if (tipoCalculado === 'A' || (monBase1 && moneda && monBase1 === moneda)) {
    tasa1 = 1.00;
  } else {
    tasa1 = extraerTasaHub(dataHub1, moneda, tipoCalculado);
  }

  let tasa2 = 'N/A';
  if (tipoCalculado === 'A' || (monBase2 && moneda && monBase2 === moneda)) {
    tasa2 = 1.00;
  } else {
    tasa2 = extraerTasaHub(dataHub2, moneda, tipoCalculado);
  }

  // 3. Montos calculados
  const numT1 = Number(tasa1);
  const numT2 = Number(tasa2);

  const monto1 = !isNaN(numT1) && numT1 > 0 ? Number((monto / numT1).toFixed(2)) : monto;
  const monto2 = !isNaN(numT2) && numT2 > 0 ? Number((monto / numT2).toFixed(2)) : monto;

  // 4. Equivalentes ME1 / ME2 desde tasas_glaukov
  const tasaMeBase = Number(loteGlaukov?.tasas?.[moneda] || 1);
  const me1 = tasaMeBase > 0 ? Number((monto / tasaMeBase).toFixed(2)) : monto1;
  const me2 = tasaMeBase > 0 ? Number((monto / tasaMeBase).toFixed(2)) : monto2;

  // 5. Polaridades
  const polaridad1 = perfil1?.monedas?.[moneda]?.polaridad || '+';
  const polaridad2 = perfil2?.monedas?.[moneda]?.polaridad || '+';

  return {
    comprobante: {
      lote,
      monto,
      moneda,
      banco: item.banco || item.entidad || '',
      titular: item.titular || item.nombre_titular || '',
      referencia: item.referencia || item.ref || '',
      tipo: tipoCalculado,
      link_img: item.url_r2_comprobante || item.link_img || item.url_imagen || '',
      grupo_1: {
        nombre_1: nombreS1,
        tasa_1: tasa1,
        polaridad_1: polaridad1,
        monto_1: monto1,
        moneda_base_1: monBase1,
        me_1: me1
      },
      grupo_2: {
        nombre_2: nombreS2,
        tasa_2: tasa2,
        polaridad_2: polaridad2,
        monto_2: monto2,
        moneda_base_2: monBase2,
        me_2: me2
      }
    }
  };
}

/**
 * Handler HTTP principal para la API.
 */
async function getComprobantesApi(req, res) {
  try {
    let comprobantesRaw = [];

    // Query flexible sin asumir columna ID
    try {
      const { rows } = await db.query('SELECT * FROM comprobantes LIMIT 50');
      if (rows && rows.length > 0) comprobantesRaw = rows;
    } catch (e) {
      // Fallback seguro a RemitHub API si la DB local no responde
      const responseRemit = await fetch(REMITHUB_BASE_URL);
      if (responseRemit.ok) {
        comprobantesRaw = await responseRemit.json();
      }
    }

    const listaData = Array.isArray(comprobantesRaw) ? comprobantesRaw : [comprobantesRaw];

    const resultadoJSON = await Promise.all(
      listaData.map((item) => procesarComprobanteAtomi(item))
    );

    return res.status(200).json(resultadoJSON);
  } catch (err) {
    console.error('[comprobantesApiService ❌ Error Global]:', err);
    return res.status(500).json({ error: 'Error al procesar la API de comprobantes', detalle: err.message });
  }
}

module.exports = {
  getComprobantesApi,
  procesarComprobanteAtomi
};
