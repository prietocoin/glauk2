/**
 * @file reportesRoutes.js
 * @description Enrutador HTTP atómico para los endpoints de reportes en glauk2.
 */
const express = require('express');
const router = express.Router();
const {
  getReportesFiltros,
  postEnviarReporteWhatsApp,
  postEnviarMediaWhatsApp
} = require('../controllers/reportesController');

router.get('/filtros', getReportesFiltros);
router.post('/enviar-whatsapp', postEnviarReporteWhatsApp);
router.post('/enviar-media', postEnviarMediaWhatsApp);

module.exports = router;
