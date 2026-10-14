/**
 * @file comprobantesController.js
 */
// 🟢 1. Importar el nombre real exportado por comprobantesQuery.js
const { obtenerComprobantesFinalPaginados } = require('../queries/comprobantesQuery');
const { eliminarComprobante } = require('../services/comprobantesBorradoService');
const { releerIA } = require('../services/comprobantesIaService');
const { liquidarComprobante, actualizarComprobante } = require('../services/comprobantesSnapshotService');

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

    // 🟢 2. Ejecutar la función correcta pasando los parámetros en un solo objeto
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
    // 🟢 3. Si algo falla en la SQL, enviar el error al navegador para verlo en F12
    return res.status(500).json({ error: err.message });
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
