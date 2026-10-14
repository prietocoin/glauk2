/**
 * @file comprobantesTasasService.js
 * @description Módulo atómico exclusivo para la resolución determinista de T1 y T2 alineado con comprobantes_final.
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

    // Control de Timeout defensivo a 3 segundos para evitar bloquear el Event Loop
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timeoutId));

    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.warn(`[comprobantesTasasService ⚠️ Error TasasHub para socio ${socio}]:`, err.message);
    return null;
  }
}

/**
 * Extrae la tasa exacta (compra o venta) según la naturaleza y la moneda.
 * Retorna 0 si no se encuentra cotización válida (evitando strings "N/A" en PostgreSQL).
 */
function extraerTasaSegunNaturaleza(dataHub, monedaComprobante, naturaleza) {
  if (!dataHub || !Array.isArray(dataHub.tarjetas_paises)) return 0;

  const monSearch = String(monedaComprobante || '').trim().toUpperCase();
  const nat = String(naturaleza || '').trim().toUpperCase();

  const tarjeta = dataHub.tarjetas_paises.find(
    (t) => String(t.code || '').trim().toUpperCase() === monSearch
  );

  if (!tarjeta) return 0;

  let val = 0;
  if (nat === 'D') {
    val = Number(tarjeta.compra);
  } else if (nat === 'P') {
    val = Number(tarjeta.venta);
  } else {
    val = Number(tarjeta.compra || tarjeta.venta);
  }

  return (!isNaN(val) && val > 0) ? Math.floor(val * 10000) / 10000 : 0;
}

/**
 * Resuelve T1 y T2 de forma determinista para un comprobante.
 */
async function resolverTasasComprobante(item) {
  if (!item) return { tasa_1: 0, tasa_2: 0 };

  const nat = String(item.tipo_op1 || item.naturaleza || item.tipo_op || '').trim().toUpperCase();
  const monComp = String(item.moneda || item.moneda_local || 'USDT').trim().toUpperCase();
  const lote = item.lote_tasa || item.lote_tasa_asignado || item.lote || '';

  const s1 = item.nombre_socio_1 || item.socio_1 || 'GENERAL';
  const monS1 = String(item.moneda_base_socio1 || item.moneda_socio1 || '').trim().toUpperCase();

  const s2 = item.nombre_socio_2 || item.socio_2 || 'GENERAL';
  const monS2 = String(item.moneda_base_socio2 || item.moneda_socio2 || '').trim().toUpperCase();

  // 1. RESOLUCIÓN DE TASA 1
  let t1 = 0;
  if (nat === 'A' || (monS1 && monComp && monS1 === monComp)) {
    t1 = 1.00;
  } else {
    const dataHubS1 = await obtenerTarjetasSocioFromHub(s1, lote);
    t1 = extraerTasaSegunNaturaleza(dataHubS1, monComp, nat);
  }

  // 2. RESOLUCIÓN DE TASA 2
  let t2 = 0;
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
