/**
 * @file formatters.js
 * @description Utilidades puras de precisión matemática y formateo para montos y tasas en glauk2.
 */

/**
 * Trunca un monto numérico a 2 decimales sin arrastrar imprecisiones de coma flotante.
 * @param {number|string} val 
 * @returns {number}
 */
function aplicarPrecisionMonto(val) {
  if (!val || isNaN(val)) return 0;
  const num = parseFloat(val);
  const signo = num < 0 ? -1 : 1;
  const vRound = Math.round(Math.abs(num) * 1e8) / 1e8;
  return signo * (Math.trunc((vRound + 1e-7) * 100) / 100);
}

/**
 * Formatea un monto con precisión de 2 decimales y formato es-ES.
 * @param {number|string} val 
 * @returns {string}
 */
function formatMonto(val) {
  const num = aplicarPrecisionMonto(val);
  return num.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Aplica la regla comercial de precisión para tasas (>99.99 entero, <=99.99 truncado).
 * @param {number|string} val 
 * @returns {number}
 */
function aplicarReglaPrecisionTasa(val) {
  if (!val || isNaN(val)) return 0;
  const num = Math.abs(parseFloat(val));
  const vRound = Math.round(num * 1e8) / 1e8;
  if (vRound === 0) return 0;

  const signo = parseFloat(val) < 0 ? -1 : 1;
  if (vRound > 99.99) return signo * Math.trunc(vRound);
  if (vRound >= 10.0) return signo * (Math.trunc((vRound + 1e-7) * 100) / 100);

  const factor = Math.pow(10, 2 - Math.floor(Math.log10(vRound)));
  return signo * (Math.trunc((vRound + 1e-7) * factor) / factor);
}

module.exports = {
  aplicarPrecisionMonto,
  formatMonto,
  aplicarReglaPrecisionTasa
};
