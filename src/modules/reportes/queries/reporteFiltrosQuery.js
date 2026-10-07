/**
 * @file reporteFiltrosQuery.js
 * @description Capa de datos atómica para la consulta de roles, entidades y hashes de reportes.
 */
const db = require('#config/database');
async function obtenerFiltrosReportes(rolParam) {
  const rolesQuery = `
    SELECT DISTINCT UPPER(TRIM(rol)) AS rol 
    FROM perfiles_glaukov 
    WHERE rol IS NOT NULL AND TRIM(rol) != ''
    ORDER BY rol ASC;
  `;

  let nombresQuery = `
    SELECT DISTINCT nombre FROM (
      SELECT nombre_socio_1 AS nombre, n1.rol AS rol 
      FROM cola_fb c 
      LEFT JOIN perfiles_glaukov n1 ON LOWER(n1.nombre) = LOWER(c.nombre_socio_1) 
      WHERE nombre_socio_1 IS NOT NULL AND nombre_socio_1 != ''
      UNION
      SELECT nombre_socio_2 AS nombre, n2.rol AS rol 
      FROM cola_fb c 
      LEFT JOIN perfiles_glaukov n2 ON LOWER(n2.nombre) = LOWER(c.nombre_socio_2) 
      WHERE nombre_socio_2 IS NOT NULL AND nombre_socio_2 != ''
      UNION
      SELECT nombre, rol 
      FROM perfiles_glaukov 
      WHERE rol IN ('SOCIO', 'MATRIZ_GENERAL', 'ASESOR', 'GRUPO', 'COMPRAS')
    ) s 
    WHERE nombre IS NOT NULL AND TRIM(nombre) != ''
  `;

  const params = [];
  if (rolParam && String(rolParam).trim().toUpperCase() !== 'TODOS') {
    params.push(String(rolParam).trim().toLowerCase());
    nombresQuery += ` AND LOWER(rol) = $1`;
  }
  nombresQuery += ` ORDER BY nombre ASC;`;

  const hashesQuery = `
    SELECT DISTINCT hash_corto AS hash
    FROM comprobantes_auditados_fb
    WHERE hash_corto IS NOT NULL AND hash_corto != ''
    ORDER BY hash_corto ASC LIMIT 100;
  `;

  const [rolesRes, nombresRes, hashesRes] = await Promise.all([
    db.query(rolesQuery),
    db.query(nombresQuery, params),
    db.query(hashesQuery)
  ]);

  return {
    roles: rolesRes.rows.map(r => r.rol),
    entidades: nombresRes.rows.map(r => r.nombre),
    hashes: hashesRes.rows.map(r => r.hash)
  };
}

module.exports = { obtenerFiltrosReportes };
