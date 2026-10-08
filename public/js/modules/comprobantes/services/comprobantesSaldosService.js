/**
 * =================================================================
 * @file comprobantesSaldosService.js
 * @path public/js/modules/comprobantes/services/comprobantesSaldosService.js
 * @description Servicio atómico para resolución de saldos e identificación del sujeto auditado.
 * =================================================================
 */

export function obtenerSaldoAnteriorSocio(directorio = [], socioNombre = '') {
  const socioNom = (socioNombre || '').trim().toUpperCase();
  if (!socioNom || socioNom === 'TODOS' || socioNom === 'TODOS LOS SOCIOS') {
    return 0;
  }

  const socioFound = (directorio || []).find(d => (d.nombre || '').trim().toUpperCase() === socioNom);
  const saldoVal = socioFound?.saldo_inicial ?? socioFound?.saldo_anterior;
  
  return (saldoVal !== undefined && saldoVal !== null) ? parseFloat(saldoVal) || 0 : 0;
}

/**
 * Resuelve el texto exacto para la tarjeta de entidad auditada
 */
export function obtenerSujetoAuditado(filtroSocio = '') {
  const socioNom = String(filtroSocio || '').trim().toUpperCase();
  if (!socioNom || socioNom === 'TODOS' || socioNom === 'TODOS LOS SOCIOS' || socioNom === 'GENERAL') {
    return 'TODOS LOS SOCIOS';
  }
  return socioNom;
}
