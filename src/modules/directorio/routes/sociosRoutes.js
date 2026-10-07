/**
 * @file sociosRoutes.js
 * @description Enrutador HTTP atómico para la gestión de socios y directorio en glauk2.
 */
const express = require('express');
const router = express.Router();
const {
  obtenerDirectorioController,
  actualizarEstadoSocioController
} = require('../controllers/sociosController');

// Endpoints REST del directorio de socios
router.get('/', obtenerDirectorioController);
router.get('/directorio', obtenerDirectorioController);
router.patch('/estado', actualizarEstadoSocioController);

module.exports = router;
