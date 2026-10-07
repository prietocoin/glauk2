/**
 * @file crossRateCalculator.js
 * @description Lógica aritmética pura para el cálculo de tasas cruzadas basándose 100% en porcentajes (%).
 */
const { truncarTasaOficial } = require('../../../utils/formatters');
const { BANDERAS_MAP, MAPA_MONEDAS } = require('../constants/mapperConstants');

function determinarTendencia(actual, anterior) {
  const a = parseFloat(actual.toFixed(4));
  const b = parseFloat(anterior.toFixed(4));
  if (a > b) return 'up';
  if (a < b) return 'down';
  return 'stable';
}

function obtenerTasaBase(mapaTasas = {}, codigoMoneda) {
  const c = String(codigoMoneda || '').toUpperCase().trim();
  const val = parseFloat(mapaTasas[c]);
  return (!isNaN(val) && val > 0) ? val : 1.0;
}

/**
 * Aplica los porcentajes (%) de depósito y pago sobre la tasa cruzada base.
 */
function calcularTarjetaPais(codeP, configPais = {}, tasasActual = {}, tasasAnterior = {}, monedaProcesada) {
  const nombreP = MAPA_MONEDAS[codeP] || Object.keys(MAPA_MONEDAS).find(k => MAPA_MONEDAS[k] === codeP) || codeP;

  const pctD = parseFloat(configPais.porcentaje?.deposito) || 0;
  const pctP = parseFloat(configPais.porcentaje?.pago) || 0;

  const multD = 1 + (pctD / 100);
  const multP = 1 - (pctP / 100);

  const baseAct = obtenerTasaBase(tasasActual, codeP) / obtenerTasaBase(tasasActual, monedaProcesada);
  const baseAnt = obtenerTasaBase(tasasAnterior, codeP) / obtenerTasaBase(tasasAnterior, monedaProcesada);

  const numCompraActual = baseAct * multD;
  const numVentaActual = baseAct * multP;

  return {
    bandera: BANDERAS_MAP[codeP] || '🌐',
    nombre_pais: `${nombreP} (${codeP})`,
    compra: multD > 0 ? truncarTasaOficial(numCompraActual) : '-',
    venta: multP > 0 ? truncarTasaOficial(numVentaActual) : '-',
    trend_compra: multD > 0 ? determinarTendencia(numCompraActual, baseAnt * multD) : 'stable',
    trend_venta: multP > 0 ? determinarTendencia(numVentaActual, baseAnt * multP) : 'stable',
    orden: configPais.orden || 99
  };
}

module.exports = { calcularTarjetaPais };
