/**
 * @file comprobantesController.js
 * @description Controlador HTTP para comprobantes integrado con TasasHub Engine.
 */
const { obtenerComprobantesCompletos } = require('../queries/comprobantesQuery');
const { eliminarComprobante } = require('../services/comprobantesBorradoService');
const { releerIA } = require('../services/comprobantesIaService');
const { liquidarComprobante, actualizarComprobante } = require('../services/comprobantesSnapshotService');

// Helper para consumir TasasHub de forma ultra-segura
async function obtenerTasasSocioFromHub(socio) {
  try {
    const socioQuery = socio && socio !== 'GENERAL' ? socio : 'DEFAULT';
    // URL base de TasasHub (ajustar puerto/host si es necesario, ej: http://127.0.0.1:3000)
    const baseUrl = process.env.TASASHUB_URL || 'http://127.0.0.1:3000'; 
    const response = await fetch(`${baseUrl}/api/v1/tasas/calcular/${encodeURIComponent(socioQuery)}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.warn('[comprobantesController ⚠️ TasasHub no disponible, usando fallback]:', err.message);
    return null;
  }
}

async function getComprobantes(req, res) {
  try {
    const { socio } = req.query;
    const rows = await obtenerComprobantesCompletos(socio);

    // Cache local en memoria por petición para no sobrecargar a TasasHub
    const cacheTasasSocios = {};

    const comprobantesProcesados = await Promise.all(
      rows.map(async (item) => {
        let naturalezaCalculada = item.tipo_op1;

        // 1. RESOLUCIÓN DE NATURALEZA IMPERATIVA
        if (!item.esta_liquidado || !naturalezaCalculada || naturalezaCalculada === 'D') {
          const monComp = String(item.moneda || '').toUpperCase().trim();
          const monSocio = String(item.moneda_base_socio1 || 'USDT').toUpperCase().trim();

          if (monComp && monSocio && monComp === monSocio) {
            naturalezaCalculada = 'A';
          } else if (monComp !== monSocio && monComp !== '') {
            naturalezaCalculada = 'P';
          } else {
            naturalezaCalculada = 'D';
          }
        }

        // 2. RESOLUCIÓN DE TASAS CON TASASHUB
        let t1 = Number(item.tasa_1) || 1;
        let t2 = Number(item.tasa_2) || 1;
        const loteFinal = item.lote_tasa || 'T064';

        if (!item.esta_liquidado) {
          const nombreSocio = item.nombre_socio_1 || 'GENERAL';
          const monedaComp = String(item.moneda || '').toUpperCase().trim();
          const monedaBaseSocio = String(item.moneda_base_socio1 || 'USDT').toUpperCase().trim();

          if (monedaComp === monedaBaseSocio) {
            t1 = 1.0;
            t2 = 1.0;
          } else {
            // Consultamos TasasHub (usando caché para el mismo socio)
            if (!cacheTasasSocios[nombreSocio]) {
              cacheTasasSocios[nombreSocio] = await obtenerTasasSocioFromHub(nombreSocio);
            }
            const dataTasas = cacheTasasSocios[nombreSocio];

            // Extraemos la tasa asignada a la moneda (o fallback a 1.0)
            if (dataTasas && dataTasas.tasas && dataTasas.tasas[monedaComp]) {
              t1 = Number(dataTasas.tasas[monedaComp].tasa || dataTasas.tasas[monedaComp]) || t1;
            } else if (dataTasas && dataTasas[monedaComp]) {
              t1 = Number(dataTasas[monedaComp]) || t1;
            }
            t2 = t1;
          }
        }

        // 3. CÁLCULO DE MONTOS EQUIVALENTES (ME1 / ME2)
        const montoLocal = Number(item.monto || 0);
        const me1Calculado = t1 > 0 ? Number((montoLocal / t1).toFixed(2)) : montoLocal;
        const me2Calculado = t2 > 0 ? Number((montoLocal / t2).toFixed(2)) : montoLocal;

        return {
          ...item,
          tipo_op1: naturalezaCalculada,
          tipo_manual: naturalezaCalculada,
          naturaleza: naturalezaCalculada,
          tipo_op: naturalezaCalculada,
          lote_tasa: loteFinal,
          lote_tasa_asignado: loteFinal,
          tasa_1: t1,
          tasa_2: t2,
          me1: item.esta_liquidado && item.me1 ? item.me1 : me1Calculado,
          me2: item.esta_liquidado && item.me2 ? item.me2 : me2Calculado
        };
      })
    );

    return res.status(200).json(comprobantesProcesados);
  } catch (err) {
    console.error('[comprobantesController ❌ Error DB]:', err.message);
    return res.status(200).json([]);
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
