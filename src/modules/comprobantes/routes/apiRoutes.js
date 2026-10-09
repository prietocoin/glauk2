/**
 * @file apiRoutes.js
 * @description Sub-enrutador para la API de comprobantes.
 */
const express = require('express');
const router = express.Router();
const { getComprobantesApi } = require('../services/comprobantesApiService');

// 🟢 UTILIZA '/' PORQUE LA BASE '/v2/comprobantes' YA LA PUSO EL index.js
router.get('/', getComprobantesApi);

module.exports = router;
