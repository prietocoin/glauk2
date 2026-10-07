/**
 * @file saldosFilterUtils.js
 * @description Utilidad pura para filtrar y recortar colecciones de comprobantes por fechas y hashes.
 */

/**
 * Filtra comprobantes por rango de fechas y límites por hash.
 * @param {Array} comprobantes 
 * @param {Object} filtros { fechaInicio, fechaFin, desdeHash, hastaHash }
 * @returns {Array}
 */
export function filtrarComprobantesPorRango(comprobantes = [], filtros = {}) {
  if (!Array.isArray(comprobantes)) return [];
  let resultado = [...comprobantes];

  if (filtros.fechaInicio) {
    const fInit = new Date(filtros.fechaInicio + 'T00:00:00').getTime();
    resultado = resultado.filter(c => {
      const t = c.fecha_hora_comprobante ? new Date(c.fecha_hora_comprobante).getTime() : ((c.timestamp || 0) * 1000);
      return t >= fInit;
    });
  }

  if (filtros.fechaFin) {
    const fFin = new Date(filtros.fechaFin + 'T23:59:59').getTime();
    resultado = resultado.filter(c => {
      const t = c.fecha_hora_comprobante ? new Date(c.fecha_hora_comprobante).getTime() : ((c.timestamp || 0) * 1000);
      return t <= fFin;
    });
  }

  if (filtros.desdeHash || filtros.hastaHash) {
    let idxDesde = 0;
    let idxHasta = resultado.length - 1;
    if (filtros.desdeHash) {
      const found = resultado.findIndex(c => c.hash_largo === filtros.desdeHash);
      if (found !== -1) idxDesde = found;
    }
    if (filtros.hastaHash) {
      const found = resultado.findIndex(c => c.hash_largo === filtros.hastaHash);
      if (found !== -1) idxHasta = found;
    }
    const start = Math.min(idxDesde, idxHasta);
    const end = Math.max(idxDesde, idxHasta);
    resultado = resultado.slice(start, end + 1);
  }

  return resultado;
}
