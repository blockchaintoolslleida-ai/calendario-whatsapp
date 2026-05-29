import { google, calendar_v3 } from 'googleapis';
import { Auth } from 'googleapis';
import { config } from '../config';

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
}

/**
 * Obtiene los eventos del día siguiente desde Google Calendar.
 */
export async function getTomorrowEvents(
  auth: Auth.OAuth2Client
): Promise<CalendarEvent[]> {
  const calendar = google.calendar({ version: 'v3', auth });

  // Calcular inicio y fin del día siguiente en la zona horaria configurada
  const now = new Date();
  const tzOffset = getTimezoneOffset(config.timezone, now);

  // Inicio de mañana (00:00)
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomorrowStart = new Date(tomorrow.getTime() - tzOffset);

  // Fin de mañana (23:59:59)
  const tomorrowEnd = new Date(tomorrowStart.getTime() + 24 * 60 * 60 * 1000 - 1);

  console.log(
    `📅 Buscando eventos del ${tomorrowStart.toISOString().split('T')[0]} ` +
    `(${tomorrowStart.toISOString()} → ${tomorrowEnd.toISOString()})`
  );

  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: tomorrowStart.toISOString(),
      timeMax: tomorrowEnd.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events: CalendarEvent[] = (response.data.items || [])
      .filter((event): event is calendar_v3.Schema$Event & { id: string } => {
        // Solo eventos con fecha/hora de inicio (ignorar all-day)
        return !!(event.id && event.start?.dateTime && event.summary);
      })
      .map((event) => ({
        id: event.id!,
        title: event.summary!,
        startTime: new Date(event.start!.dateTime!),
        endTime: new Date(event.end!.dateTime!),
      }));

    console.log(
      events.length > 0
        ? `   Encontrados ${events.length} eventos con hora.`
        : '   No hay eventos con hora programada para mañana.'
    );

    return events;
  } catch (error: any) {
    console.error('❌ Error al consultar Google Calendar:', error.message);
    throw error;
  }
}

/**
 * Calcula el offset en ms para una zona horaria dada en una fecha concreta.
 */
function getTimezoneOffset(tz: string, date: Date): number {
  try {
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: tz }));
    return tzDate.getTime() - utcDate.getTime();
  } catch {
    // Fallback a UTC si la zona horaria no es válida
    console.warn(`⚠️  Zona horaria "${tz}" no reconocida, usando UTC.`);
    return 0;
  }
}
