/**
 * @file reportesController.js
 * @description Controlador HTTP atómico para la gestión y despacho de reportes en glauk2.
 */
const { obtenerFiltrosReportes } = require('../queries/reporteFiltrosQuery');
const { enviarReporteWhatsApp } = require('../services/reporteWhatsappService');
const { enviarMediaWhatsApp } = require('../services/reporteMediaService');

async function getReportesFiltros(req, res) {
  try {
    const { rol } = req.query;
    const filtros = await obtenerFiltrosReportes(rol);
    return res.status(200).json({ success: true, filtros });
  } catch (err) {
    console.error('[reportesController ❌ Error en filtros]:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function postEnviarReporteWhatsApp(req, res) {
  try {
    const resultado = await enviarReporteWhatsApp(req.body);
    return res.status(200).json({ success: true, ...resultado });
  } catch (err) {
    console.error('[reportesController ❌ Error envio reporte WA]:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function postEnviarMediaWhatsApp(req, res) {
  try {
    const resultado = await enviarMediaWhatsApp(req.body);
    return res.status(200).json({ success: true, ...resultado });
  } catch (err) {
    console.error('[reportesController ❌ Error envio media WA]:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  getReportesFiltros,
  postEnviarReporteWhatsApp,
  postEnviarMediaWhatsApp
};
