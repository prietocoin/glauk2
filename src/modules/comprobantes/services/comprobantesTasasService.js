/**
 * @file comprobantesTasasService.js
 * @description Módulo atómico exclusivo para la resolución determinista de T1 y T2.
 */

/**
 * Consulta a TasasHub las tarjetas de países precalculadas para un socio y lote.
 */
async function obtenerTarjetasSocioFromHub(socio, lote) {
  try {
    if (!socio || socio === 'GENERAL' || socio === 'NO DEFINIDO') return null;
    
    const socioQuery = encodeURIComponent(String(socio).trim());
    const baseUrl = process.env.TASASHUB_URL || 'http://127.0.0.1:3000';
    
    const url = `${baseUrl}/api/v1/tasas/calcular/${socioQuery}${lote ? `?lote=${encodeURIComponent(lote)}` : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.warn(`[comprobantesTasasService ⚠️ Error TasasHub para socio ${socio}]:`, err.message);
    return null;
  }
}

/**
 * Extrae la tasa exacta (compra o venta) según la naturaleza y la moneda.
 */
function extraerTasaSegunNaturaleza(dataHub, monedaComprobante, naturaleza) {
  if (!dataHub || !Array.isArray(dataHub.tarjetas_paises)) return 'N/A';

  const monSearch = String(monedaComprobante || '').trim().toUpperCase();
  const nat = String(naturaleza || '').trim().toUpperCase();

  const tarjeta = dataHub.tarjetas_paises.find(
    (t) => String(t.code || '').trim().toUpperCase() === monSearch
  );

  if (!tarjeta) return 'N/A';

  if (nat === 'D') {
    return Number(tarjeta.compra) > 0 ? Number(tarjeta.compra) : 'N/A';
  }

  if (nat === 'P') {
    return Number(tarjeta.venta) > 0 ? Number(tarjeta.venta) : 'N/A';
  }

  return 'N/A';
}

/**
 * Resuelve T1 y T2 de forma determinista para un comprobante.
 */
async function resolverTasasComprobante(item) {
  const nat = String(item.tipo_op1 || item.naturaleza || '').trim().toUpperCase();
  const monComp = String(item.moneda || item.moneda_local || '').trim().toUpperCase();
  const lote = item.lote_tasa || item.lote_tasa_asignado || '';

  const s1 = item.nombre_socio_1 || item.socio_1 || 'GENERAL';
  const monS1 = String(item.moneda_base_socio1 || item.moneda_socio1 || '').trim().toUpperCase();

  const s2 = item.nombre_socio_2 || item.socio_2 || 'GENERAL';
  const monS2 = String(item.moneda_base_socio2 || item.moneda_socio2 || '').trim().toUpperCase();

  // 1. RESOLUCIÓN DE TASA 1
  let t1;
  if (nat === 'A' || (monS1 && monComp && monS1 === monComp)) {
    t1 = 1.00;
  } else {
    const dataHubS1 = await obtenerTarjetasSocioFromHub(s1, lote);
    t1 = extraerTasaSegunNaturaleza(dataHubS1, monComp, nat);
  }

  // 2. RESOLUCIÓN DE TASA 2
  let t2;
  if (nat === 'A' || (monS2 && monComp && monS2 === monComp)) {
    t2 = 1.00;
  } else {
    const dataHubS2 = await obtenerTarjetasSocioFromHub(s2, lote);
    t2 = extraerTasaSegunNaturaleza(dataHubS2, monComp, nat);
  }

  return {
    tasa_1: t1,
    tasa_2: t2
  };
}

module.exports = {
  resolverTasasComprobante
};
