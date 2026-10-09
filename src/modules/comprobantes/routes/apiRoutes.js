/**
 * @file src/routes/comprobantesRoutes.js
 */
const express = require('express');
const router = express.Router();
const { getComprobantesApi } = require('../services/comprobantesApiService');

// 🟢 ENDPOINT PRINCIPAL
router.get('/api/comprobantes', getComprobantesApi);

// 🟢 ENDPOINT ALTERNATIVO DE V2 (Para evitar colisiones si mantienes el anterior)
router.get('/api/v2/comprobantes', getComprobantesApi);

module.exports = router;
