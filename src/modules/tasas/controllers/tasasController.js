/**
 * @file tasasController.js
 * @description Controlador HTTP atómico para el flujo y notificaciones de tasas en glauk2.
 */
const { obtenerNotificacionActual, crearNotificacionTasa } = require('../services/tasasNotificacion.service');

async function obtenerTasaActualController(req, res) {
  try {
    const data = await obtenerNotificacionActual();
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[tasasController ❌ Error al obtener tasa]:', err.message);
    return res.status(200).json({ success: true, data: [] });
  }
}

async function publicarYDespacharTasaController(req, res) {
  try {
    const { tasa } = req.body;
    if (!tasa) {
      return res.status(400).json({ success: false, error: 'El parámetro tasa es requerido.' });
    }

    await crearNotificacionTasa(tasa);
    return res.status(200).json({ success: true, message: 'Flujo activado correctamente' });
  } catch (err) {
    console.error('[tasasController ❌ Error al publicar tasa]:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  obtenerTasaActualController,
  publicarYDespacharTasaController
};
