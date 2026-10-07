/**
 * @file tasasBorrador.service.js
 * @description Gestión de borradores en memoria y consulta externa a la API HOO/Render.
 */
const { obtenerUltimasTasas } = require('./tasasQuery.service');

let borradorTasas = {};

function guardarBorradorTasas(payload) {
  let data = payload;
  if (Array.isArray(data)) data = data[0] || {};
  borradorTasas = data.json?.rates || data.rates || data;
  return borradorTasas;
}

function obtenerBorradorTasas() {
  return (borradorTasas && Object.keys(borradorTasas).length > 0) ? borradorTasas : null;
}

async function consultarApiHoo() {
  const urlHoo = process.env.HOO_API_URL;
  if (urlHoo) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(urlHoo, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        let rates = json.rates || json.tasas || json.data || json;
        if (Array.isArray(rates)) rates = rates[0]?.rates || rates[0] || {};
        if (rates && Object.keys(rates).length > 0) return (borradorTasas = rates);
      }
    } catch (err) {
      console.warn('⚠️ [TasasBorrador] Falló consulta a HOO_API_URL:', err.message);
    }
  }
  const borrador = obtenerBorradorTasas();
  if (borrador) return borrador;

  const ultimas = await obtenerUltimasTasas();
  return ultimas.tasas || {};
}

module.exports = { guardarBorradorTasas, obtenerBorradorTasas, consultarApiHoo };
