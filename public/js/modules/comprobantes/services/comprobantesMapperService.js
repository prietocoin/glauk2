/**
 * @file comprobantesMapperService.js
 * @description Mapeador atómico para transformaciones de tarjetas, roles, fechas, hash e imágenes R2.
 */

function truncarTasaComercial(val) {
  const num = parseFloat(val);
  return isNaN(num) || num <= 0 ? 1.0 : Math.floor(num * 10000) / 10000;
}

/**
 * Devuelve la micro-insignia visual según el ROL de la entidad
 */
export function obtenerInsigniaRol(rol) {
  const r = String(rol || '').toUpperCase().trim();
  switch (r) {
    case 'ADMIN': return '💎';
    case 'ASESOR': return '👔';
    case 'PROVEEDOR': return '🏦';
    case 'SOCIO': default: return '🤝';
  }
}

export function prepararEdicionComprobante(item, loteActivo = 'T063') {
  if (!item) return {};

  const c = item.comprobante || item;

  // 🟢 1. EXTRACCIÓN Y PARSEO MULTI-CLAVE DE FECHA Y HORA
  const rawFechaStr = String(
    c.fecha_hora_comprobante || 
    c.fecha_hora_input || 
    c.fecha_hora || 
    c.fecha_proceso || 
    c.fecha_operacion || 
    c.fecha_comprobante || 
    c.fecha || 
    c.created_at || 
    c.timestamp || ''
  ).trim();

  let dateInput = '';
  let fechaFmt = 'S/F';
  let horaFmt = 'S/F';

  if (rawFechaStr) {
    // A) Intentar Parseo como Timestamp/ISO
    const d = new Date(rawFechaStr);
    if (!isNaN(d.getTime())) {
      const tzOffset = d.getTimezoneOffset() * 60000;
      const localDate = new Date(d.getTime() - tzOffset);
      const isoStr = localDate.toISOString();

      dateInput = isoStr.slice(0, 16);
      fechaFmt = isoStr.slice(0, 10); // YYYY-MM-DD
      horaFmt = isoStr.slice(11, 19); // HH:MM:SS
    } else {
      // B) Fallback para cadenas de texto directas (ej. "14 oct 2024 - 10:11")
      const partes = rawFechaStr.split(/[-_T ]+/);
      if (partes.length >= 1) fechaFmt = partes[0];
      if (partes.length >= 2) horaFmt = partes.slice(1).join(' ');
    }
  }

  // 🟢 2. EXTRACCIÓN Y PARSEO DE HASH
  const hashLargoFinal = c.hash_largo || c.hash || c.hash_corto || c.referencia || '';
  const hashCortoFinal = c.hash_corto || (hashLargoFinal ? String(hashLargoFinal).replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase() : 'HASH');

  const fallbackMonto = Math.abs(parseFloat(c.monto || c.monto_local || 0)) || 0;

  // Extraer entidades respetando grupo_1 / grupo_2 o fallback plano
  const socio1Real = c.grupo_1?.grupo || c.nombre_socio_1 || c.socio_1 || c.socio1 || 'GENERAL';
  const socio2Real = c.grupo_2?.grupo || c.nombre_socio_2 || c.socio_2 || c.socio2 || 'GENERAL';

  const rol1 = c.grupo_1?.rol || c.rol_1 || 'SOCIO';
  const rol2 = c.grupo_2?.rol || c.rol_2 || 'SOCIO';

  const t1 = truncarTasaComercial(c.grupo_1?.tasa || c.tasa_1);
  const t2 = truncarTasaComercial(c.grupo_2?.tasa || c.tasa_2);

  const rawM1 = c.grupo_1?.monto ?? c.m1_socio ?? c.monto_1 ?? c.me1 ?? (t1 > 0 ? (fallbackMonto / t1) : fallbackMonto);
  const rawM2 = c.grupo_2?.monto ?? c.m2_socio ?? c.monto_2 ?? c.me2 ?? (t2 > 0 ? (fallbackMonto / t2) : fallbackMonto);

  const calcM1 = Math.abs(parseFloat(rawM1) || 0).toFixed(2);
  const calcM2 = Math.abs(parseFloat(rawM2) || 0).toFixed(2);

  // EXTRACCIÓN DEFENSIVA DE LA IMAGEN EN CLOUDFLARE R2
  const rawImg = c.link_img || c.url_r2_comprobante || c.link_r2 || c.url_imagen || c.url || '';

  return {
    ...c,
    // METADATOS PARSEADOS
    fecha_fmt: fechaFmt,
    hora_fmt: horaFmt,
    fecha_hora_input: dateInput,
    fecha_hora_comprobante: rawFechaStr,

    hash_largo: hashLargoFinal,
    hash_corto: hashCortoFinal,

    banco: (c.banco && c.banco !== '-') ? c.banco : 'BANCO',
    referencia: (c.referencia && c.referencia !== '-') ? c.referencia : 'N/A',
    titular: (c.titular && c.titular !== '-') ? c.titular : 'TITULAR NO DEFINIDO',
    
    // IMAGEN DE CLOUDFLARE R2
    link_img: rawImg,
    url_r2_comprobante: rawImg,

    // Nombres y Roles mapeados con insignias
    nombre_socio_1: socio1Real,
    socio_1: socio1Real,
    rol_1: rol1,
    badge_1: obtenerInsigniaRol(rol1),

    nombre_socio_2: socio2Real,
    socio_2: socio2Real,
    rol_2: rol2,
    badge_2: obtenerInsigniaRol(rol2),

    moneda_base_socio1: c.grupo_1?.moneda_base || c.moneda_base_socio1 || 'USDT',
    moneda_base_socio2: c.grupo_2?.moneda_base || c.moneda_base_socio2 || 'USDT',

    tipo_manual: (c.tipo || c.tipo_manual || c.naturaleza || 'P').toUpperCase(),
    moneda: (c.moneda || c.moneda_local || 'ARS').toUpperCase(),
    monto: fallbackMonto,
    monto_local: fallbackMonto,
    lote_tasa_asignado: c.lote || c.lote_tasa_asignado || loteActivo,

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
