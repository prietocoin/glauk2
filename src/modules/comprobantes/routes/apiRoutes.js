const express = require('express');
const router = express.Router();
const { getComprobantesApi } = require('../services/comprobantesApiService');

// 🟢 Al estar montado en /v2/comprobantes desde el index.js, la ruta raíz '/' responde al GET completo
router.get('/', getComprobantesApi);

module.exports = router;
