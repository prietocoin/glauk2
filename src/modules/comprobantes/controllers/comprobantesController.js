/**
 * @file comprobantesController.js
 * @description Controlador HTTP atómico para el módulo de comprobantes.
 */
const { obtenerComprobantesCompletos } = require('../queries/comprobantesQuery');
const { eliminarComprobante } = require('../services/comprobantesBorradoService');
const { releerIA } = require('../services/comprobantesIaService');
const { liquidarComprobante, actualizarComprobante } = require('../services/comprobantesSnapshotService');

async function getComprobantes(req, res) {
  try {
    const { socio } = req.query;
    const rows = await obtenerComprobantesCompletos(socio);

    // Mapeo síncrono ultra-seguro (sin llamadas asíncronas dentro del loop)
    const comprobantesProcesados = rows.map(item => {
      let naturalezaCalculada = item.tipo_op1;

      if (!item.esta_liquidado || !naturalezaCalculada || naturalezaCalculada === 'D') {
        const monComp = String(item.moneda || '').toUpperCase().trim();
        const monSocio = String(item.moneda_base_socio1 || 'USDT').toUpperCase().trim();

        // 1. REGLA IMPERATIVA: Misma moneda -> Abono ('A')
        if (monComp && monSocio && monComp === monSocio) {
          naturalezaCalculada = 'A';
        } 
        // 2. REGLA POR DEFECTO PARA DISTINTA MONEDA: Pago ('P')
        else if (monComp !== monSocio && monComp !== '') {
          naturalezaCalculada = 'P';
        } else {
          naturalezaCalculada = 'D';
        }
      }

      return {
        ...item,
        tipo_op1: naturalezaCalculada,
        tipo_manual: naturalezaCalculada,
        naturaleza: naturalezaCalculada,
        tipo_op: naturalezaCalculada
      };
    });

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
// En getComprobantes dentro de comprobantesController.js:

const comprobantesProcesados = rows.map(item => {
  let naturalezaCalculada = item.tipo_op1;

  if (!item.esta_liquidado || !naturalezaCalculada || naturalezaCalculada === 'D') {
    const monComp = String(item.moneda || '').toUpperCase().trim();
    const monSocio = String(item.moneda_base_socio1 || 'USDT').toUpperCase().trim();

    if (monComp && monSocio && monComp === monSocio) {
      naturalezaCalculada = 'A';
    } else if (monComp !== monSocio && monComp !== '') {
      naturalezaCalculada = 'P';
    } else {
      naturalezaCalculada = 'D';
    }
  }

  const loteResuelto = item.lote_tasa || 'T052';

  return {
    ...item,
    tipo_op1: naturalezaCalculada,
    tipo_manual: naturalezaCalculada,
    naturaleza: naturalezaCalculada,
    tipo_op: naturalezaCalculada,
    lote_tasa: loteResuelto,
    lote_tasa_asignado: loteResuelto
  };
});
