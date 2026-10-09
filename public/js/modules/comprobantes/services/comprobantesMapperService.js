/**
 * @file comprobantesMapperService.js
 * @path public/js/modules/comprobantes/services/comprobantesMapperService.js
 * @description Normaliza y prepara el objeto de comprobante para la UI y el modal.
 */

function truncarTasaComercial(val) {
  const num = parseFloat(val);
  return isNaN(num) || num <= 0 ? 1.0 : Math.floor(num * 10000) / 10000;
}

export function prepararEdicionComprobante(item, loteActivo = 'T063') {
  if (!item) return {};

  let dateInput = '';
  if (item.fecha_hora_comprobante) {
    const d = new Date(item.fecha_hora_comprobante);
    if (!isNaN(d.getTime())) {
      const tzOffset = d.getTimezoneOffset() * 60000;
      dateInput = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
    }
  }

  const tipoOpBruto = (item.tipo_op1 || item.tipo_op_socio || item.tipo_op || item.tipo_manual || 'D').split('-')[0];
  const fallbackSocio1 = item.nombre_socio_1 || item.socio_1 || item.fb_socio_1 || 'GENERAL';
  const fallbackSocio2 = item.nombre_socio_2 || item.socio_2 || item.fb_socio_2 || 'GENERAL';
  const fallbackMonto = Math.abs(parseFloat(item.monto || item.monto_local || item.m1_socio || item.monto_1 || 0)) || 0;

  // Lógica de recuperación de montos netos y brutos
  const parsedMonto1 = item.monto_1 !== null && item.monto_1 !== undefined 
    ? parseFloat(item.monto_1) 
    : (item.me1 !== null && item.me1 !== undefined ? parseFloat(item.me1) : fallbackMonto);

  const parsedMonto2 = item.monto_2 !== null && item.monto_2 !== undefined 
    ? parseFloat(item.monto_2) 
    : (item.me2 !== null && item.me2 !== undefined ? parseFloat(item.me2) : 0);

  const parsedMe1 = item.me1 !== null && item.me1 !== undefined ? parseFloat(item.me1) : parsedMonto1;
  const parsedMe2 = item.me2 !== null && item.me2 !== undefined ? parseFloat(item.me2) : parsedMonto2;

  return {
    ...item,
    banco: (item.banco && item.banco !== '-') ? item.banco : 'BANCO',
    referencia: (item.referencia && item.referencia !== '-') ? item.referencia : 'N/A',
    titular: (item.titular && item.titular !== '-') ? item.titular : 'TITULAR NO DEFINIDO',
    nombre_socio_1: fallbackSocio1,
    socio_1: item.socio_1 || fallbackSocio1,
    nombre_socio_2: fallbackSocio2,
    socio_2: item.socio_2 || fallbackSocio2,
    tipo_manual: tipoOpBruto,
    tipo_op1: item.tipo_op1 || tipoOpBruto,
    moneda: (item.moneda || item.moneda_local || 'ARS').toUpperCase(),
    monto: fallbackMonto,
    monto_local: fallbackMonto,
    tasa_1: truncarTasaComercial(item.tasa_1),
    tasa_2: truncarTasaComercial(item.tasa_2),
    
    // EXPORTACIÓN DE CAMPOS DE LOS INPUTS DEL MODAL (MONTO_1 Y MONTO_2)
    monto_1: isNaN(parsedMonto1) ? fallbackMonto : parsedMonto1,
    monto_2: isNaN(parsedMonto2) ? 0 : parsedMonto2,
    monto_socio1: isNaN(parsedMonto1) ? fallbackMonto : parsedMonto1,
    monto_socio2: isNaN(parsedMonto2) ? 0 : parsedMonto2,

    // BRUTOS AUDITABLES (ME1 Y ME2)
    me1: isNaN(parsedMe1) ? fallbackMonto : parsedMe1,
    me2: isNaN(parsedMe2) ? 0 : parsedMe2,

    lote_tasa_asignado: item.lote_tasa_asignado || item.lote_tasa || loteActivo,
    lote_tasa: item.lote_tasa || item.lote_tasa_asignado || loteActivo,
    fecha_hora_input: dateInput
  };
}
