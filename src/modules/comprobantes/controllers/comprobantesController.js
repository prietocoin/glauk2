/**
 * @file comprobantesController.js
 * @description Controlador HTTP orquestador modular para el CRUD de comprobantes_final.
 */
const { obtenerComprobantesFinalPaginados } = require('../queries/comprobantesQuery'); // 👈 Aquí estaba el error
const { eliminarComprobante } = require('../services/comprobantesBorradoService');
const { releerIA } = require('../services/comprobantesIaService');
const { liquidarComprobante, actualizarComprobante } = require('../services/comprobantesSnapshotService');

/**
 * 🟢 Lectura principal invocando la capa Query aislada
 */
async function getComprobantes(req, res) {
  try {
    const { 
      socio = '', 
      limit = 50, 
      page = 1, 
      fechaInicio = '', 
      fechaFin = '', 
      fecha_inicio = '', 
      fecha_fin = '' 
    } = req.query;

    const rows = await obtenerComprobantesFinalPaginados({
      socio,
      limit: parseInt(limit, 10) || 50,
      page: parseInt(page, 10) || 1,
      fechaInicio: fechaInicio || fecha_inicio,
      fechaFin: fechaFin || fecha_fin
    });

    return res.status(200).json(rows);
  } catch (err) {
    console.error('❌ [comprobantesController Error]:', err.message);
    return res.status(500).json({ error: err.message }); // 👈 Ya no se ocultan errores como []
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
