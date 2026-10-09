function calcularSnapshotFinanciero(raw, socio1Data, socio2Data, tasaLote, funddaData = null, naturalezaCalculada = null) {
  const montoRaw = Math.abs(parseFloat(String(raw?.monto || 0).replace(/,/g, '')) || 0);
  const divisaRaw = String(raw?.moneda || 'USDT').toUpperCase().trim();
  const monedaSocio1 = String(socio1Data?.moneda_base || socio1Data?.moneda_socio || 'USDT').toUpperCase().trim();

  // 1. Prioridad: Naturaleza calculada por regla imperativa/perfil
  let tipoOpBase = naturalezaCalculada || String(raw?.tipo_manual || raw?.tipo_op || 'D').toUpperCase().trim().charAt(0);

  // 2. Regla Imperativa Backup
  if (monedaSocio1 === divisaRaw && socio1Data?.nombre && socio1Data.nombre.toUpperCase() !== 'GENERAL') {
    tipoOpBase = 'A';
  }

  const cfg1 = resolverConfigSocio(socio1Data, divisaRaw, funddaData);
  const cfg2 = resolverConfigSocio(socio2Data, divisaRaw, funddaData);

  const getSigno = (cfg) => (!cfg.activo || tipoOpBase === 'A') ? 1 : (cfg.confDivisa.polaridad !== '-' ? (tipoOpBase === 'D' ? 1 : -1) : (tipoOpBase === 'D' ? -1 : 1));
  let signo1 = getSigno(cfg1);
  let signo2 = getSigno(cfg2);

  if (cfg1.activo && cfg2.activo) {
    if (cfg1.hereda && !cfg2.hereda) signo1 = -1 * signo2;
    else if (cfg2.hereda && !cfg1.hereda) signo2 = -1 * signo1;
  }

  const mapaTasas = tasaLote?.tasas || {};
  const calc1 = calcularLado(cfg1, signo1, montoRaw, tipoOpBase, divisaRaw, mapaTasas);
  const calc2 = calcularLado(cfg2, signo2, montoRaw, tipoOpBase, divisaRaw, mapaTasas);

  return {
    hash_largo: raw.hash_largo,
    socio_1: socio1Data?.nombre || 'GENERAL',
    tipo_op1: tipoOpBase, // 👈 Pasa solo 'A', 'P' o 'D' limpios
    monto_1: isNaN(calc1.mNominal) ? 0 : calc1.mNominal,
    tasa_1: isNaN(calc1.tasaEfectiva) ? 1.0 : calc1.tasaEfectiva,
    me1: isNaN(calc1.meUSDT) ? 0 : calc1.meUSDT,
    socio_2: socio2Data?.nombre && socio2Data.nombre.toUpperCase() !== 'GENERAL' ? socio2Data.nombre : null,
    tipo_op2: tipoOpBase,
    monto_2: isNaN(calc2.mNominal) ? 0 : calc2.mNominal,
    tasa_2: isNaN(calc2.tasaEfectiva) ? 1.0 : calc2.tasaEfectiva,
    me2: isNaN(calc2.meUSDT) ? 0 : calc2.meUSDT,
    lote_tasa: raw?.id_tasa || tasaLote?.id_tasa || 'T052'
  };
}
