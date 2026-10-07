/**
 * @file reporteWhatsappService.js
 * @description Servicio atómico para el envío de payloads de reportes al webhook de n8n.
 */
async function enviarReporteWhatsApp(datos) {
  const { socio, remoteJid, saldoAnterior, movimiento, nuevoSaldo, moneda, comprobantes } = datos;

  if (!remoteJid || !remoteJid.trim()) {
    throw new Error('El socio no posee un JID válido en el Directorio.');
  }

  const webhookUrl = process.env.N8N_REPORTES_WEBHOOK || 'https://nochon.jairokov.com/webhook/reportes-whatsapp';

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      socio, remoteJid, saldoAnterior, movimiento, nuevoSaldo, moneda, comprobantes,
      fechaEnvio: new Date().toISOString()
    })
  });

  if (!response.ok) {
    throw new Error(`n8n respondió con estatus HTTP ${response.status}`);
  }

  return { success: true, remoteJid };
}

module.exports = { enviarReporteWhatsApp };
