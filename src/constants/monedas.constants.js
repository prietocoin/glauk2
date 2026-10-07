/**
 * @file monedas.constants.js
 * @description Catálogo maestro de monedas y banderas para el Backend en glauk2 (CommonJS).
 * Sincronizado 1:1 con public/js/shared/constants/listaMonedasActivas.js
 */

const LISTA_MONEDAS_ACTIVAS = Object.freeze([
  { code: 'ARS', label: 'ARS (Peso Argentino)', nombre: 'Argentina', bandera: '🇦🇷' },
  { code: 'BOB', label: 'BOB (Boliviano)', nombre: 'Bolivia', bandera: '🇧🇴' },
  { code: 'BRL', label: 'BRL (Real Brasileño)', nombre: 'Brazil', bandera: '🇧🇷' },
  { code: 'CAD', label: 'CAD (Dólar Canadiense)', nombre: 'Canada', bandera: '🇨🇦' },
  { code: 'CLP', label: 'CLP (Peso Chileno)', nombre: 'Chile', bandera: '🇨🇱' },
  { code: 'COP', label: 'COP (Peso Colombiano)', nombre: 'Colombia', bandera: '🇨🇴' },
  { code: 'CRC', label: 'CRC (Colón Costarricense)', nombre: 'Costa Rica', bandera: '🇨🇷' },
  { code: 'DOP', label: 'DOP (Peso Dominicano)', nombre: 'Dominicana', bandera: '🇩🇴' },
  { code: 'ECU', label: 'ECU (Dólar Ecuador)', nombre: 'Ecuador', bandera: '🇪🇨' },
  { code: 'EUR', label: 'EUR (Euro)', nombre: 'Europa', bandera: '🇪🇺' },
  { code: 'MXN', label: 'MXN (Peso Mexicano)', nombre: 'Mexico', bandera: '🇲🇽' },
  { code: 'PAN', label: 'PAN (Balboa / Dólar Panamá)', nombre: 'Panamá', bandera: '🇵🇦' },
  { code: 'PEN', label: 'PEN (Sol Peruano)', nombre: 'Peru', bandera: '🇵🇪' },
  { code: 'PYG', label: 'PYG (Guaraní Paraguayo)', nombre: 'Paraguay', bandera: '🇵🇾' },
  { code: 'PYUSD', label: 'PYUSD (PayPal USD)', nombre: 'PYUSD', bandera: '🪙' },
  { code: 'USD', label: 'USD (EEUU - Zelle)', nombre: 'EEUU-Zelle', bandera: '🇺🇸' },
  { code: 'USDT', label: 'USDT (Tether)', nombre: 'USDT', bandera: '🪙' },
  { code: 'VES', label: 'VES (Bolívar Venezolano)', nombre: 'Venezuela', bandera: '🇻🇪' }
]);

const BANDERAS_MAP = Object.freeze(
  LISTA_MONEDAS_ACTIVAS.reduce((acc, m) => ({ ...acc, [m.code]: m.bandera }), {})
);

const MAPA_MONEDAS = Object.freeze(
  LISTA_MONEDAS_ACTIVAS.reduce((acc, m) => ({ ...acc, [m.nombre]: m.code }), {})
);

function obtenerInfoMonedasMaestra() {
  return LISTA_MONEDAS_ACTIVAS.reduce((acc, m) => {
    acc[m.code] = { nombre: m.nombre, bandera: m.bandera };
    return acc;
  }, {});
}

module.exports = {
  LISTA_MONEDAS_ACTIVAS,
  BANDERAS_MAP,
  MAPA_MONEDAS,
  obtenerInfoMonedasMaestra
};
