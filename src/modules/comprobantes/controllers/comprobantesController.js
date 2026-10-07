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
    return res.status(200).json(rows);
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
