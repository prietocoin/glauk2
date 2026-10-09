/**
 * @file comprobantesController.js
 * @description Controlador HTTP para comprobantes: cálculo directo sin intermediarios y lectura fiel de perfiles_glaukov.
 */
const { obtenerComprobantesCompletos } = require('../queries/comprobantesQuery');
const { eliminarComprobante } = require('../services/comprobantesBorradoService');
const { releerIA } = require('../services/comprobantesIaService');
const { liquidarComprobante, actualizarComprobante } = require('../services/comprobantesSnapshotService');

async function obtenerTasasSocioFromHub(socio) {
  try {
    const socioQuery = socio && socio !== 'GENERAL' ? socio : 'DEFAULT';
    const baseUrl = process.env.TASASHUB_URL || 'http://127.0.0.1:3000'; 
    const response = await fetch(`${baseUrl}/api/v1/tasas/calcular/${encodeURIComponent(socioQuery)}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.warn('[comprobantesController ⚠️ TasasHub no disponible]:', err.message);
    return null;
  }
}

function extraerTasaPorMoneda(dataHub, monedaBuscada) {
  if (!dataHub) return 0;
  const mon = String(monedaBuscada || '').toUpperCase().trim();

  if (Array.isArray(dataHub.tasas)) {
    const encontrado = dataHub.tasas.find(t => String(t.moneda || t.moneda_base || '').toUpperCase().trim() === mon);
    if (encontrado) return Number(encontrado.tasa || encontrado.valor || 0);
  }

  const directo = dataHub.tasas?.[mon]?.tasa || dataHub.tasas?.[mon] || dataHub?.[mon];
  if (directo) return Number(directo.tasa || directo);

  return Number(dataHub.tasa || 0);
}

async function getComprobantes(req, res) {
  try {
    const { socio } = req.query;
    const rows = await obtenerComprobantesCompletos(socio);
    const cacheTasasSocios = {};

    const comprobantesProcesados = await Promise.all(
      rows.map(async (item) => {
        // 1. RESOLUCIÓN DE SOCIOS REALES PROVENIENTES DE LA QUERY DE POSTGRESQL
        const s1 = item.nombre_socio_1 || item.socio_1 || item.fb_socio_1 || 'GENERAL';
        const s2 = item.nombre_socio_2 || item.socio_2 || item.fb_socio_2 || 'GENERAL';

        // 2. NATURALEZA IMPERATIVA DE LA OPERACIÓN
        let naturalezaCalculada = item.tipo_op1;
        if (!item.esta_liquidado || !naturalezaCalculada || naturalezaCalculada === 'D') {
          const monComp = String(item.moneda || '').toUpperCase().trim();
          const monSocio1 = String(item.moneda_base_socio1 || 'USDT').toUpperCase().trim();

          if (monComp && monSocio1 && monComp === monSocio1) {
            naturalezaCalculada = 'A';
          } else if (monComp !== monSocio1 && monComp !== '') {
            naturalezaCalculada = 'P';
          } else {
            naturalezaCalculada = 'D';
          }
        }

        const loteFinal = item.lote_tasa || 'T063';
        const montoComprobante = Math.abs(Number(item.monto || item.monto_local || 0));
        const monedaComp = String(item.moneda || '').toUpperCase().trim();

        // 3. RESOLUCIÓN DE TASAS INDIVIDUALES DESDE TASASHUB (BLINDADA CONTRA FALSOS 1.00)
        let t1 = Number(item.tasa_1) || 1;
        let t2 = Number(item.tasa_2) || 1;

        if (!item.esta_liquidado) {
          if (!cacheTasasSocios[s1]) cacheTasasSocios[s1] = await obtenerTasasSocioFromHub(s1);
          if (!cacheTasasSocios[s2]) cacheTasasSocios[s2] = await obtenerTasasSocioFromHub(s2);
          if (!cacheTasasSocios['DEFAULT']) cacheTasasSocios['DEFAULT'] = await obtenerTasasSocioFromHub('DEFAULT');

          let tasaHubS1 = extraerTasaPorMoneda(cacheTasasSocios[s1], monedaComp);
          let tasaHubS2 = extraerTasaPorMoneda(cacheTasasSocios[s2], monedaComp);

          // Si la moneda es local (PEN, ARS, COP, VES, CLP) y la tasa dio <= 1, tomar la tasa oficial del lote general
          const esMonedaLocal = ['PEN', 'ARS', 'COP', 'VES', 'CLP', 'BRL'].includes(monedaComp);

          if (esMonedaLocal) {
            if (tasaHubS1 <= 1) {
              const tasaDefault = extraerTasaPorMoneda(cacheTasasSocios['DEFAULT'], monedaComp);
              tasaHubS1 = Number(item.tasa_1) > 1 ? Number(item.tasa_1) : (tasaDefault > 1 ? tasaDefault : 1);
            }
            if (tasaHubS2 <= 1) {
              const tasaDefault = extraerTasaPorMoneda(cacheTasasSocios['DEFAULT'], monedaComp);
              tasaHubS2 = Number(item.tasa_2) > 1 ? Number(item.tasa_2) : (tasaHubS1 > 1 ? tasaHubS1 : (tasaDefault > 1 ? tasaDefault : 1));
            }
          }

          t1 = tasaHubS1 > 0 ? tasaHubS1 : (t1 > 1 ? t1 : 1);
          t2 = tasaHubS2 > 0 ? tasaHubS2 : (t2 > 1 ? t2 : t1);
        }

        // 4. CÁLCULO DE MONTOS: ESCALAR ABSOLUTO DIRECTO (monto / tasa)
        const m1Calculado = t1 > 0 ? Number((montoComprobante / t1).toFixed(2)) : montoComprobante;
        const m2Calculado = t2 > 0 ? Number((montoComprobante / t2).toFixed(2)) : montoComprobante;

        return {
          ...item,
          // NOMBRES EXACTOS
          nombre_socio_1: s1,
          socio_1: s1,
          nombre_socio_2: s2,
          socio_2: s2,

          // MONEDAS BASE FIELES DE PERFILES_GLAUKOV (SIN FALLBACKS HARDCODEADOS)
          moneda_base_socio1: item.moneda_base_socio1 || item.moneda_socio1,
          moneda_base_socio2: item.moneda_base_socio2 || item.moneda_socio2,

          tipo_op1: naturalezaCalculada,
          tipo_manual: naturalezaCalculada,
          naturaleza: naturalezaCalculada,
          tipo_op: naturalezaCalculada,
          lote_tasa: loteFinal,
          lote_tasa_asignado: loteFinal,

          tasa_1: t1,
          tasa_2: t2,

          // MONTOS ABSOLUTOS
          monto_1: item.esta_liquidado && item.monto_1 !== null ? Math.abs(item.monto_1) : m1Calculado,
          monto_2: item.esta_liquidado && item.monto_2 !== null ? Math.abs(item.monto_2) : m2Calculado,
          m1_socio: item.esta_liquidado && item.m1_socio !== null ? Math.abs(item.m1_socio) : m1Calculado,
          m2_socio: item.esta_liquidado && item.m2_socio !== null ? Math.abs(item.m2_socio) : m2Calculado,

          // BRUTOS RAW
          me1: item.esta_liquidado && item.me1 !== null ? Math.abs(item.me1) : m1Calculado,
          me2: item.esta_liquidado && item.me2 !== null ? Math.abs(item.me2) : m2Calculado
        };
      })
    );

    return res.status(200).json(comprobantesProcesados);
  } catch (err) {
    console.error('[comprobantesController ❌ Error DB]:', err.message);
    return res.status(200).json([]);
  }
}

async function liquidarComprobanteHandler(req, res) {
  try {
    const result = await liquidarComprobante(req.body);
    return res.json({ success: true, message: 'Liquidación congelada con éxito', ...result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function releerIAHandler(req, res) {
  try {
    const hash = req.params.hashLargo || req.body.hash_largo;
    const result = await releerIA(hash);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function updateComprobanteHandler(req, res) {
  try {
    const hash = req.params.hashLargo || req.body.hash_largo;
    const result = await actualizarComprobante(hash, req.body);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function deleteComprobanteHandler(req, res) {
  try {
    const hash = req.params.hashLargo;
    const result = await eliminarComprobante(hash);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  getComprobantes,
  liquidarComprobante: liquidarComprobanteHandler,
  releerIA: releerIAHandler,
  updateComprobante: updateComprobanteHandler,
  deleteComprobante: deleteComprobanteHandler
};
