const express = require('express');
const router = express.Router();
const { getComprobantesApi } = require('../services/comprobantesApiService');

// 🟢 Responder SOLO JSON
router.get('/', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  getComprobantesApi(req, res, next);
});

module.exports = router;
