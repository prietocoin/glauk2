/**
 * @file comprobantesMapperService.js
 * @description Mapeador atómico del frontend para la API v2 y la tabla comprobantes_final.
 */

/**
 * Trunca o normaliza el valor numérico de la tasa.
 * Si viene 'N/A', nulo o un valor no válido, retorna 0.
 */
function truncarTasaComercial(val) {
  if (val === 'N/A' || val === null || val === undefined) return 0;
  const num = parseFloat(val);
  return isNaN(num) || num <= 0 ? 0 : Math.floor(num * 10000) / 10000;
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

/**
 * Normaliza y enriquece el objeto recibido de la API v2 (comprobantes_final) 
 * para consumo seguro en Alpine.js.
 */
export function prepararEdicionComprobante(item, loteActivo = 'T071') {
  if (!item) return {};

  const c = item.comprobante || item;

  // 1. IDENTIFICADORES Y HASH
  const idReal = String(c.id || c.hash_largo || item.id || item.hash_largo || c.referencia || '').trim();
  const hashCortoFinal = c.hash_corto || item.hash_corto || (idReal ? idReal.slice(0, 8).toUpperCase() : 'HASH');

  // 2. FECHAS Y HORAS ESTÁNDAR V2
  const rawTs = c.timestamp_msg || item.timestamp_msg || c.fecha_hora_iso || item.fecha_hora_iso || '';
  const fechaFmt = c.fecha_fmt || item.fecha_fmt || 'S/F';
  const horaFmt = c.hora_fmt || item.hora_fmt || 'S/F';
  const diaHoraHumano = c.dia_hora_humano || item.dia_hora_humano || 'S/F';
  
  // Construir cadena para input datetime-local del modal auditoría (YYYY-MM-DDTHH:mm)
  let dateInput = c.fecha_hora_input || item.fecha_hora_input || '';
  if (!dateInput && (c.fecha_hora_iso || item.fecha_hora_iso)) {
    dateInput = String(c.fecha_hora_iso || item.fecha_hora_iso).slice(0, 16);
  } else if (!dateInput && fechaFmt !== 'S/F' && horaFmt !== 'S/F') {
    dateInput = `${fechaFmt}T${horaFmt.slice(0, 5)}`;
  }

  // 3. MONTOS Y MONEDAS
  const fallbackMonto = Math.abs(parseFloat(c.monto || c.monto_local || item.monto || 0)) || 0;
  const monedaFinal = String(c.moneda || item.moneda || 'USDT').toUpperCase();

  // 4. ENTIDADES Y ROLES
  const socio1Real = c.nombre_socio_1 || item.nombre_socio_1 || c.socio_1 || item.socio_1 || c.grupo_1?.grupo || 'GENERAL';
  const socio2Real = c.nombre_socio_2 || item.nombre_socio_2 || c.socio_2 || item.socio_2 || c.grupo_2?.grupo || 'GENERAL';

  const rol1 = c.rol_1 || item.rol_1 || c.grupo_1?.rol || 'SOCIO';
  const rol2 = c.rol_2 || item.rol_2 || c.grupo_2?.rol || 'SOCIO';

  const t1 = truncarTasaComercial(c.tasa_1 ?? item.tasa_1 ?? c.grupo_1?.tasa);
  const t2 = truncarTasaComercial(c.tasa_2 ?? item.tasa_2 ?? c.grupo_2?.tasa);

  const rawM1 = c.m1_socio ?? item.m1_socio ?? c.monto_1 ?? item.monto_1 ?? c.me1 ?? item.me1 ?? (t1 > 0 ? (fallbackMonto / t1) : fallbackMonto);
  const rawM2 = c.m2_socio ?? item.m2_socio ?? c.monto_2 ?? item.monto_2 ?? c.me2 ?? item.me2 ?? (t2 > 0 ? (fallbackMonto / t2) : fallbackMonto);

  const calcM1 = Math.abs(parseFloat(rawM1) || 0).toFixed(2);
  const calcM2 = Math.abs(parseFloat(rawM2) || 0).toFixed(2);

  // 4.1 POLARIDADES PRESERVADAS DESDE LA API
  const pol1 = c.polaridad_1 || item.polaridad_1 || c.grupo_1?.polaridad || item.grupo_1?.polaridad || '+';
  const pol2 = c.polaridad_2 || item.polaridad_2 || c.grupo_2?.polaridad || item.grupo_2?.polaridad || '-';

  // 5. IMAGEN CLOUDFLARE R2
  const rawImg = c.url_r2_comprobante || item.url_r2_comprobante || c.link_img || item.link_img || '';

  // 6. FLAG SOCIO x2
  const s2Upper = String(socio2Real).toUpperCase().trim();
  const esX2 = item.es_x2 !== undefined ? Boolean(item.es_x2) : Boolean(s2Upper && s2Upper !== 'GENERAL' && s2Upper !== 'NO DEFINIDO');

  return {
    ...item,
    ...c,
    // CLAVES PRIMARIAS E IDENTIFICADORES
    id: idReal,
    hash_largo: idReal,
    hash_corto: hashCortoFinal,
    
    // CAMPOS DE FECHA Y TIEMPO
    timestamp_msg: rawTs,
    fecha_fmt: fechaFmt,
    hora_fmt: horaFmt,
    dia_hora_humano: diaHoraHumano,
    fecha_hora_input: dateInput,
    fecha_hora_comprobante: dateInput,

    // METADATOS BANCARIOS
    banco: (c.banco && c.banco !== '-') ? c.banco : (item.banco || 'BANCO'),
    referencia: (c.referencia && c.referencia !== '-') ? c.referencia : (item.referencia || 'N/A'),
    titular: (c.titular && c.titular !== '-') ? c.titular : (item.titular || 'TITULAR NO DEFINIDO'),
    
    // IMAGEN
    link_img: rawImg,
    url_r2_comprobante: rawImg,

    // SOCIO 1
    nombre_socio_1: socio1Real,
    socio_1: socio1Real,
    rol_1: rol1,
    badge_1: obtenerInsigniaRol(rol1),
    moneda_base_socio1: c.moneda_base_socio1 || item.moneda_base_socio1 || 'USDT',
    tasa_1: t1,
    m1_socio: calcM1,
    monto_1: calcM1,
    me1: calcM1,
    polaridad_1: pol1,

    // SOCIO 2
    nombre_socio_2: socio2Real,
    socio_2: socio2Real,
    rol_2: rol2,
    badge_2: obtenerInsigniaRol(rol2),
    moneda_base_socio2: c.moneda_base_socio2 || item.moneda_base_socio2 || 'USDT',
    tasa_2: t2,
    m2_socio: calcM2,
    monto_2: calcM2,
    me2: calcM2,
    polaridad_2: pol2,

    // REGLAS GENERALES Y LOTES
    es_x2: esX2,
    tipo_op: (c.tipo_op || c.tipo || item.tipo || item.tipo_manual || 'D').toUpperCase(),
    tipo_manual: (c.tipo_manual || c.tipo || item.tipo || 'D').toUpperCase(),
    moneda: monedaFinal,
    monto: fallbackMonto,
    monto_local: fallbackMonto,
    lote: c.lote || item.lote || c.lote_tasa_asignado || item.lote_tasa_asignado || loteActivo,
    lote_tasa_asignado: c.lote_tasa_asignado || item.lote_tasa_asignado || c.lote || item.lote || loteActivo,

    // GRUPOS COMPATIBILIDAD ANIDADA
    grupo_1: {
      grupo: socio1Real,
      rol: rol1,
      tasa: t1,
      polaridad: pol1,
      monto: calcM1,
      moneda_base: c.moneda_base_socio1 || item.moneda_base_socio1 || 'USDT',
      me: calcM1
    },
    grupo_2: {
      grupo: socio2Real,
      rol: rol2,
      tasa: t2,
      polaridad: pol2,
      monto: calcM2,
      moneda_base: c.moneda_base_socio2 || item.moneda_base_socio2 || 'USDT',
      me: calcM2
    }
  };
}
