/**
 * @file comprobantesMapperService.js
 * @path public/js/modules/comprobantes/services/comprobantesMapperService.js
 * @description Mapeador ajustado estrictamente a los x-model de modalEditarComprobante.ejs
 */

function truncarTasaComercial(val) {
  const num = parseFloat(val);
  return isNaN(num) || num <= 0 ? 1.0 : Math.floor(num * 10000) / 10000;
}

export function prepararEdicionComprobante(item, loteActivo = 'T063') {
  if (!item) return {};

  let dateInput = '';
  if (item.fecha_hora_comprobante || item.fecha_hora_input) {
    const rawDate = item.fecha_hora_input || item.fecha_hora_comprobante;
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      const tzOffset = d.getTimezoneOffset() * 60000;
      dateInput = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
    }
  }

  const fallbackMonto = Math.abs(parseFloat(item.monto || item.monto_local || 0)) || 0;

  // Resoluciones de socios para prevenir que caigan en "GENERAL"
  const s1 = item.nombre_socio_1 || item.socio_1 || 'NELSY';
  const s2 = item.nombre_socio_2 || item.socio_2 || 'MERLI';

  // Lógica de cálculo directo monto_comprobante / tasa
  const t1 = truncarTasaComercial(item.tasa_1);
  const t2 = truncarTasaComercial(item.tasa_2);

  const calcM1 = item.m1_socio ?? item.monto_1 ?? item.me1 ?? (t1 > 0 ? Number((fallbackMonto / t1).toFixed(2)) : fallbackMonto);
  const calcM2 = item.m2_socio ?? item.monto_2 ?? item.me2 ?? (t2 > 0 ? Number((fallbackMonto / t2).toFixed(2)) : fallbackMonto);

  return {
    ...item,
    hash_largo: item.hash_largo || '',
    banco: (item.banco && item.banco !== '-') ? item.banco : 'BANCO',
    referencia: (item.referencia && item.referencia !== '-') ? item.referencia : 'N/A',
    titular: (item.titular && item.titular !== '-') ? item.titular : 'TITULAR NO DEFINIDO',
    
    // SOCIOS PARA LOS <select> DEL MODAL
    nombre_socio_1: s1,
    socio_1: s1,
    nombre_socio_2: s2,
    socio_2: s2,

    // REGLAS Y MONEDAS
    tipo_manual: (item.tipo_manual || item.naturaleza || item.tipo_op1 || 'P').toUpperCase(),
    moneda: (item.moneda || item.moneda_local || 'ARS').toUpperCase(),
    monto: fallbackMonto,
    monto_local: fallbackMonto,
    lote_tasa_asignado: item.lote_tasa_asignado || item.lote_tasa || loteActivo,

    tasa_1: t1,
    tasa_2: t2,

    // PROPIEDADES CLAVE PARA LOS INPUTS X-MODEL DE modalEditarComprobante.ejs
    m1_socio: calcM1,
    m2_socio: calcM2,
    monto_1: calcM1,
    monto_2: calcM2,
    me1: item.me1 ?? calcM1,
    me2: item.me2 ?? calcM2,

    fecha_hora_input: dateInput
  };
}
