/**
 * @file comprobantesController.js
 * @description Controlador HTTP orquestador modular para el CRUD de comprobantes_final.
 */

// 🟢 Asegúrate de importar la función correcta que definimos para la V2
const { obtenerComprobantesFinalPaginados } = require('../queries/comprobantesQuery');
const { eliminarComprobante } = require('../services/comprobantesBorradoService');
const { releerIA } = require('../services/comprobantesIaService');
const { liquidarComprobante, actualizarComprobante } = require('../services/comprobantesSnapshotService');

/**
 * 🟢 Lectura principal invocando la capa Query aislada (SSoT)
 */
async function getComprobantes(req, res) {
  try {
    // Extraemos todos los posibles nombres de parámetros (camelCase y snake_case)
    const { 
      socio, 
      limit, 
      page, 
      fechaInicio, 
      fechaFin, 
      fecha_inicio, 
      fecha_fin 
    } = req.query;
    
    // Delegación directa a la capa Query de la V2
    const rows = await obtenerComprobantesFinalPaginados({ 
      socio, 
      limit, 
      page, 
      fechaInicio: fechaInicio || fecha_inicio, 
      fechaFin: fechaFin || fecha_fin 
    });

    // Sanitización liviana en memoria (asegurar números y manejar "N/A")
    const comprobantesLimpios = rows.map((item) => {
      const numT1 = (item.tasa_1 === 'N/A' || isNaN(item.tasa_1) || item.tasa_1 === null) ? 0 : Number(item.tasa_1);
      const numT2 = (item.tasa_2 === 'N/A' || isNaN(item.tasa_2) || item.tasa_2 === null) ? 0 : Number(item.tasa_2);

      return {
        ...item,
        tasa_1: numT1,
        tasa_2: numT2,
        monto_1: Number(item.monto_1 ?? item.m1_socio ?? 0),
        monto_2: Number(item.monto_2 ?? item.m2_socio ?? 0),
        m1_socio: Number(item.m1_socio ?? item.monto_1 ?? 0),
        m2_socio: Number(item.m2_socio ?? item.monto_2 ?? 0)
      };
    });

    return res.status(200).json(comprobantesLimpios);
  } catch (err) {
    console.error('[comprobantesController ❌ Error]:', err.message);
    // Devolvemos 500 en lugar de 200 con un array vacío para no esconder el error en la red.
    return res.status(500).json({ success: false, error: 'Error al consultar comprobantes.' });
  }
}

async function liquidarComprobanteHandler(req, res) {
  try {
    const result = await liquidarComprobante(req.body);
    return res.json({ success: true, message: 'Liquidación congelada con éxito', ...result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function releerIAHandler(req, res) {
  try {
    const hash = req.params.hashLargo || req.body.hash_largo;
    const result = await releerIA(hash);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function updateComprobanteHandler(req, res) {
  try {
    const hash = req.params.hashLargo || req.body.hash_largo;
    const result = await actualizarComprobante(hash, req.body);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function deleteComprobanteHandler(req, res) {
  try {
    const hash = req.params.hashLargo;
    const result = await eliminarComprobante(hash);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  getComprobantes,
  liquidarComprobante: liquidarComprobanteHandler,
  releerIA: releerIAHandler,
  updateComprobante: updateComprobanteHandler,
  deleteComprobante: deleteComprobanteHandler
};
