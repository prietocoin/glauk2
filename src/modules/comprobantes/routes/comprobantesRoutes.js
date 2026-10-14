/**
 * @file comprobantesRoutes.js
 * @description Endpoints REST desacoplados para CRUD sobre la tabla comprobantes_final.
 */

const express = require('express');
const router = express.Router();
const {
  getComprobantes,
  liquidarComprobante,
  releerIA,
  updateComprobante,
  deleteComprobante
} = require('../controllers/comprobantesController');

// Lectura principal de comprobantes_final con filtros
router.get('/', getComprobantes);

// Proceso de liquidación manual / re-cálculo
router.post('/liquidar', liquidarComprobante);

// Re-lectura con IA
router.post('/:hashLargo/releer', releerIA);

// Actualización / Edición directa en comprobantes_final
router.put('/:hashLargo', updateComprobante);

// Borrado directo en comprobantes_final
router.delete('/:hashLargo', deleteComprobante);

module.exports = router;
