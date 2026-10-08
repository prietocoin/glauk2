/**
 * @file comprobantesFilterService.js
 * @path public/js/modules/comprobantes/services/comprobantesFilterService.js
 * @description Servicio atómico de filtrado estricto y desinfección para comprobantes.
 */

/**
 * Normaliza y desinfecta valores por defecto ('TODOS', 'TODOS LOS SOCIOS') para la API.
 */
export function limpiarFiltro(val) {
  if (!val) return '';
  const str = String(val).trim().toUpperCase();
  return (str === 'TODOS' || str === 'TODOS LOS SOCIOS') ? '' : val;
}

/**
 * Filtra comprobantes de forma estricta comparando únicamente Socio 1 y Socio 2,
 * cruzando alias y herencias desde el directorio.
 */
export function filtrarComprobantesPorSocio(rawItems = [], directorio = [], filtroSocio = '') {
  if (!Array.isArray(rawItems) || rawItems.length === 0) return [];

  const socioBuscado = (filtroSocio || '').trim().toUpperCase();

  // Si no hay filtro o es global, devuelve la lista completa
  if (!socioBuscado || socioBuscado === 'TODOS' || socioBuscado === 'TODOS LOS SOCIOS') {
    return rawItems;
  }

  // Set de validación con directorio para alias / herencias
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

  // Filtro estricto exclusivo en Socio 1 y Socio 2 (Descarta Titular Bancario)
  return rawItems.filter(item => {
    const s1 = String(item?.nombre_socio_1 || item?.socio_1 || '').trim().toUpperCase();
    const s2 = String(item?.nombre_socio_2 || item?.socio_2 || '').trim().toUpperCase();

    return sociosValidos.has(s1) || sociosValidos.has(s2);
  });
}
