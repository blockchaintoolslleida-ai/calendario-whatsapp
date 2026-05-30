import cron from 'node-cron';
import { getAuthClient } from './calendar/auth';
import { getTomorrowEvents } from './calendar/events';
import { sendReminder } from './whatsapp/sender';
import { getPendingReminders } from './scheduler/reminders';
import { markNotified, cleanupOldEntries } from './store/notified';
import { extractPhoneNumber } from './parser/phone';
import { config } from './config';

const OPENWA_API = process.env.OPENWA_URL || 'http://localhost:2785';

/**
 * 🚀 Servicio de recordatorios Calendario → WhatsApp.
 *
 * Requiere OpenWA corriendo en segundo plano.
 * Cada N minutos consulta Google Calendar y envía recordatorios.
 */
async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  📅 Calendario → WhatsApp Recordatorios');
  console.log('═══════════════════════════════════════════');
  console.log(`  Zona horaria: ${config.timezone}`);
  console.log(`  Intervalo: cada ${config.checkIntervalMinutes} min`);
  console.log(`  Recordatorios: ${config.reminderWindows.map(h => h + 'h').join(', ')} antes`);
  console.log(`  WhatsApp: OpenWA en ${OPENWA_API}`);
  console.log('═══════════════════════════════════════════\n');

  // Autenticar Google Calendar
  let auth: Awaited<ReturnType<typeof getAuthClient>>;
  try {
    auth = await getAuthClient();
  } catch (err: any) {
    console.error('❌ No se pudo autenticar con Google Calendar.');
    console.error(err.message);
    process.exit(1);
  }

  /**
   * Ciclo de chequeo
   */
  async function runCheck() {
    console.log(`\n🔍 [${new Date().toISOString()}] Chequeando recordatorios...`);

    try {
      // 1. Eventos de mañana
      const events = await getTomorrowEvents(auth);

      // 2. Extraer teléfonos
      const eventsWithPhones = [];
      for (const event of events) {
        const phone = extractPhoneNumber(event.title);
        if (phone) {
          eventsWithPhones.push({ event, phone });
          console.log(`   📞 "${event.title}" → ${phone}`);
        } else {
          console.log(`   ⚠️  Sin teléfono: "${event.title}" → ignorado`);
        }
      }

      // 3. Recordatorios pendientes
      const pending = getPendingReminders(eventsWithPhones);

      if (pending.length === 0) {
        console.log('   ✅ No hay recordatorios pendientes.');
      }

      // 4. Enviar cada recordatorio
      for (const reminder of pending) {
        const success = await sendReminder(
          reminder.phone,
          reminder.event.title,
          reminder.event.startTime,
          reminder.hoursBefore
        );

        if (success) {
          markNotified(reminder.event.id, reminder.windowLabel);
        }
      }

      // 5. Limpiar entradas antiguas
      cleanupOldEntries(new Set(events.map(e => e.id)));
    } catch (err: any) {
      console.error('❌ Error en el ciclo:', err.message);
    }

    console.log('   ⏳ Esperando siguiente ciclo...\n');
  }

  // Primer chequeo inmediato
  await runCheck();

  // Chequeos periódicos
  const cronExpression = `*/${config.checkIntervalMinutes} * * * *`;
  cron.schedule(cronExpression, runCheck);

  console.log(`⏰ Próximo chequeo en ~${config.checkIntervalMinutes} minutos.`);
  console.log('🟢 Servicio en ejecución. Ctrl+C para detener.\n');
}

main().catch(async (err) => {
  console.error('💥 Error fatal:', err);
  process.exit(1);
});
