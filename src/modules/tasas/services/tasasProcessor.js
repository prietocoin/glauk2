/**
 * @file tasasProcessor.service.js
 * @description Orquestador atómico para el procesamiento de carteleras de tasas por socio en glauk2.
 */
const { extractJid, obtenerFechaHoraVE } = require('../../../utils/formatters');
const { obtenerLotesTasas } = require('../queries/tasasQuery');
const { obtenerSociosConTasasActivas } = require('../queries/tasasSociosQuery');
const { calcularTarjetaPais } = require('../calculators/crossRateCalculator');

function normalizarMapTasas(rawObj) {
  const map = typeof rawObj === 'string' ? JSON.parse(rawObj || '{}') : (rawObj || {});
  return Object.entries(map).reduce((acc, [k, v]) => {
    if (k) acc[k.toUpperCase().trim()] = parseFloat(v) || 1.0;
    return acc;
  }, {});
}

async function obtenerSociosYProcesarTasas(options = null) {
  const filtroNombre = typeof options === 'string' ? options : (options?.filtroNombre || options?.socio);
  const idTasaReq = typeof options === 'object' ? (options?.id_tasa || options?.lote_tasa) : null;

  const { loteActual, loteAnterior } = await obtenerLotesTasas(idTasaReq);
  const tasasActual = normalizarMapTasas(loteActual.tasas);
  const tasasAnterior = normalizarMapTasas(loteAnterior.tasas);

  const socios = await obtenerSociosConTasasActivas();
  const timeVE = obtenerFechaHoraVE();

  let resultado = socios
    .filter(s => s.nombre && !['NOMBRE', 'GENERAL'].includes(s.nombre.toUpperCase()))
    .map(socio => {
      const monedaBase = String(socio.moneda_base || 'USDT').toUpperCase().trim();
      const monedaProcesada = monedaBase === 'USD' ? 'USDT' : monedaBase;
      const configMonedas = (typeof socio.monedas === 'object' && socio.monedas !== null) ? socio.monedas : {};

      const tarjetasPaises = Object.entries(configMonedas)
        .filter(([, cfg]) => cfg.activo)
        .map(([codeP, cfg]) => calcularTarjetaPais(codeP, cfg, tasasActual, tasasAnterior, monedaProcesada))
        .sort((a, b) => a.orden - b.orden || a.nombre_pais.localeCompare(b.nombre_pais));

      return {
        nombre_socio: socio.nombre,
        moneda_socio: monedaProcesada,
        remoteJid: extractJid(socio.id_grupo),
        lote_tasa: loteActual.id_tasa || 'T001',
        hora_actualizacion: timeVE.horaStr,
        tasa_base_ref: `${loteActual.id_tasa} ${timeVE.fechaStr}`,
        tarjetas_paises: tarjetasPaises,
        cartelera_paises: tarjetasPaises
      };
    });

  if (filtroNombre) {
    const busq = filtroNombre.trim().toLowerCase();
    resultado = resultado.filter(s => s.nombre_socio.toLowerCase().includes(busq));
  }

  return resultado;
}

module.exports = { obtenerSociosYProcesarTasas };
