/**
 * @file comprobantesController.js
 * @description Controlador HTTP para comprobantes: orquestador modular y lectura fiel de perfiles_glaukov.
 */
const { obtenerComprobantesCompletos } = require('../queries/comprobantesQuery');
const { eliminarComprobante } = require('../services/comprobantesBorradoService');
const { releerIA } = require('../services/comprobantesIaService');
const { liquidarComprobante, actualizarComprobante } = require('../services/comprobantesSnapshotService');
const { resolverTasasComprobante } = require('../services/comprobantesTasasService');

async function getComprobantes(req, res) {
  try {
    const { socio } = req.query;
    const rows = await obtenerComprobantesCompletos(socio);

    const comprobantesProcesados = await Promise.all(
      rows.map(async (item) => {
        // 1. RESOLUCIÓN DE SOCIOS REALES PROVENIENTES DE POSTGRESQL
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

        // 3. RESOLUCIÓN ATÓMICA DE TASAS INDIVIDUALES (T1 / T2)
        let t1 = item.tasa_1;
        let t2 = item.tasa_2;

        if (!item.esta_liquidado) {
          const resTasas = await resolverTasasComprobante(item);
          t1 = resTasas.tasa_1;
          t2 = resTasas.tasa_2;
        }

        // 4. CÁLCULO DE MONTOS: ESCALAR ABSOLUTO DIRECTO (monto / tasa)
        const numT1 = Number(t1);
        const numT2 = Number(t2);

        const m1Calculado = !isNaN(numT1) && numT1 > 0 ? Number((montoComprobante / numT1).toFixed(2)) : montoComprobante;
        const m2Calculado = !isNaN(numT2) && numT2 > 0 ? Number((montoComprobante / numT2).toFixed(2)) : montoComprobante;

        return {
          ...item,
          nombre_socio_1: s1,
          socio_1: s1,
          nombre_socio_2: s2,
          socio_2: s2,

          // MONEDAS BASE FIELES DE PERFILES_GLAUKOV
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

          // MONTOS ABSOLUTOS DE SOCIO
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
