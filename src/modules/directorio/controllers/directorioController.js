/**
 * @file directorioController.js
 * @description Controlador HTTP atómico para la gestión del directorio de socios en glauk2.
 */
const directorioService = require('#modules/directorio/services/directorio.service');

async function getDirectorio(req, res) {
  try {
    const data = await directorioService.obtenerDirectorio();
    return res.status(200).json(data || []);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function getSocios(req, res) {
  try {
    const socios = await directorioService.obtenerListaSocios();
    return res.status(200).json(socios || []);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function postSocioConfig(req, res) {
  try {
    const socio = await directorioService.guardarConfigSocio(req.body);
    return res.status(200).json({ success: true, data: socio });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function patchSocioEstado(req, res) {
  try {
    const { nombre } = req.params;
    const { activo } = req.body;
    const socio = await directorioService.cambiarEstadoSocio(nombre, activo);
    return res.status(200).json({ success: true, data: socio });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function deleteSocio(req, res) {
  try {
    const { nombre } = req.params;
    const resultado = await directorioService.eliminarSocio(nombre);
    return res.status(200).json(resultado);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function patchDesactivarTodos(req, res) {
  try {
    await directorioService.desactivarTodosSocios();
    return res.status(200).json({ success: true, message: 'Todos los socios desactivados.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function postGuardarVigentes(req, res) {
  try {
    await directorioService.guardarSociosVigentes();
    return res.status(200).json({ success: true, message: 'Plantilla memorizada.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function postRestaurarVigentes(req, res) {
  try {
    await directorioService.restaurarSociosVigentes();
    return res.status(200).json({ success: true, message: 'Socios vigentes restaurados.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  getDirectorio,
  getSocios,
  postSocioConfig,
  patchSocioEstado,
  deleteSocio,
  patchDesactivarTodos,
  postGuardarVigentes,
  postRestaurarVigentes
};
