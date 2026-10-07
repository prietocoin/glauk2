/**
 * @file directorioRoutes.js
 * @description Enrutador HTTP atómico para el módulo de Directorio y Socios en glauk2.
 */
const express = require('express');
const router = express.Router();
const {
  getDirectorio,
  getSocios,
  postSocioConfig,
  patchSocioEstado,
  deleteSocio,
  patchDesactivarTodos,
  postGuardarVigentes,
  postRestaurarVigentes
} = require('../controllers/directorioController');

router.get('/', getDirectorio);
router.get('/socios', getSocios);
router.post('/socios/config', postSocioConfig);
router.patch('/socios/desactivar-todos', patchDesactivarTodos);
router.post('/socios/guardar-vigentes', postGuardarVigentes);
router.post('/socios/restaurar-vigentes', postRestaurarVigentes);
router.patch('/socios/:nombre/estado', patchSocioEstado);
router.delete('/:nombre', deleteSocio);

module.exports = router;
