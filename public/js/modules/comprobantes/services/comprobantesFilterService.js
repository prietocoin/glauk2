/**
 * =================================================================
 * @file comprobantesFilterService.js
 * @path public/js/modules/comprobantes/services/comprobantesFilterService.js
 * @description Servicio atómico de cortafuegos y ordenamiento (Fecha/Monto).
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

  // 1. CORTAFUEGOS DE SOCIO (Socio 1 o Socio 2)
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

  // 2. FILTRADO POR FECHA INICIO (fecha_hora_comprobante)
  if (filtros.filtroFechaInicio) {
    const startObj = new Date(String(filtros.filtroFechaInicio).trim() + 'T00:00:00');
    if (!isNaN(startObj.getTime())) {
      const startMs = startObj.getTime();

      resultado = resultado.filter(item => {
        const rawDate = item.fecha_hora_comprobante || item.created_at || item.fecha;
        if (!rawDate) return true;
        const itemMs = new Date(rawDate).getTime();
        return !isNaN(itemMs) ? itemMs >= startMs : true;
      });
    }
  }

  // 3. FILTRADO POR FECHA FIN (fecha_hora_comprobante)
  if (filtros.filtroFechaFin) {
    const endObj = new Date(String(filtros.filtroFechaFin).trim() + 'T23:59:59');
    if (!isNaN(endObj.getTime())) {
      const endMs = endObj.getTime();

      resultado = resultado.filter(item => {
        const rawDate = item.fecha_hora_comprobante || item.created_at || item.fecha;
        if (!rawDate) return true;
        const itemMs = new Date(rawDate).getTime();
        return !isNaN(itemMs) ? itemMs <= endMs : true;
      });
    }
  }

  // 4. ORDENAMIENTO COMPLETO SEGÚN LAS OPCIONES DE BARRAFILTROS (7. ORDENAR)
  const criterioOrden = String(filtros.filtroOrden || 'fecha_desc').toLowerCase();

  return [...resultado].sort((a, b) => {
    // A) Orden por Monto
    if (criterioOrden === 'monto_desc') {
      return (parseFloat(b.monto) || 0) - (parseFloat(a.monto) || 0);
    }
    if (criterioOrden === 'monto_asc') {
      return (parseFloat(a.monto) || 0) - (parseFloat(b.monto) || 0);
    }

    // B) Orden por Fecha
    const msA = new Date(a.fecha_hora_comprobante || 0).getTime();
    const msB = new Date(b.fecha_hora_comprobante || 0).getTime();

    if (criterioOrden === 'fecha_asc') {
      return msA - msB; // Antiguos primero (Ascendente)
    } else {
      return msB - msA; // Recientes primero (Descendente / Default)
    }
  });
}
