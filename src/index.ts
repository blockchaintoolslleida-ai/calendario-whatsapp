import cron from 'node-cron';
import { getAuthClient } from './calendar/auth';
import { getTomorrowEvents } from './calendar/events';
import { getWhatsAppClient, closeWhatsAppClient } from './whatsapp/client';
import { sendReminder } from './whatsapp/sender';
import { getPendingReminders } from './scheduler/reminders';
import { markNotified, cleanupOldEntries } from './store/notified';
import { extractPhoneNumber } from './parser/phone';
import { config } from './config';

/**
 * 🚀 Punto de entrada del servicio de recordatorios.
 *
 * Cada N minutos (configurable, default 15):
 *   1. Obtiene eventos del día siguiente desde Google Calendar
 *   2. Extrae números de teléfono de los títulos
 *   3. Calcula qué recordatorios toca enviar (24h, 12h, 3h antes)
 *   4. Filtra los ya enviados
 *   5. Envía WhatsApp para los pendientes
 *   6. Registra envíos para no duplicar
 */
async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  📅 Calendario → WhatsApp Recordatorios');
  console.log('═══════════════════════════════════════════');
  console.log(`  Zona horaria: ${config.timezone}`);
  console.log(`  Intervalo de chequeo: cada ${config.checkIntervalMinutes} min`);
  console.log(`  Recordatorios: ${config.reminderWindows.map(h => h + 'h').join(', ')} antes`);
  console.log('═══════════════════════════════════════════\n');

  // Inicializar WhatsApp (primera vez pide QR)
  let whatsapp: Awaited<ReturnType<typeof getWhatsAppClient>>;
  try {
    whatsapp = await getWhatsAppClient();
  } catch (err: any) {
    console.error('❌ No se pudo iniciar WhatsApp. ¿Chromium instalado?');
    console.error('   npm install puppeteer  (o instala Chromium manualmente)');
    process.exit(1);
  }

  // Inicializar Google Calendar (primera vez pide autorización)
  let auth: Awaited<ReturnType<typeof getAuthClient>>;
  try {
    auth = await getAuthClient();
  } catch (err: any) {
    console.error('❌ No se pudo autenticar con Google Calendar.');
    console.error(err.message);
    process.exit(1);
  }

  /**
   * Ejecuta un ciclo de chequeo:
   * consulta calendario → calcula pendientes → envía WhatsApps.
   */
  async function runCheck() {
    console.log(`\n🔍 [${new Date().toISOString()}] Chequeando recordatorios...`);

    try {
      // 1. Obtener eventos de mañana
      const events = await getTomorrowEvents(auth);

      // 2. Extraer teléfonos de los títulos
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

      // 3. Calcular recordatorios pendientes
      const pending = getPendingReminders(eventsWithPhones);

      if (pending.length === 0) {
        console.log('   ✅ No hay recordatorios pendientes en esta ventana.');
      }

      // 4 y 5. Enviar WhatsApp para cada pendiente
      for (const reminder of pending) {
        const success = await sendReminder(
          whatsapp,
          reminder.phone,
          reminder.event.title,
          reminder.event.startTime,
          reminder.hoursBefore
        );

        if (success) {
          // 6. Registrar envío
          markNotified(reminder.event.id, reminder.windowLabel);
        }
      }

      // Limpiar entradas antiguas
      cleanupOldEntries(
        new Set(events.map(e => e.id))
      );
    } catch (err: any) {
      console.error('❌ Error en el ciclo de chequeo:', err.message);
    }

    console.log('   ⏳ Esperando siguiente ciclo...\n');
  }

  // Ejecutar un chequeo inmediatamente al iniciar
  await runCheck();

  // Programar chequeos periódicos
  const cronExpression = `*/${config.checkIntervalMinutes} * * * *`;
  cron.schedule(cronExpression, runCheck);

  console.log(`⏰ Próximo chequeo en ~${config.checkIntervalMinutes} minutos.`);
  console.log('🟢 Servicio en ejecución. Ctrl+C para detener.\n');
}

// Manejar cierre limpio
process.on('SIGINT', async () => {
  console.log('\n👋 Cerrando servicio...');
  await closeWhatsAppClient();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeWhatsAppClient();
  process.exit(0);
});

// Arrancar
main().catch(async (err) => {
  console.error('💥 Error fatal:', err);
  await closeWhatsAppClient();
  process.exit(1);
});
