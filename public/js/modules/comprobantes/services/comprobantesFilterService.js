/**
 * @file comprobantesFilterService.js
 * @path public/js/modules/comprobantes/services/comprobantesFilterService.js
 * @description Servicio atómico de filtrado estricto por socio y rango de fechas.
 */

export function limpiarFiltro(val) {
  if (!val) return '';
  const str = String(val).trim().toUpperCase();
  return (str === 'TODOS' || str === 'TODOS LOS SOCIOS' || str === 'GENERAL') ? '' : val;
}

export function filtrarComprobantesPorSocio(listaBase = [], directorio = [], filtroSocio = '', rangoFechas = {}) {
  if (!Array.isArray(listaBase) || listaBase.length === 0) return [];

  let resultado = [...listaBase];
  const socioBuscado = (filtroSocio || '').trim().toUpperCase();

  // 1. FILTRO DE SOCIO
  if (socioBuscado && socioBuscado !== 'TODOS' && socioBuscado !== 'TODOS LOS SOCIOS') {
    const sociosValidos = new Set([socioBuscado]);
    if (Array.isArray(directorio) && directorio.length > 0) {
      directorio.forEach(d => {
        const padre = String(d.padre || d.herencia || '').trim().toUpperCase();
        const nombre = String(d.nombre || '').trim().toUpperCase();
        if (padre === socioBuscado || nombre === socioBuscado) {
          if (d.nombre) sociosValidos.add(String(d.nombre).trim().toUpperCase());
        }
      });
    }

    resultado = resultado.filter(item => {
      if (!item) return false;
      const s1 = String(item.nombre_socio_1 || item.socio_1 || '').trim().toUpperCase();
      const s2 = String(item.nombre_socio_2 || item.socio_2 || '').trim().toUpperCase();
      return sociosValidos.has(s1) || sociosValidos.has(s2);
    });
  }

  // 2. FILTRO ATÓMICO DE RANGO DE FECHAS (TIMESTAMP DE CARACAS/VET)
  if (rangoFechas.fechaInicio) {
    const startTs = Math.floor(new Date(rangoFechas.fechaInicio.trim() + 'T00:00:00-04:00').getTime() / 1000);
    if (!isNaN(startTs)) {
      resultado = resultado.filter(item => (parseInt(item.timestamp) || 0) >= startTs);
    }
  }

  if (rangoFechas.fechaFin) {
    const endTs = Math.floor(new Date(rangoFechas.fechaFin.trim() + 'T23:59:59-04:00').getTime() / 1000);
    if (!isNaN(endTs)) {
      resultado = resultado.filter(item => (parseInt(item.timestamp) || 0) <= endTs);
    }
  }

  return resultado;
}
