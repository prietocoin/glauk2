/**
 * @file comprobantesFilterService.js
 * @path public/js/modules/comprobantes/services/comprobantesFilterService.js
 * @description Servicio atómico de filtrado estricto por socio sin alterar el estado.
 */

export function limpiarFiltro(val) {
  if (!val) return '';
  const str = String(val).trim().toUpperCase();
  return (str === 'TODOS' || str === 'TODOS LOS SOCIOS') ? '' : val;
}

/**
 * Filtra comprobantes comparando de forma estricta contra Socio 1 o Socio 2,
 * imitando la cláusula SQL original de PostgreSQL.
 */
export function filtrarComprobantesPorSocio(listaBase = [], directorio = [], filtroSocio = '') {
  if (!Array.isArray(listaBase) || listaBase.length === 0) return [];

  const socioBuscado = (filtroSocio || '').trim().toUpperCase();

  // Si no hay filtro o es global, devuelve toda la lista
  if (!socioBuscado || socioBuscado === 'TODOS' || socioBuscado === 'TODOS LOS SOCIOS') {
    return listaBase;
  }

  // 1. Mapear socios válidos (incluyendo herencias de la tabla nombres_fb si existen)
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

  // 2. Compara EXCLUSIVAMENTE sobre las propiedades de Socio 1 y Socio 2
  return listaBase.filter(item => {
    if (!item) return false;

    // Extracción limpia de Socio 1 y Socio 2
    const s1 = String(item.nombre_socio_1 || item.socio_1 || item.fb_socio_1 || '').trim().toUpperCase();
    const s2 = String(item.nombre_socio_2 || item.socio_2 || item.fb_socio_2 || '').trim().toUpperCase();

    // Solo aprueba si Socio 1 o Socio 2 coinciden exactamente con el socio buscado
    return sociosValidos.has(s1) || sociosValidos.has(s2);
  });
}
