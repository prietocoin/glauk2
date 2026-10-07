/**
 * @file tasasRoutes.js
 * @description Enrutador HTTP atómico para el dominio de tasas en glauk2.
 */
const express = require('express');
const router = express.Router();
const {
  obtenerTasaActualController,
  publicarYDespacharTasaController
} = require('../controllers/tasasController');

// Lectura de tasa actual con aliases de retrocompatibilidad
router.get('/', obtenerTasaActualController);
router.get('/actual', obtenerTasaActualController);
router.get('/mercado', obtenerTasaActualController);
router.get('/ultimas', obtenerTasaActualController);

// Publicación y despacho
router.post('/publicar', publicarYDespacharTasaController);

module.exports = router;
