/**
 * @file mapperConstants.js
 * @description Mapeos estáticos de banderas y nombres de país para el dominio de tasas en glauk2.
 */

const BANDERAS_MAP = Object.freeze({
  ARS: '🇦🇷', BOB: '🇧🇴', BRL: '🇧🇷', CAD: '🇨🇦', CLP: '🇨🇱',
  COP: '🇨🇴', CRC: '🇨🇷', DOP: '🇩🇴', ECU: '🇪🇨', EUR: '🇪🇺',
  MXN: '🇲🇽', PAN: '🇵🇦', PEN: '🇵🇪', PYG: '🇵🇾', PYUSD: '🪙',
  USD: '🇺🇸', USDT: '🪙', VES: '🇻🇪'
});

const MAPA_MONEDAS = Object.freeze({
  ARS: 'Argentina', BOB: 'Bolivia', BRL: 'Brasil', CAD: 'Canadá', CLP: 'Chile',
  COP: 'Colombia', CRC: 'Costa Rica', DOP: 'Dominicana', ECU: 'Ecuador', EUR: 'Europa',
  MXN: 'México', PAN: 'Panamá', PEN: 'Perú', PYG: 'Paraguay', PYUSD: 'PYUSD',
  USD: 'EEUU-Zelle', USDT: 'USDT', VES: 'Venezuela'
});

module.exports = {
  BANDERAS_MAP,
  MAPA_MONEDAS
};
