/**
 * @file comprobantesFilterService.js
 * @path public/js/modules/comprobantes/services/comprobantesFilterService.js
 * @description Servicio atómico de filtrado estricto EXCLUSIVO para casillas de socio.
 */

export function limpiarFiltro(val) {
  if (!val) return '';
  const str = String(val).trim().toUpperCase();
  return (str === 'TODOS' || str === 'TODOS LOS SOCIOS' || str === 'GENERAL') ? '' : val;
}

/**
 * Filtra la lista evaluando ÚNICAMENTE los recuadros visuales de Socio 1 y Socio 2.
 * Ignora por completo titulares bancarios, bancos, referencias o metadatos.
 */
export function filtrarComprobantesPorSocio(listaBase = [], directorio = [], filtroSocio = '') {
  if (!Array.isArray(listaBase) || listaBase.length === 0) return [];

  const socioBuscado = (filtroSocio || '').trim().toUpperCase();

  // Si no hay filtro o es "Todos", deja pasar la lista intacta
  if (!socioBuscado || socioBuscado === 'TODOS' || socioBuscado === 'TODOS LOS SOCIOS') {
    return listaBase;
  }

  // Set de nombres autorizados (Socio buscado + herencias del directorio)
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

  return listaBase.filter(item => {
    if (!item) return false;

    // ⛔ LEEMOS EXCLUSIVAMENTE LAS CASILLAS DE SOCIOS (IGNORANDO TITULAR/BANCO)
    const s1 = String(item.nombre_socio_1 || item.socio_1 || '').trim().toUpperCase();
    const s2 = String(item.nombre_socio_2 || item.socio_2 || '').trim().toUpperCase();

    // Compara igualdad estricta contra el Set de socios
    const coincideSocio1 = sociosValidos.has(s1);
    const coincideSocio2 = sociosValidos.has(s2);

    return coincideSocio1 || coincideSocio2;
  });
}
