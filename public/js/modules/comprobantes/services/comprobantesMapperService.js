/**
 * @file comprobantesMapperService.js
 * @description Mapeador directo sin pérdida de valores de monto_1 y monto_2.
 */

export function prepararEdicionComprobante(item, loteActivo = 'T063') {
  if (!item) return {};

  const montoLocal = Number(item.monto || item.monto_local || 0);
  const tasa1 = Number(item.tasa_1) > 0 ? Number(item.tasa_1) : 1;
  const tasa2 = Number(item.tasa_2) > 0 ? Number(item.tasa_2) : tasa1;

  // Si vienen directamente del objeto item, se respetan sin forzar fallback a 0
  const m1 = item.monto_1 !== undefined && item.monto_1 !== null 
    ? item.monto_1 
    : (montoLocal / tasa1).toFixed(2);

  const m2 = item.monto_2 !== undefined && item.monto_2 !== null 
    ? item.monto_2 
    : (montoLocal / tasa2).toFixed(2);

  return {
    ...item,
    socio_1: item.socio_1 || item.nombre_socio_1 || 'GENERAL',
    socio_2: item.socio_2 || item.nombre_socio_2 || 'GENERAL',
    nombre_socio_1: item.nombre_socio_1 || item.socio_1 || 'GENERAL',
    nombre_socio_2: item.nombre_socio_2 || item.socio_2 || 'GENERAL',
    
    moneda: item.moneda || 'ARS',
    monto: montoLocal,
    monto_local: montoLocal,

    tasa_1: tasa1,
    tasa_2: tasa2,

    // ASIGNACIÓN DIRECTA A LAS PROPIEDADES QUE LEE EL HTML
    monto_1: m1,
    monto_2: m2,
    me1: item.me1 ?? m1,
    me2: item.me2 ?? m2
  };
}
