const express = require('express');
const router = express.Router();
const { getComprobantesApi } = require('../services/comprobantesApiService');

// 🟢 Declaración limpia de la ruta
router.get('/api/v2/comprobantes', getComprobantesApi);

module.exports = router;
