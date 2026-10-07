/**
 * @file sociosController.js
 * @description Manejador HTTP atómico para la consulta de directorio y cambio de estado de socios.
 */
const { obtenerDirectorio } = require('../services/directorioQuery.service');
const { cambiarEstadoSocio } = require('../services/socioEstado.service');

async function obtenerDirectorioController(req, res) {
  try {
    const directorio = await obtenerDirectorio();
    return res.status(200).json(directorio);
  } catch (err) {
    console.error('[sociosController ❌]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function actualizarEstadoSocioController(req, res) {
  try {
    const { nombre, activo } = req.body;
    if (!nombre) return res.status(400).json({ success: false, error: 'Nombre de socio requerido' });

    const resultado = await cambiarEstadoSocio(nombre, activo);
    return res.status(200).json({ success: true, data: resultado });
  } catch (err) {
    console.error('[sociosController ❌]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  obtenerDirectorioController,
  actualizarEstadoSocioController
};
