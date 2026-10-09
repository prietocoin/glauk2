/**
 * @file comprobantesMapperService.js
 * @description Mapeador atómico para modalEditarComprobante y cards de socio.
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

  // 1. EXTRAER SOCIOS RESPETANDO LA BASE DE DATOS
  const socio1Real = item.nombre_socio_1 || item.socio_1 || item.socio1 || 'GENERAL';
  const socio2Real = item.nombre_socio_2 || item.socio_2 || item.socio2 || 'GENERAL';

  // 2. EXTRAER TASAS LIMPIAS
  const t1 = truncarTasaComercial(item.tasa_1);
  const t2 = truncarTasaComercial(item.tasa_2);

  // 3. CÁLCULO DE MONTOS: ESCALAR ABSOLUTO Y LIMPIO
  const rawM1 = item.m1_socio ?? item.monto_1 ?? item.me1 ?? (t1 > 0 ? (fallbackMonto / t1) : fallbackMonto);
  const rawM2 = item.m2_socio ?? item.monto_2 ?? item.me2 ?? (t2 > 0 ? (fallbackMonto / t2) : fallbackMonto);

  const calcM1 = Math.abs(parseFloat(rawM1) || 0).toFixed(2);
  const calcM2 = Math.abs(parseFloat(rawM2) || 0).toFixed(2);

  return {
    ...item,
    hash_largo: item.hash_largo || '',
    banco: (item.banco && item.banco !== '-') ? item.banco : 'BANCO',
    referencia: (item.referencia && item.referencia !== '-') ? item.referencia : 'N/A',
    titular: (item.titular && item.titular !== '-') ? item.titular : 'TITULAR NO DEFINIDO',
    
    // NOMBRES DE SOCIOS PARA VINCULAR CON ALPINE <select>
    nombre_socio_1: socio1Real,
    socio_1: socio1Real,
    nombre_socio_2: socio2Real,
    socio_2: socio2Real,

    // DIVISAS BASE DE SOCIOS SIN FALLBACKS FORZADOS
    moneda_base_socio1: item.moneda_base_socio1 || item.moneda_socio1,
    moneda_base_socio2: item.moneda_base_socio2 || item.moneda_socio2,

    // MONEDA Y MONTO DEL RECIBO
    tipo_manual: (item.tipo_manual || item.naturaleza || item.tipo_op1 || 'P').toUpperCase(),
    moneda: (item.moneda || item.moneda_local || 'ARS').toUpperCase(),
    monto: fallbackMonto,
    monto_local: fallbackMonto,
    lote_tasa_asignado: item.lote_tasa_asignado || item.lote_tasa || loteActivo,

    tasa_1: t1,
    tasa_2: t2,

    // INPUTS VINCULADOS A x-model EN modalEditarComprobante.ejs
    m1_socio: calcM1,
    m2_socio: calcM2,
    monto_1: calcM1,
    monto_2: calcM2,

    // BRUTOS RAW
    me1: calcM1,
    me2: calcM2,

    fecha_hora_input: dateInput
  };
}
