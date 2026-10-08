/**
 * @file comprobantesFormatters.js
 * @description Funciones puras atómicas para formateo visual e insignias de comprobantes.
 */

export function formatMonto(val) {
  const num = parseFloat(val) || 0;
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatTasa(val) {
  const num = parseFloat(val) || 0;
  return num > 99.99 ? Math.trunc(num).toLocaleString('en-US') : num.toFixed(2);
}

export function obtenerME1(item) {
  if (!item) return 0;
  return item.me1 !== undefined && item.me1 !== null 
    ? item.me1 
    : (item.monto_1 !== undefined ? item.monto_1 : item.monto || 0);
}

export function obtenerME2(item) {
  if (!item) return 0;
  return item.me2 !== undefined && item.me2 !== null 
    ? item.me2 
    : (item.monto_2 !== undefined ? item.monto_2 : 0);
}

export function obtenerTasaSocioCalculada(item, numSocio) {
  if (!item) return 1.0;
  return numSocio === 1 ? (item.tasa_1 || 1.0) : (item.tasa_2 || 1.0);
}

export function claseInsignia(tipoOp) {
  const t = String(tipoOp || 'D').toUpperCase().trim();
  if (t === 'D') return 'bg-emerald-950 text-emerald-300 border-emerald-500/40';
  if (t === 'P') return 'bg-rose-950 text-rose-300 border-rose-500/40';
  if (t === 'A') return 'bg-cyan-950 text-cyan-300 border-cyan-500/40';
  return 'bg-slate-800 text-slate-300 border-slate-600';
}


/**
 * Formatea una fecha/ISO string a formato "Día HH:MM AM/PM" (ej: Jueves 09:37 AM)
 */
export function formatDiaHora(fechaStr) {
  if (!fechaStr) return 'S/F';
  
  // Normalizar si viene como datetime-local "YYYY-MM-DDTHH:mm"
  const iso = fechaStr.includes('T') ? fechaStr : fechaStr.replace(' ', 'T');
  const date = new Date(iso);
  
  if (isNaN(date.getTime())) return 'S/F';

  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const diaNombre = dias[date.getDay()];

  let horas = date.getHours();
  const minutos = String(date.getMinutes()).padStart(2, '0');
  const ampm = horas >= 12 ? 'PM' : 'AM';
  
  horas = horas % 12;
  horas = horas ? horas : 12; // La hora '0' pasa a ser '12'

  return `${diaNombre} ${String(horas).padStart(2, '0')}:${minutos} ${ampm}`;
}
