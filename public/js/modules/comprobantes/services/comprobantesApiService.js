/**
 * @file comprobantesApiService.js
 * @description API externa independiente que consulta perfiles_glaukov, tasas_glaukov y TasasHub.
 */

const db = require('../config/db'); // Tu conexión/pool a PostgreSQL
const TASASHUB_BASE_URL = process.env.TASASHUB_URL || 'https://automat-tasashub.fyi6ur.easypanel.host/api/v1/tasas/calcular';

/**
 * 1. Consulta el perfil completo de un socio en perfiles_glaukov
 */
async function obtenerPerfilSocio(nombreSocio) {
  if (!nombreSocio || nombreSocio === 'GENERAL') return null;
  
  const query = `
    SELECT nombre, id_grupo, moneda_base, monedas 
    FROM perfiles_glaukov 
    WHERE UPPER(nombre) = UPPER($1) 
    LIMIT 1;
  `;
  const { rows } = await db.query(query, [nombreSocio.trim()]);
  return rows[0] || null;
}

/**
 * 2. Consulta el lote de cotización en tasas_glaukov para cálculo de equivalentes (ME)
 */
async function obtenerLoteTasasGlaukov(idLote) {
  if (!idLote) return null;
  
  const query = `
    SELECT id_tasa, tasas, fecha 
    FROM tasas_glaukov 
    WHERE UPPER(id_tasa) = UPPER($1) 
    LIMIT 1;
  `;
  const { rows } = await db.query(query, [idLote.trim()]);
  return rows[0] || null;
}

/**
 * 3. Consulta el motor de TasasHub vía HTTP
 */
async function consultarTasasHub(socio, lote) {
  try {
    if (!socio || socio === 'GENERAL') return null;
    const url = `${TASASHUB_BASE_URL}/${encodeURIComponent(socio)}?lote=${encodeURIComponent(lote)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

/**
 * Helper para extraer compra o venta desde tarjetas_paises
 */
function extraerTasaHub(dataHub, moneda, tipo) {
  if (!dataHub || !Array.isArray(dataHub.tarjetas_paises)) return 'N/A';
  
  const target = String(moneda).toUpperCase();
  const tarjeta = dataHub.tarjetas_paises.find(t => String(t.code).toUpperCase() === target);
  
  if (!tarjeta) return 'N/A';
  
  if (tipo === 'D') return Number(tarjeta.compra) > 0 ? Number(tarjeta.compra) : 'N/A';
  if (tipo === 'P') return Number(tarjeta.venta) > 0 ? Number(tarjeta.venta) : 'N/A';
  
  return 'N/A';
}

/**
 * HANDLER PRINCIPAL DE LA API
 * GET /api/v2/comprobantes
 */
async function getComprobantesApi(req, res) {
  try {
    // Lectura de los comprobantes base de la DB o RemitHub
    const { rows: comprobantes } = await db.query('SELECT * FROM comprobantes ORDER BY fecha DESC LIMIT 50');

    const respuestaAPI = await Promise.all(
      comprobantes.map(async (item) => {
        const lote = item.lote_tasa || 'T001';
        const monto = Math.abs(Number(item.monto || item.monto_local || 0));
        const moneda = String(item.moneda || '').toUpperCase().trim();

        // Nombres raw
        const rawS1 = item.socio_1 || item.nombre_socio_1 || 'GENERAL';
        const rawS2 = item.socio_2 || item.nombre_socio_2 || 'GENERAL';

        // Consulta en paralelo a PostgreSQL y TasasHub
        const [perfil1, perfil2, loteGlaukov, dataHub1, dataHub2] = await Promise.all([
          obtenerPerfilSocio(rawS1),
          obtenerPerfilSocio(rawS2),
          obtenerLoteTasasGlaukov(lote),
          consultarTasasHub(rawS1, lote),
          consultarTasasHub(rawS2, lote)
        ]);

        const monBase1 = perfil1?.moneda_base || item.moneda_base_socio1 || 'USDT';
        const monBase2 = perfil2?.moneda_base || item.moneda_base_socio2 || 'USDT';

        // Determinación del tipo
        let tipoCalculado = item.tipo || item.naturaleza;
        if (!tipoCalculado || tipoCalculado === 'D') {
          if (moneda === monBase1) {
            tipoCalculado = 'A';
          } else {
            tipoCalculado = perfil1?.monedas?.[moneda]?.tipo || 'P';
          }
        }

        // Tasas
        const tasa1 = tipoCalculado === 'A' || monBase1 === moneda ? 1.00 : extraerTasaHub(dataHub1, moneda, tipoCalculado);
        const tasa2 = tipoCalculado === 'A' || monBase2 === moneda ? 1.00 : extraerTasaHub(dataHub2, moneda, tipoCalculado);

        // Montos
        const numT1 = Number(tasa1);
        const numT2 = Number(tasa2);
        const monto1 = !isNaN(numT1) && numT1 > 0 ? Number((monto / numT1).toFixed(2)) : monto;
        const monto2 = !isNaN(numT2) && numT2 > 0 ? Number((monto / numT2).toFixed(2)) : monto;

        // ME1 / ME2 desde tasas_glaukov
        const tasaMeBase = Number(loteGlaukov?.tasas?.[moneda] || 1);
        const me1 = tasaMeBase > 0 ? Number((monto / tasaMeBase).toFixed(2)) : monto1;
        const me2 = tasaMeBase > 0 ? Number((monto / tasaMeBase).toFixed(2)) : monto2;

        return {
          comprobante: {
            lote,
            monto,
            moneda,
            banco: item.banco || '',
            titular: item.titular || '',
            referencia: item.referencia || '',
            tipo: tipoCalculado,
            link_img: item.url_r2_comprobante || item.link_img || '',
            grupo_1: {
              nombre_1: perfil1?.nombre || rawS1,
              tasa_1: tasa1,
              polaridad_1: perfil1?.monedas?.[moneda]?.polaridad || '+',
              monto_1: monto1,
              moneda_base_1: monBase1,
              me_1: me1
            },
            grupo_2: {
              nombre_2: perfil2?.nombre || rawS2,
              tasa_2: tasa2,
              polaridad_2: perfil2?.monedas?.[moneda]?.polaridad || '+',
              monto_2: monto2,
              moneda_base_2: monBase2,
              me_2: me2
            }
          }
        };
      })
    );

    return res.status(200).json(respuestaAPI);
  } catch (err) {
    console.error('[API Comprobantes ❌ Error]:', err);
    return res.status(500).json({ error: 'Error interno en la consulta de comprobantes', detalle: err.message });
  }
}

module.exports = {
  getComprobantesApi
};
