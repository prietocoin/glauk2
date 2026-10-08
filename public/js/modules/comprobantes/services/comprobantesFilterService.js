/**
 * =================================================================
 * @file comprobantesFilterService.js
 * @path public/js/modules/comprobantes/services/comprobantesFilterService.js
 * @description Servicio atómico exclusivo para reglas de filtrado (Socio 1, Socio 2 y Fechas).
 * =================================================================
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

  // 1. FILTRADO ESTRICTO POR SOCIO (Exclusivamente Socio 1 y Socio 2)
  if (socioBuscado) {
    const sociosValidos = new Set([socioBuscado]);
    
    // Cruzar con directorio si existen alias/herencias
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

  // 2. FILTRADO POR FECHA INICIO
  if (filtros.filtroFechaInicio) {
    const dStr = String(filtros.filtroFechaInicio).trim();
    const dObj = new Date(dStr.includes('T') ? dStr : dStr + 'T00:00:00');
    if (!isNaN(dObj.getTime())) {
      const startTs = Math.floor(dObj.getTime() / 1000);
      resultado = resultado.filter(item => (parseInt(item.timestamp) || 0) >= startTs);
    }
  }

  // 3. FILTRADO POR FECHA FIN
  if (filtros.filtroFechaFin) {
    const dStr = String(filtros.filtroFechaFin).trim();
    const dObj = new Date(dStr.includes('T') ? dStr : dStr + 'T23:59:59');
    if (!isNaN(dObj.getTime())) {
      const endTs = Math.floor(dObj.getTime() / 1000);
      resultado = resultado.filter(item => (parseInt(item.timestamp) || 0) <= endTs);
    }
  }

  return resultado;
}
