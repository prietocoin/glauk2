/**
 * @file adminController.js
 * @description Controlador de administración atómico para inspección y gestión de la cola en glauk2.
 */
const db = require('#config/database');
/**
 * Obtiene los últimos 50 registros de la cola de notificaciones.
 */
async function getColaAdmin(req, res) {
  try {
    const { rows } = await db.query(
      'SELECT * FROM notificaciones_tasas ORDER BY created_at DESC LIMIT 50;'
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[adminController ❌ Error al obtener cola]:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Actualiza el estado de un registro específico en la cola.
 */
async function updateColaAdmin(req, res) {
  try {
    const { hashLargo } = req.params;
    const { estado } = req.body;

    if (!hashLargo) {
      return res.status(400).json({ success: false, error: 'Identificador no especificado' });
    }

    await db.query(
      'UPDATE notificaciones_tasas SET estado = $1, updated_at = NOW() WHERE id_tasa = $2;',
      [estado || 'PENDIENTE', hashLargo]
    );

    return res.json({ success: true, message: `Registro ${hashLargo} actualizado.` });
  } catch (err) {
    console.error('[adminController ❌ Error al actualizar cola]:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Elimina un registro de la cola de notificaciones por ID/Hash.
 */
async function deleteColaAdmin(req, res) {
  try {
    const { hashLargo } = req.params;
    if (!hashLargo) {
      return res.status(400).json({ success: false, error: 'Identificador no especificado' });
    }

    await db.query('DELETE FROM notificaciones_tasas WHERE id_tasa = $1;', [hashLargo]);
    return res.json({ success: true, message: 'Registro eliminado correctamente.' });
  } catch (err) {
    console.error('[adminController ❌ Error al eliminar de la cola]:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  getColaAdmin,
  updateColaAdmin,
  deleteColaAdmin
};
