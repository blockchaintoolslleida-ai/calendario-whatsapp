import { Client } from 'whatsapp-web.js';

/**
 * Envía un mensaje de recordatorio por WhatsApp.
 *
 * @param client - Cliente de WhatsApp inicializado
 * @param phone - Número en formato internacional (+34600111222)
 * @param eventTitle - Título original de la cita
 * @param eventTime - Hora de la cita
 * @param hoursBefore - Cuántas horas faltan (24, 12, o 3)
 */
export async function sendReminder(
  client: Client,
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

  const whatsappNumber = formatForWhatsApp(phone);

  const message = formatMessage(eventTitle, dateStr, timeStr, hoursBefore);

  try {
    // Verificar si el número tiene WhatsApp
    const isValid = await client.isRegisteredUser(whatsappNumber);
    if (!isValid) {
      console.warn(`⚠️  ${phone} no tiene WhatsApp registrado. Omitiendo.`);
      return false;
    }

    await client.sendMessage(whatsappNumber, message);
    console.log(`📤 Recordatorio enviado a ${phone} (${hoursBefore}h antes)`);
    return true;
  } catch (error: any) {
    console.error(`❌ Error al enviar mensaje a ${phone}:`, error.message);
    return false;
  }
}

/**
 * Convierte un número a formato para WhatsApp (+34600111222)
 * Añade el sufijo @c.us que usa whatsapp-web.js internamente.
 */
function formatForWhatsApp(phone: string): string {
  // Quitar todo excepto dígitos y el +
  let cleaned = phone.replace(/[^\d+]/g, '');
  // El número para isRegisteredUser y sendMessage debe ser sin @c.us,
  // whatsapp-web.js lo gestiona
  return cleaned;
}

/**
 * Genera el texto del mensaje de recordatorio.
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

  // Limpiar el número de teléfono del título para el mensaje
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
    `💡 Este es un recordatorio automático. ¡Te esperamos!`,
  ].join('\n');
}
