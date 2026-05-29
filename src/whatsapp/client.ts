import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

let clientInstance: Client | null = null;

/**
 * Inicializa el cliente de WhatsApp Web.
 * La primera vez muestra un QR en la terminal para escanear.
 * Las siguientes veces carga la sesión guardada automáticamente.
 */
export async function getWhatsAppClient(): Promise<Client> {
  if (clientInstance) return clientInstance;

  console.log('📱 Inicializando WhatsApp Web...');

  const client = new Client({
    authStrategy: new LocalAuth({
      dataPath: require('path').resolve(__dirname, '..', '..', '.wwebjs_auth'),
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    },
  });

  // Mostrar QR en terminal
  client.on('qr', (qr: string) => {
    console.log('\n📲 Escanea este código QR con WhatsApp (Ajustes > WhatsApp Web):\n');
    qrcode.generate(qr, { small: true });
    console.log('\n⏳ Esperando que escanees el QR...\n');
  });

  client.on('authenticated', () => {
    console.log('✅ WhatsApp Web autenticado correctamente.');
  });

  client.on('auth_failure', (msg: string) => {
    console.error('❌ Fallo de autenticación WhatsApp:', msg);
    console.error('   Borra la carpeta .wwebjs_auth y reinicia.');
  });

  client.on('ready', () => {
    console.log('✅ Cliente WhatsApp listo y conectado.');
  });

  client.on('disconnected', (reason: string) => {
    console.warn(`⚠️  WhatsApp desconectado: ${reason}. Intentando reconectar...`);
    clientInstance = null;
  });

  try {
    await client.initialize();
    clientInstance = client;
    console.log('✅ WhatsApp iniciado.');
    return client;
  } catch (error: any) {
    console.error('❌ Error al inicializar WhatsApp:', error.message);
    throw error;
  }
}

/**
 * Cierra el cliente de WhatsApp limpiamente.
 */
export async function closeWhatsAppClient(): Promise<void> {
  if (clientInstance) {
    console.log('🔌 Cerrando WhatsApp...');
    try {
      await clientInstance.destroy();
    } catch {
      // ignorar errores al cerrar
    }
    clientInstance = null;
  }
}
