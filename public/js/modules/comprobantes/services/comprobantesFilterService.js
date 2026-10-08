/**
 * @file comprobantesFilterService.js
 * @path public/js/modules/comprobantes/services/comprobantesFilterService.js
 * @description Servicio atómico de cortafuegos estricto (Socio + Rango de Fechas).
 */

export function limpiarFiltro(val) {
  if (!val) return '';
  const str = String(val).trim().toUpperCase();
  return (str === 'TODOS' || str === 'TODOS LOS SOCIOS' || str === 'GENERAL') ? '' : val;
}

export function filtrarComprobantesAtómico(listaBase = [], directorio = [], filtros = {}) {
  if (!Array.isArray(listaBase) || listaBase.length === 0) return [];

  let resultado = [...listaBase];
  const socioBuscado = limpiarFiltro(filtros.filtroSocio).toUpperCase();

  // 1. CORTAFUEGOS ESTRICTO DE SOCIO (Socio 1 o Socio 2)
  if (socioBuscado) {
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

  // 2. CORTAFUEGOS DE FECHA INICIO (VET / Caracas)
  if (filtros.filtroFechaInicio) {
    const startTs = Math.floor(new Date(filtros.filtroFechaInicio.trim() + 'T00:00:00-04:00').getTime() / 1000);
    if (!isNaN(startTs)) {
      resultado = resultado.filter(item => (parseInt(item.timestamp) || 0) >= startTs);
    }
  }

  // 3. CORTAFUEGOS DE FECHA FIN (VET / Caracas)
  if (filtros.filtroFechaFin) {
    const endTs = Math.floor(new Date(filtros.filtroFechaFin.trim() + 'T23:59:59-04:00').getTime() / 1000);
    if (!isNaN(endTs)) {
      resultado = resultado.filter(item => (parseInt(item.timestamp) || 0) <= endTs);
    }
  }

  return resultado;
}
