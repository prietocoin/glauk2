/**
 * @file snapshotCalculator.js
 * @description Calculadora atómica pura para snapshots financieros y polaridades alineados con comprobantes_final.
 */

/**
 * Sanitiza valores numéricos evitando NaN o "N/A".
 */
function sanitizarNumero(val, fallback = 0) {
  if (val === 'N/A' || val === null || val === undefined) return fallback;
  const num = parseFloat(val);
  return isNaN(num) ? fallback : num;
}

function calcularSnapshotFinanciero(raw = {}, socio1Data = {}, socio2Data = {}, tasaLote = {}, funddaData = null, naturalezaCalculada = null) {
  const montoRaw = Math.abs(parseFloat(String(raw?.monto || 0).replace(/,/g, '')) || 0);
  const divisaRaw = String(raw?.moneda || 'USDT').toUpperCase().trim();
  const monedaSocio1 = String(socio1Data?.moneda_base || socio1Data?.moneda_socio || 'USDT').toUpperCase().trim();

  // 1. Prioridad: Naturaleza calculada por regla imperativa/perfil
  let tipoOpBase = naturalezaCalculada || String(raw?.tipo_manual || raw?.tipo_op || 'D').toUpperCase().trim().charAt(0);

  // 2. Regla Imperativa Backup (Abono si las monedas coinciden)
  if (monedaSocio1 === divisaRaw && socio1Data?.nombre && socio1Data.nombre.toUpperCase() !== 'GENERAL') {
    tipoOpBase = 'A';
  }

  const cfg1 = typeof resolverConfigSocio === 'function' ? resolverConfigSocio(socio1Data, divisaRaw, funddaData) : { activo: false, hereda: false, confDivisa: { polaridad: '+' } };
  const cfg2 = typeof resolverConfigSocio === 'function' ? resolverConfigSocio(socio2Data, divisaRaw, funddaData) : { activo: false, hereda: false, confDivisa: { polaridad: '-' } };

  const getSigno = (cfg) => (!cfg.activo || tipoOpBase === 'A') ? 1 : (cfg.confDivisa.polaridad !== '-' ? (tipoOpBase === 'D' ? 1 : -1) : (tipoOpBase === 'D' ? -1 : 1));
  let signo1 = getSigno(cfg1);
  let signo2 = getSigno(cfg2);

  if (cfg1.activo && cfg2.activo) {
    if (cfg1.hereda && !cfg2.hereda) signo1 = -1 * signo2;
    else if (cfg2.hereda && !cfg1.hereda) signo2 = -1 * signo1;
  }

  const mapaTasas = tasaLote?.tasas || {};
  const calc1 = typeof calcularLado === 'function' ? calcularLado(cfg1, signo1, montoRaw, tipoOpBase, divisaRaw, mapaTasas) : { mNominal: montoRaw, tasaEfectiva: 0, meUSDT: montoRaw };
  const calc2 = typeof calcularLado === 'function' ? calcularLado(cfg2, signo2, montoRaw, tipoOpBase, divisaRaw, mapaTasas) : { mNominal: montoRaw, tasaEfectiva: 0, meUSDT: montoRaw };

  const m1 = sanitizarNumero(calc1.mNominal, montoRaw);
  const t1 = sanitizarNumero(calc1.tasaEfectiva, 0); // 👈 Tasa 0 si no existe
  const me1 = sanitizarNumero(calc1.meUSDT, m1);

  const m2 = sanitizarNumero(calc2.mNominal, montoRaw);
  const t2 = sanitizarNumero(calc2.tasaEfectiva, 0); // 👈 Tasa 0 si no existe
  const me2 = sanitizarNumero(calc2.meUSDT, m2);

  const s1Nombre = String(socio1Data?.nombre || 'GENERAL').trim();
  const s2Nombre = String(socio2Data?.nombre || 'GENERAL').trim();

  return {
    hash_largo: raw.hash_largo || raw.id,
    socio_1: s1Nombre,
    nombre_socio_1: s1Nombre,
    tipo_op1: tipoOpBase,
    monto_1: m1,
    m1_socio: m1,
    tasa_1: t1,
    me1: me1,
    polaridad_1: signo1 >= 0 ? '+' : '-',
    
    socio_2: (s2Nombre && s2Nombre.toUpperCase() !== 'GENERAL') ? s2Nombre : 'GENERAL',
    nombre_socio_2: (s2Nombre && s2Nombre.toUpperCase() !== 'GENERAL') ? s2Nombre : 'GENERAL',
    tipo_op2: tipoOpBase,
    monto_2: m2,
    m2_socio: m2,
    tasa_2: t2,
    me2: me2,
    polaridad_2: signo2 >= 0 ? '+' : '-',

    lote_tasa: raw?.id_tasa || tasaLote?.id_tasa || 'T070'
  };
}

module.exports = { calcularSnapshotFinanciero };
