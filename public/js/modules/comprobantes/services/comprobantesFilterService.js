/**
 * =================================================================
 * @file comprobantesFilterService.js
 * @path public/js/modules/comprobantes/services/comprobantesFilterService.js
 * @description Servicio atómico inmutable para filtrado exclusivo de socios y fechas.
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

  // 1. CORTAFUEGOS EXCLUSIVO DE SOCIOS (Socio 1 y Socio 2)
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

  // 2. FILTRADO CORREGIDO POR FECHA INICIO (CONVERSIÓN EXACTA A SEGUNDOS)
  if (filtros.filtroFechaInicio) {
    const dStr = String(filtros.filtroFechaInicio).trim(); // Formato esperado "YYYY-MM-DD"
    const dObj = new Date(dStr.includes('T') ? dStr : dStr + 'T00:00:00');
    
    if (!isNaN(dObj.getTime())) {
      // Convertimos los milisegundos a SEGUNDOS Unix
      const startTsSeconds = Math.floor(dObj.getTime() / 1000);

      resultado = resultado.filter(item => {
        let itemTs = parseInt(item.timestamp || item.timestamp_comprobante || 0);
        // Si el timestamp del item viene en milisegundos (mayor a 10 dígitos), lo llevamos a segundos
        if (itemTs > 9999999999) itemTs = Math.floor(itemTs / 1000);
        
        return itemTs >= startTsSeconds;
      });
    }
  }

  // 3. FILTRADO CORREGIDO POR FECHA FIN (CONVERSIÓN EXACTA A SEGUNDOS)
  if (filtros.filtroFechaFin) {
    const dStr = String(filtros.filtroFechaFin).trim();
    const dObj = new Date(dStr.includes('T') ? dStr : dStr + 'T23:59:59');
    
    if (!isNaN(dObj.getTime())) {
      const endTsSeconds = Math.floor(dObj.getTime() / 1000);

      resultado = resultado.filter(item => {
        let itemTs = parseInt(item.timestamp || item.timestamp_comprobante || 0);
        if (itemTs > 9999999999) itemTs = Math.floor(itemTs / 1000);

        return itemTs <= endTsSeconds;
      });
    }
  }

  return resultado;
}
