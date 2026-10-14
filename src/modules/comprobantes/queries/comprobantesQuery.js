/**
 * @file comprobantesQuery.js
 * @description Capa de acceso a datos (Query) pura para la tabla comprobantes_final.
 */
const db = require('#config/database');

function obtenerInicioMesCaracas() {
  const timeZone = 'America/Caracas';
  const ahora = new Date();
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  
  const primerDia = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  return `${fmt.format(primerDia)} 00:00:00`;
}

/**
 * Consulta la tabla comprobantes_final de forma directa, rápida y modulada.
 */
async function obtenerComprobantesCompletos(socio = null, opciones = {}) {
  const params = [];
  let paramIndex = 1;

  let whereClause = "WHERE 1=1";

  // 1. FILTRO DE RANGO DE FECHAS (MES ACTUAL POR DEFECTO)
  const fechaInicioStr = opciones.fechaInicio ? `${opciones.fechaInicio} 00:00:00` : obtenerInicioMesCaracas();
  whereClause += ` AND (fecha_hora_iso >= $${paramIndex} OR fecha_fmt >= $${paramIndex})`;
  params.push(fechaInicioStr);
  paramIndex++;

  if (opciones.fechaFin) {
    whereClause += ` AND (fecha_hora_iso <= $${paramIndex} OR fecha_fmt <= $${paramIndex})`;
    params.push(`${opciones.fechaFin} 23:59:59`);
    paramIndex++;
  }

  // 2. FILTRO DE SOCIO (Socio 1 o Socio 2)
  if (socio && socio.trim() !== '' && socio !== 'undefined' && socio !== 'null' && socio.toUpperCase() !== 'TODOS') {
    whereClause += ` AND (
      LOWER(COALESCE(nombre_socio_1, socio_1, '')) LIKE LOWER($${paramIndex}) OR
      LOWER(COALESCE(nombre_socio_2, socio_2, '')) LIKE LOWER($${paramIndex}) OR
      LOWER(COALESCE(titular, '')) LIKE LOWER($${paramIndex})
    )`;
    params.push(`%${socio.trim()}%`);
    paramIndex++;
  }

  // 3. PAGINACIÓN Y LÍMITE DINÁMICO
  const limitValue = parseInt(opciones.limit, 10) || 500;
  const pageValue = parseInt(opciones.page, 10) || 1;
  const offsetValue = (pageValue - 1) * limitValue;

  const sql = `
    SELECT *
    FROM comprobantes_final
    ${whereClause}
    ORDER BY fecha_hora_iso DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
  `;

  params.push(limitValue, offsetValue);

  const { rows } = await db.query(sql, params);
  return rows || [];
}

module.exports = { obtenerComprobantesCompletos };
