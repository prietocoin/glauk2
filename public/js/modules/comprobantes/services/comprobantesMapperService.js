/**
 * @file comprobantesMapperService.js
 * @description Mapeador atómico determinista basado en timestamp_msg de la API.
 */

function truncarTasaComercial(val) {
  const num = parseFloat(val);
  return isNaN(num) || num <= 0 ? 1.0 : Math.floor(num * 10000) / 10000;
}

export function obtenerInsigniaRol(rol) {
  const r = String(rol || '').toUpperCase().trim();
  switch (r) {
    case 'ADMIN': return '💎';
    case 'ASESOR': return '👔';
    case 'PROVEEDOR': return '🏦';
    case 'SOCIO': default: return '🤝';
  }
}

export function prepararEdicionComprobante(item, loteActivo = 'T071') {
  if (!item) return {};

  const c = item.comprobante || item;

  // 1. IDENTIFICADOR CRÍTICO PARA EL BORRADO Y CONSULTA (hash_largo)
  const idReal = String(c.hash_largo || item.hash_largo || c.id || item.id || c.referencia || '').trim();
  const hashCortoFinal = c.hash_corto || (idReal ? idReal.slice(0, 8).toUpperCase() : 'HASH');

  // 2. EXTRAER Y CONVERTIR TIMESTAMP REAL DE LA API (timestamp_msg)
  const rawTimestamp = c.timestamp_msg || item.timestamp_msg || c.fecha_hora_comprobante || item.fecha_hora_comprobante || '';
  
  let fechaFmt = 'S/F';
  let horaFmt = 'S/F';
  let dateInput = '';

  if (rawTimestamp) {
    let numTs = Number(rawTimestamp);
    
    // Si viene en segundos (10 dígitos Unix), convertir a milisegundos
    if (!isNaN(numTs) && numTs > 0) {
      if (numTs < 10000000000) {
        numTs = numTs * 1000;
      }
      const d = new Date(numTs);
      if (!isNaN(d.getTime())) {
        const tzOffset = d.getTimezoneOffset() * 60000;
        const localDate = new Date(d.getTime() - tzOffset);
        const isoStr = localDate.toISOString();

        dateInput = isoStr.slice(0, 16);
        fechaFmt = isoStr.slice(0, 10); // YYYY-MM-DD exacta
        horaFmt = isoStr.slice(11, 19); // HH:MM:SS exacta
      }
    } else if (typeof rawTimestamp === 'string') {
      // Si viniera ya formateada como cadena ISO/SQL
      const d = new Date(rawTimestamp);
      if (!isNaN(d.getTime())) {
        const tzOffset = d.getTimezoneOffset() * 60000;
        const localDate = new Date(d.getTime() - tzOffset);
        const isoStr = localDate.toISOString();

        dateInput = isoStr.slice(0, 16);
        fechaFmt = isoStr.slice(0, 10);
        horaFmt = isoStr.slice(11, 19);
      }
    }
  }

  const fallbackMonto = Math.abs(parseFloat(c.monto || c.monto_local || item.monto || 0)) || 0;

  const socio1Real = c.grupo_1?.grupo || item.grupo_1?.grupo || c.nombre_socio_1 || item.nombre_socio_1 || 'GENERAL';
  const socio2Real = c.grupo_2?.grupo || item.grupo_2?.grupo || c.nombre_socio_2 || item.nombre_socio_2 || 'GENERAL';

  const rol1 = c.grupo_1?.rol || item.grupo_1?.rol || item.rol_1 || 'SOCIO';
  const rol2 = c.grupo_2?.rol || item.grupo_2?.rol || item.rol_2 || 'SOCIO';

  const t1 = truncarTasaComercial(c.grupo_1?.tasa || item.grupo_1?.tasa || item.tasa_1);
  const t2 = truncarTasaComercial(c.grupo_2?.tasa || item.grupo_2?.tasa || item.tasa_2);

  const rawM1 = c.grupo_1?.monto ?? item.m1_socio ?? item.monto_1 ?? item.me1 ?? (t1 > 0 ? (fallbackMonto / t1) : fallbackMonto);
  const rawM2 = c.grupo_2?.monto ?? item.m2_socio ?? item.monto_2 ?? item.me2 ?? (t2 > 0 ? (fallbackMonto / t2) : fallbackMonto);

  const calcM1 = Math.abs(parseFloat(rawM1) || 0).toFixed(2);
  const calcM2 = Math.abs(parseFloat(rawM2) || 0).toFixed(2);

  const rawImg = c.url_r2_comprobante || item.url_r2_comprobante || c.link_img || item.link_img || c.url_imagen_1 || item.url_imagen_1 || '';

  return {
    ...item,
    ...c,
    // CAMPOS DE CONTROL Y FECHAS PARSEADAS DESDE TIMESTAMP_MSG
    hash_largo: idReal,
    id: idReal,
    hash_corto: hashCortoFinal,
    
    timestamp_msg: rawTimestamp,
    fecha_fmt: fechaFmt,
    hora_fmt: horaFmt,
    fecha_hora_input: dateInput,
    fecha_hora_comprobante: dateInput,

    banco: (c.banco && c.banco !== '-') ? c.banco : (item.banco || 'BANCO'),
    referencia: (c.referencia && c.referencia !== '-') ? c.referencia : (item.referencia || 'N/A'),
    titular: (c.titular && c.titular !== '-') ? c.titular : (item.titular || 'TITULAR NO DEFINIDO'),
    
    link_img: rawImg,
    url_r2_comprobante: rawImg,

    nombre_socio_1: socio1Real,
    socio_1: socio1Real,
    rol_1: rol1,
    badge_1: obtenerInsigniaRol(rol1),

    nombre_socio_2: socio2Real,
    socio_2: socio2Real,
    rol_2: rol2,
    badge_2: obtenerInsigniaRol(rol2),

    tipo_manual: (c.tipo || item.tipo || item.tipo_manual || 'P').toUpperCase(),
    moneda: (c.moneda || item.moneda || 'USDT').toUpperCase(),
    monto: fallbackMonto,
    monto_local: fallbackMonto,
    lote_tasa_asignado: c.lote || item.lote || item.lote_tasa_asignado || loteActivo,

    tasa_1: t1,
    tasa_2: t2,

    m1_socio: calcM1,
    m2_socio: calcM2,
    monto_1: calcM1,
    monto_2: calcM2,
    me1: calcM1,
    me2: calcM2
  };
}
