/**
 * @file comprobantesController.js
 * @description Controlador HTTP sin lógica cruzada: directo monto / tasa_socio.
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

async function getComprobantes(req, res) {
  try {
    const { socio } = req.query;
    const rows = await obtenerComprobantesCompletos(socio);
    const cacheTasasSocios = {};

    const comprobantesProcesados = await Promise.all(
      rows.map(async (item) => {
        // 1. NATURALEZA DEL COMPROBANTE
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
        const montoComprobante = Number(item.monto || 0);

        // 2. OBTENER TASAS DIRECTAS DE CADA SOCIO
        let t1 = Number(item.tasa_1) || 1;
        let t2 = Number(item.tasa_2) || 1;

        if (!item.esta_liquidado) {
          const s1 = item.nombre_socio_1 || 'GENERAL';
          const s2 = item.nombre_socio_2 || 'GENERAL';

          if (!cacheTasasSocios[s1]) {
            cacheTasasSocios[s1] = await obtenerTasasSocioFromHub(s1);
          }
          if (!cacheTasasSocios[s2]) {
            cacheTasasSocios[s2] = await obtenerTasasSocioFromHub(s2);
          }

          const dataS1 = cacheTasasSocios[s1];
          const dataS2 = cacheTasasSocios[s2];

          if (dataS1) {
            const val1 = Number(dataS1?.tasa || dataS1?.tasas?.[item.moneda]?.tasa || dataS1?.[item.moneda] || 0);
            if (val1 > 0) t1 = val1;
          }

          if (dataS2) {
            const val2 = Number(dataS2?.tasa || dataS2?.tasas?.[item.moneda]?.tasa || dataS2?.[item.moneda] || 0);
            if (val2 > 0) t2 = val2;
          }
        }

        // 3. FÓRMULA DIRECTA Y LIMPIA: monto_comprobante / tasa_socio
        const m1Calculado = t1 > 0 ? Number((montoComprobante / t1).toFixed(2)) : montoComprobante;
        const m2Calculado = t2 > 0 ? Number((montoComprobante / t2).toFixed(2)) : montoComprobante;

        // 4. ME1 y ME2 SON LOS MONTOS EN RAW
        const me1Calculado = m1Calculado;
        const me2Calculado = m2Calculado;

        return {
          ...item,
          tipo_op1: naturalezaCalculada,
          tipo_manual: naturalezaCalculada,
          naturaleza: naturalezaCalculada,
          tipo_op: naturalezaCalculada,
          lote_tasa: loteFinal,
          lote_tasa_asignado: loteFinal,

          tasa_1: t1,
          tasa_2: t2,

          // MONTO NETO DE CADA SOCIO
          monto_1: item.esta_liquidado && item.monto_1 !== null ? item.monto_1 : m1Calculado,
          monto_2: item.esta_liquidado && item.monto_2 !== null ? item.monto_2 : m2Calculado,

          // BRUTOS RAW
          me1: item.esta_liquidado && item.me1 !== null ? item.me1 : me1Calculado,
          me2: item.esta_liquidado && item.me2 !== null ? item.me2 : me2Calculado
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
