/**
 * @file snapshotMath.utils.js
 * @description Utilidades matemáticas y auxiliares para el cálculo de snapshots de comprobantes.
 */
const { aplicarReglaPrecisionTasa, aplicarPrecisionMonto } = require('../../../utils/formatters');

function truncarTasaSegura(valor) {
  const num = Math.abs(parseFloat(valor) || 0);
  if (num === 0) return 1.0;
  try {
    const valFormateado = aplicarReglaPrecisionTasa(num);
    const res = parseFloat(String(valFormateado).replace(/,/g, ''));
    if (!isNaN(res) && res !== null) return res;
  } catch (e) {}
  return num > 99.99 ? Math.trunc(num) : (Math.trunc((num + 1e-7) * 100) / 100) || 1.0;
}

function truncarMontoSeguro(valor) {
  const num = parseFloat(valor);
  if (isNaN(num)) return 0;
  try {
    const valFormateado = aplicarPrecisionMonto(num);
    const numClean = parseFloat(String(valFormateado).replace(/,/g, ''));
    if (!isNaN(numClean)) return numClean;
  } catch (e) {}
  return Math.round(num * 100) / 100;
}

module.exports = { truncarTasaSegura, truncarMontoSeguro };
