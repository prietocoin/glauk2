/**
 * @file comprobantesSaldosService.js
 * @path public/js/modules/comprobantes/services/comprobantesSaldosService.js
 * @description Servicio atómico para resolución de saldos iniciales desde directorio.
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
