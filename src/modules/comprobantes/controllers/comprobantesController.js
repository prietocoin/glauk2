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

    // Mapeamos y enriquecemos con la Regla Imperativa antes de responder al cliente
    const comprobantesProcesados = rows.map(item => {
      let naturalezaCalculada = item.tipo_op1;

      // Si no está liquidado o no tiene naturaleza definida
      if (!item.esta_liquidado || !naturalezaCalculada || naturalezaCalculada === 'D') {
        const monComp = String(item.moneda || '').toUpperCase().trim();
        const monSocio = String(item.moneda_base_socio1 || 'USDT').toUpperCase().trim();

        // 🔴 REGLA IMPERATIVA: Moneda Comprobante == Moneda Base Socio -> Abono ('A')
        if (monComp && monSocio && monComp === monSocio) {
          naturalezaCalculada = 'A';
        } else {
          naturalezaCalculada = 'D';
        }
      }

      return {
        ...item,
        // Inyectamos la naturaleza calculada en todas las variantes que consume el frontend
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
