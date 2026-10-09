/**
 * @file comprobantesLecturaService.js
 * @path public/js/modules/comprobantes/services/comprobantesLecturaService.js
 * @description Servicio atómico de lectura HTTP para PostgreSQL/V2 con mapeo reactivo.
 */

export async function obtenerComprobantes(params = {}) {
  try {
    const query = new URLSearchParams();

    if (params.socio && params.socio.toUpperCase() !== 'TODOS' && params.socio.toUpperCase() !== 'TODOS LOS SOCIOS') {
      query.append('socio', params.socio.trim());
    }

    if (params.rol && params.rol.toUpperCase() !== 'TODOS') query.append('rol', params.rol.trim());
    
    // Soporte transparente para filtroFechaInicio o filtroFecha
    const fInicio = params.fechaInicio || params.fecha;
    if (fInicio) query.append('fechaInicio', fInicio.trim());
    if (params.fechaFin) query.append('fechaFin', params.fechaFin.trim());

    if (params.desdeHash) query.append('desdeHash', params.desdeHash.trim());
    if (params.hastaHash) query.append('hastaHash', params.hastaHash.trim());
    if (params.hash) query.append('hash', params.hash.trim());
    if (params.orden) query.append('orden', params.orden.trim());

    // 🟢 APUNTE DIRECTO A LA API V2
    const response = await fetch(`/api/v2/comprobantes?${query.toString()}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const rawData = await response.json();
    const lista = Array.isArray(rawData) ? rawData : [rawData];

    // 🟢 MAPEO PLANO: Transforma el payload V2 al contrato que consumen las tarjetas Alpine.js
    return lista.map((item) => {
      const c = item.comprobante || item;
      const g1 = c.grupo_1 || {};
      const g2 = c.grupo_2 || {};

      return {
        ...c,
        lote_tasa: c.lote,
        lote_tasa_asignado: c.lote,
        monto: c.monto,
        moneda: c.moneda,
        banco: c.banco,
        titular: c.titular,
        referencia: c.referencia,
        tipo_op1: c.tipo,
        naturaleza: c.tipo,
        link_img: c.link_img,
        
        // Mapeo Plano Grupo 1
        nombre_socio_1: g1.nombre_1,
        socio_1: g1.nombre_1,
        tasa_1: g1.tasa_1,
        polaridad_1: g1.polaridad_1,
        monto_1: g1.monto_1,
        m1_socio: g1.monto_1,
        moneda_base_socio1: g1.moneda_base_1,
        me1: g1.me_1,

        // Mapeo Plano Grupo 2
        nombre_socio_2: g2.nombre_2,
        socio_2: g2.nombre_2,
        tasa_2: g2.tasa_2,
        polaridad_2: g2.polaridad_2,
        monto_2: g2.monto_2,
        m2_socio: g2.monto_2,
        moneda_base_socio2: g2.moneda_base_2,
        me2: g2.me_2
      };
    });
  } catch (error) {
    console.error('[comprobantesLecturaService ❌ Error al obtener comprobantes V2]:', error);
    return [];
  }
}
