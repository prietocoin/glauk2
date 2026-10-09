/**
 * HANDLER HTTP PRINCIPAL DE LA API
 * Devuelve únicamente JSON puro.
 */
async function getComprobantesApi(req, res) {
  try {
    let comprobantesRaw = [];

    // Consulta flexible a la base de datos
    try {
      const { rows } = await db.query('SELECT * FROM comprobantes LIMIT 50');
      if (rows && rows.length > 0) comprobantesRaw = rows;
    } catch (e) {
      // Fallback a RemitHub si no hay tablas locales
      const responseRemit = await fetch(REMITHUB_BASE_URL);
      if (responseRemit.ok) {
        comprobantesRaw = await responseRemit.json();
      }
    }

    const listaData = Array.isArray(comprobantesRaw) ? comprobantesRaw : [comprobantesRaw];

    // Procesamiento en paralelo de los comprobantes
    const resultadoJSON = await Promise.all(
      listaData.map((item) => procesarComprobanteAtomi(item))
    );

    // 🟢 FORZAR RESPUESTA COMO JSON PURO EN CABECERAS Y CUERPO
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).json(resultadoJSON);

  } catch (err) {
    console.error('[comprobantesApiService ❌ Error Global]:', err);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(500).json({ 
      error: 'Error al procesar la API de comprobantes', 
      detalle: err.message 
    });
  }
}
