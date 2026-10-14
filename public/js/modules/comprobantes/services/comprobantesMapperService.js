/**
 * @file comprobantesMapperService.js
 * @description Mapeador passthrough cliente para API v2.
 */

export function obtenerInsigniaRol(rol) {
  const r = String(rol || '').toUpperCase().trim();
  switch (r) {
    case 'ADMIN': return '💎';
    case 'ASESOR': return '👔';
    case 'PROVEEDOR': return '🏦';
    case 'SOCIO': default: return '🤝';
  }
}

export function prepararEdicionComprobante(item, loteActivo = 'T071') {
  if (!item) return {};

  return {
    ...item,
    id: item.id || item.hash_largo,
    hash_largo: item.hash_largo || item.id,
    hash_corto: item.hash_corto || String(item.id || '').slice(0, 8).toUpperCase(),
    
    fecha_fmt: item.fecha_fmt || 'S/F',
    hora_fmt: item.hora_fmt || 'S/F',
    
    badge_1: obtenerInsigniaRol(item.rol_1 || item.grupo_1?.rol),
    badge_2: obtenerInsigniaRol(item.rol_2 || item.grupo_2?.rol)
  };
}
