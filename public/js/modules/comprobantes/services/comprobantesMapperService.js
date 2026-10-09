/**
 * @file comprobantesMapperService.js
 * @description Mapeador atómico para prevenir el fallback a GENERAL en el modal.
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

  // EXTRAER SOCIOS DE TODAS LAS POSIBLES VARIANTES DEL JSON
  const socio1Real = item.nombre_socio_1 || item.socio_1 || item.socio1 || 'NELSY';
  const socio2Real = item.nombre_socio_2 || item.socio_2 || item.socio2 || 'MERLI';

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
    
    // ASIGNACIÓN SIMULTÁNEA DE NOMBRES PARA FORZAR AL SELECT DE ALPINE
    nombre_socio_1: socio1Real,
    socio_1: socio1Real,
    nombre_socio_2: socio2Real,
    socio_2: socio2Real,

    tipo_manual: (item.tipo_manual || item.naturaleza || item.tipo_op1 || 'P').toUpperCase(),
    moneda: (item.moneda || item.moneda_local || 'ARS').toUpperCase(),
    monto: fallbackMonto,
    monto_local: fallbackMonto,
    lote_tasa_asignado: item.lote_tasa_asignado || item.lote_tasa || loteActivo,

    tasa_1: t1,
    tasa_2: t2,

    // INPUTS DE MONTO
    m1_socio: calcM1,
    m2_socio: calcM2,
    monto_1: calcM1,
    monto_2: calcM2,
    me1: item.me1 ?? calcM1,
    me2: item.me2 ?? calcM2,

    fecha_hora_input: dateInput
  };
}
