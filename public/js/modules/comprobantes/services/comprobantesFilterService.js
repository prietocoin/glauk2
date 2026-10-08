/**
 * @file comprobantesFilterService.js
 * @path public/js/modules/comprobantes/services/comprobantesFilterService.js
 * @description Servicio atómico exclusivo para la lógica de filtrado de comprobantes.
 */

export function limpiarFiltro(val) {
  if (!val) return '';
  const str = String(val).trim().toUpperCase();
  return (str === 'TODOS' || str === 'TODOS LOS SOCIOS') ? '' : val;
}

export function aplicarFiltrosComprobantes(rawItems = [], directorio = [], filtros = {}) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) return [];

  let resultado = [...rawItems];
  const socioBuscado = (filtros.filtroSocio || '').trim().toUpperCase();

  // 1. FILTRADO ESTRICTO POR SOCIO (Exclusivo Socio 1 o Socio 2)
  if (socioBuscado && socioBuscado !== 'TODOS' && socioBuscado !== 'TODOS LOS SOCIOS') {
    const sociosValidos = new Set([socioBuscado]);

    // Cruzar con directorio si existen herencias
    if (Array.isArray(directorio) && directorio.length > 0) {
      directorio.forEach(d => {
        const padre = String(d.padre || d.herencia || '').toUpperCase();
        const nombre = String(d.nombre || '').toUpperCase();
        if (padre === socioBuscado || nombre === socioBuscado) {
          if (d.nombre) sociosValidos.add(String(d.nombre).toUpperCase());
        }
      });
    }

    resultado = resultado.filter(item => {
      const s1 = String(item.nombre_socio_1 || item.socio_1 || '').trim().toUpperCase();
      const s2 = String(item.nombre_socio_2 || item.socio_2 || '').trim().toUpperCase();
      return sociosValidos.has(s1) || sociosValidos.has(s2);
    });
  }

  // 2. FILTRADO RANGO DE HASHES
  if (filtros.filtroDesdeHash || filtros.filtroHastaHash) {
    let idxDesde = 0;
    let idxHasta = resultado.length - 1;

    if (filtros.filtroDesdeHash) {
      const found = resultado.findIndex(c => c.hash_largo === filtros.filtroDesdeHash);
      if (found !== -1) idxDesde = found;
    }
    if (filtros.filtroHastaHash) {
      const found = resultado.findIndex(c => c.hash_largo === filtros.filtroHastaHash);
      if (found !== -1) idxHasta = found;
    }

    const start = Math.min(idxDesde, idxHasta);
    const end = Math.max(idxDesde, idxHasta);
    resultado = resultado.slice(start, end + 1);
  }

  return resultado;
}
