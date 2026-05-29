import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';

let clientInstance: Client | null = null;

/**
 * Busca Chrome/Chromium instalado localmente.
 */
function findChromePath(): string | undefined {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const chromeDir = path.join(projectRoot, 'chrome');

  if (fs.existsSync(chromeDir)) {
    // Buscar en chrome/win64-*/chrome-win64/chrome.exe
    const entries = fs.readdirSync(chromeDir);
    for (const entry of entries) {
      const chromeExe = path.join(chromeDir, entry, 'chrome-win64', 'chrome.exe');
      if (fs.existsSync(chromeExe)) return chromeExe;
    }
  }

  // Fallback: buscar Chromium de Puppeteer en node_modules
  const puppeteerDir = path.join(projectRoot, 'node_modules', 'puppeteer-core', '.local-chromium');
  if (fs.existsSync(puppeteerDir)) {
    const entries = fs.readdirSync(puppeteerDir);
    for (const entry of entries) {
      const chromeExe = path.join(puppeteerDir, entry, 'chrome-win', 'chrome.exe');
      if (fs.existsSync(chromeExe)) return chromeExe;
    }
  }

  return undefined;
}

/**
 * Inicializa el cliente de WhatsApp Web.
 * La primera vez muestra un QR en la terminal para escanear.
 * Las siguientes veces carga la sesión guardada automáticamente.
 */
export async function getWhatsAppClient(): Promise<Client> {
  if (clientInstance) return clientInstance;

  console.log('📱 Inicializando WhatsApp Web...');

  const chromePath = findChromePath();
  if (chromePath) {
    console.log(`   Chrome encontrado: ${chromePath}`);
  } else {
    console.log('   Usando Chrome del sistema (si falla: npx @puppeteer/browsers install chrome@stable)');
  }

  const client = new Client({
    authStrategy: new LocalAuth({
      dataPath: path.resolve(__dirname, '..', '..', '.wwebjs_auth'),
    }),
    puppeteer: {
      headless: true,
      executablePath: chromePath,
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
