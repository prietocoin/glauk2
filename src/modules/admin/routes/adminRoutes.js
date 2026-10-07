/**
 * @file adminRoutes.js
 * @description Rutas de administración para inspección y gestión de la cola.
 */

const express = require('express');
const router = express.Router();
const {
  getColaAdmin,
  updateColaAdmin,
  deleteColaAdmin
} = require('../controllers/adminController');

// Enrutamiento de la cola administrativa
router.get('/cola', getColaAdmin);
router.put('/cola/:hashLargo', updateColaAdmin);
router.delete('/cola/:hashLargo', deleteColaAdmin);

module.exports = router;
