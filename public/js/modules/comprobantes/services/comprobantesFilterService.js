/**
 * @file comprobantesFilterService.js
 * @path public/js/modules/comprobantes/services/comprobantesFilterService.js
 * @description Servicio atómico de filtrado estricto por socio.
 */

export function limpiarFiltro(val) {
  if (!val) return '';
  const str = String(val).trim().toUpperCase();
  return (str === 'TODOS' || str === 'TODOS LOS SOCIOS') ? '' : val;
}

export function filtrarComprobantesPorSocio(listaBase = [], directorio = [], filtroSocio = '') {
  if (!Array.isArray(listaBase) || listaBase.length === 0) return [];

  const socioBuscado = (filtroSocio || '').trim().toUpperCase();

  if (!socioBuscado || socioBuscado === 'TODOS' || socioBuscado === 'TODOS LOS SOCIOS') {
    return listaBase;
  }

  const sociosValidos = new Set([socioBuscado]);
  if (Array.isArray(directorio) && directorio.length > 0) {
    directorio.forEach(d => {
      const padre = String(d.padre || d.herencia || '').toUpperCase();
      const nombre = String(d.nombre || '').toUpperCase();
      if (padre === socioBuscado || nombre === socioBuscado) {
        if (d.nombre) sociosValidos.add(String(d.nombre).toUpperCase());
      }
    });
  }

  // Compara exclusivamente los recuadros de socios en la tarjeta
  return listaBase.filter(item => {
    const s1 = String(item.nombre_socio_1 || item.socio_1 || '').trim().toUpperCase();
    const s2 = String(item.nombre_socio_2 || item.socio_2 || '').trim().toUpperCase();

    return sociosValidos.has(s1) || sociosValidos.has(s2);
  });
}
