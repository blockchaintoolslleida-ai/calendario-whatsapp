import { CalendarEvent } from '../calendar/events';
import { wasNotified } from '../store/notified';
import { config } from '../config';

export interface PendingReminder {
  event: CalendarEvent;
  phone: string;
  windowLabel: string; // "24h", "12h", "3h"
  hoursBefore: number;
}

/**
 * Determina qué recordatorios toca enviar AHORA.
 * Para cada evento, comprueba si estamos dentro de alguna ventana
 * de recordatorio (24h, 12h, 3h antes) con un margen de tolerancia.
 */
export function getPendingReminders(
  events: { event: CalendarEvent; phone: string }[]
): PendingReminder[] {
  const now = Date.now();
  const toleranceMs = config.toleranceMinutes * 60 * 1000;

  const pending: PendingReminder[] = [];

  for (const { event, phone } of events) {
    const eventTime = event.startTime.getTime();

    for (const hoursBefore of config.reminderWindows) {
      const windowLabel = `${hoursBefore}h`;
      const targetTime = eventTime - hoursBefore * 60 * 60 * 1000;
      const diff = Math.abs(now - targetTime);

      if (diff <= toleranceMs) {
        // Estamos en esta ventana
        if (!wasNotified(event.id, windowLabel)) {
          pending.push({ event, phone, windowLabel, hoursBefore });
        }
      }
    }
  }

  return pending;
}
