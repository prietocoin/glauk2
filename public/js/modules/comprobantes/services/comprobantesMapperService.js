/**
 * @file comprobantesMapperService.js
 * @path public/js/modules/comprobantes/services/comprobantesMapperService.js
 * @description Normaliza y prepara el objeto de comprobante para la UI y el modal.
 */

function truncarTasaComercial(val) {
  const num = parseFloat(val);
  return isNaN(num) ? 1.0 : Math.floor(num * 10000) / 10000;
}

export function prepararEdicionComprobante(item, loteActivo = 'T052') {
  if (!item) return null;

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
  const fallbackMonto = Math.abs(parseFloat(item.monto || item.monto_local || item.m1_socio || item.monto_1 || 0));

  return {
    ...item,
    banco: item.banco && item.banco !== '-' ? item.banco : '',
    referencia: item.referencia && item.referencia !== '-' ? item.referencia : '',
    titular: item.titular && item.titular !== '-' ? item.titular : '',
    nombre_socio_1: fallbackSocio1,
    socio_1: item.socio_1 || fallbackSocio1,
    nombre_socio_2: fallbackSocio2,
    socio_2: item.socio_2 || fallbackSocio2,
    tipo_manual: tipoOpBruto,
    moneda: (item.moneda || item.moneda_local || 'COP').toUpperCase(),
    monto: fallbackMonto,
    tasa_1: truncarTasaComercial(item.tasa_1 || 1.0),
    me1: item.me1 !== undefined && item.me1 !== null ? item.me1 : fallbackMonto,
    tasa_2: truncarTasaComercial(item.tasa_2 || 1.0),
    me2: item.me2 || 0,
    lote_tasa_asignado: item.lote_tasa_asignado || item.lote_tasa || loteActivo,
    fecha_hora_input: dateInput
  };
}
