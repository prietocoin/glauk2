/**
 * @file comprobantesApiService.js
 * @description Peticiones HTTP REST para la gestión de comprobantes en glauk2.
 */

export async function obtenerComprobantes(params = {}) {
  try {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`/api/comprobantes${query ? `?${query}` : ''}`);
    if (!response.ok) throw new Error('Error al consultar comprobantes');
    const res = await response.json();
    return Array.isArray(res) ? res : [];
  } catch (err) {
    console.error('[comprobantesApiService ❌ Error al obtener comprobantes]:', err);
    return [];
  }
}

export async function guardarCambiosComprobante(hashLargo, itemEdicion, loteActivo = 'T052') {
  if (!hashLargo || !itemEdicion) return false;

  let timestamp = itemEdicion.timestamp;
  if (itemEdicion.fecha_hora_input) {
    const ts = Math.floor(new Date(itemEdicion.fecha_hora_input).getTime() / 1000);
    if (!isNaN(ts) && ts > 0) timestamp = ts;
  }

  const montoEditado = Math.abs(parseFloat(itemEdicion.monto || 0));
  const divisaEditada = (itemEdicion.moneda || 'USDT').toUpperCase();
  const loteSeleccionado = (itemEdicion.lote_tasa_asignado || itemEdicion.lote_tasa || loteActivo).toUpperCase().trim();

  const payload = {
    monto: montoEditado,
    moneda: divisaEditada,
    banco: itemEdicion.banco,
    referencia: itemEdicion.referencia,
    titular: itemEdicion.titular,
    tipo_manual: itemEdicion.tipo_manual || 'P',
    nombre_socio_1: itemEdicion.nombre_socio_1 || 'GENERAL',
    socio_1: itemEdicion.nombre_socio_1 || 'GENERAL',
    nombre_socio_2: itemEdicion.nombre_socio_2 || 'GENERAL',
    socio_2: itemEdicion.nombre_socio_2 || 'GENERAL',
    lote_tasa_asignado: loteSeleccionado,
    lote_tasa: loteSeleccionado,
    id_tasa: loteSeleccionado,
    ...(timestamp ? { timestamp } : {})
  };

  try {
    const response = await fetch(`/api/comprobantes/${encodeURIComponent(hashLargo)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const res = await response.json();
    return Boolean(response.ok && (res.success || res.status === 'SUCCESS'));
  } catch (err) {
    console.error('[comprobantesApiService ❌ Error al guardar comprobante]:', err);
    return false;
  }
}

export async function eliminarComprobantePorHash(hashLargo) {
  if (!hashLargo || !confirm('¿Deseas eliminar este comprobante?')) return false;
  try {
    const response = await fetch(`/api/comprobantes/${encodeURIComponent(hashLargo)}`, {
      method: 'DELETE'
    });
    const res = await response.json();
    return Boolean(response.ok && res.success);
  } catch (err) {
    console.error('[comprobantesApiService ❌ Error al eliminar comprobante]:', err);
    return false;
  }
}
