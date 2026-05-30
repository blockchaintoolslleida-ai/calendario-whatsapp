import { google, calendar_v3 } from 'googleapis';
import { JWT } from 'google-auth-library';
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
  auth: JWT
): Promise<CalendarEvent[]> {
  const calendar = google.calendar({ version: 'v3', auth });

  // Obtener la fecha de mañana en la zona horaria configurada
  const now = new Date();
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: config.timezone });
  const [y, m, d] = todayStr.split('-').map(Number);

  // Calcular mañana usando Date UTC (evita problemas de timezone de la máquina)
  const tomorrowDate = new Date(Date.UTC(y, m - 1, d + 1));
  const ty = tomorrowDate.getUTCFullYear();
  const tm = tomorrowDate.getUTCMonth(); // 0-indexed
  const td = tomorrowDate.getUTCDate();

  // Calcular el offset de la timezone configurada al mediodía (evita DST edge)
  const noonUTC = Date.UTC(ty, tm, td, 12, 0, 0);
  const tzOffsetMs = getTimezoneOffset(config.timezone, new Date(noonUTC));

  // Medianoche en la timezone configurada → UTC
  const midnightUTC = Date.UTC(ty, tm, td, 0, 0, 0) - tzOffsetMs;
  const tomorrowStart = new Date(midnightUTC);
  const tomorrowEnd = new Date(midnightUTC + 24 * 60 * 60 * 1000 - 1);

  console.log(
    `📅 Buscando eventos del ${ty}-${String(tm + 1).padStart(2, '0')}-${String(td).padStart(2, '0')} ` +
    `(${tomorrowStart.toISOString()} → ${tomorrowEnd.toISOString()})`
  );

  try {
    const response = await calendar.events.list({
      calendarId: config.google.calendarId,
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
