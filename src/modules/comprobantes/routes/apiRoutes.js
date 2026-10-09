const express = require('express');
const router = express.Router();
const { getComprobantesApi } = require('../services/comprobantesApiService');

// 🟢 DEBE SER '/' porque index.js ya le antepone '/v2/comprobantes'
router.get('/', getComprobantesApi);

module.exports = router;
