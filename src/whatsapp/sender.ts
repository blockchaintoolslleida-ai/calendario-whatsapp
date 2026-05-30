/**
 * Envía mensajes de WhatsApp a través de OpenWA REST API.
 *
 * OpenWA debe estar corriendo en segundo plano (puerto 2785).
 * Primera vez: abre http://localhost:2886, crea sesión, escanea QR.
 *
 * API doc: POST /api/sessions/{sessionId}/messages/send-text
 * Body: { chatId: "34600111222@c.us", text: "mensaje" }
 * Header: X-API-Key
 */

const OPENWA_API = process.env.OPENWA_URL || 'http://localhost:2785';
const SESSION_ID = process.env.OPENWA_SESSION_ID || 'default';
const API_KEY = process.env.OPENWA_API_KEY || 'dev-admin-key';

/**
 * Envía un mensaje de recordatorio por WhatsApp vía OpenWA.
 */
export async function sendReminder(
  phone: string,
  eventTitle: string,
  eventTime: Date,
  hoursBefore: number
): Promise<boolean> {
  const timeStr = eventTime.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Madrid',
  });
  const dateStr = eventTime.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Madrid',
  });

  const chatId = formatChatId(phone);
  const message = formatMessage(eventTitle, dateStr, timeStr, hoursBefore);

  try {
    const response = await fetch(
      `${OPENWA_API}/api/sessions/${SESSION_ID}/messages/send-text`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify({ chatId, text: message }),
      }
    );

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`HTTP ${response.status}: ${errBody}`);
    }

    console.log(`📤 Recordatorio enviado a ${phone} (${hoursBefore}h antes)`);
    return true;
  } catch (error: any) {
    if (error.message?.includes('fetch')) {
      console.error(`❌ No se pudo conectar con OpenWA. ¿Está corriendo en ${OPENWA_API}?`);
    } else {
      console.error(`❌ Error al enviar mensaje a ${phone}: ${error.message}`);
    }
    return false;
  }
}

/**
 * Convierte +34600111222 → 34600111222@c.us
 */
function formatChatId(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  }
  return `${cleaned}@c.us`;
}

/**
 * Genera el texto del recordatorio.
 */
function formatMessage(
  eventTitle: string,
  dateStr: string,
  timeStr: string,
  hoursBefore: number
): string {
  const timeLeft = hoursBefore >= 24
    ? `${hoursBefore / 24} día(s)`
    : `${hoursBefore} hora(s)`;

  const cleanTitle = eventTitle.replace(/[\s.\-]?\+?\d{9,12}[\s.\-]?/g, '').trim() || eventTitle;

  return [
    `🔔 *Recordatorio de cita*`,
    ``,
    `📋 *${cleanTitle}*`,
    ``,
    `📅 Fecha: ${dateStr}`,
    `⏰ Hora: ${timeStr}`,
    `⏳ Tiempo restante: ${timeLeft}`,
    ``,
    `💡 Recordatorio automático. ¡Te esperamos!`,
  ].join('\n');
}
