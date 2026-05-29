import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

/**
 * Autentica usando una Service Account (cuenta de servicio).
 * Mucho más simple que OAuth2: solo necesita el archivo JSON de la clave.
 *
 * La service account debe tener acceso al calendario:
 *   - Compartir el calendario con el email de la service account
 *   - Con permiso "Ver todos los detalles"
 */
export async function getAuthClient(): Promise<JWT> {
  const dataDir = path.dirname(config.google.tokenPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // El archivo de credenciales ahora es la clave JSON de la service account
  if (!fs.existsSync(config.google.credentialsPath)) {
    throw new Error(
      `❌ No se encontró el archivo de credenciales en:\n` +
      `   ${config.google.credentialsPath}\n\n` +
      `   Necesitas crear una Service Account:\n` +
      `   1. Ve a https://console.cloud.google.com/iam-admin/serviceaccounts\n` +
      `   2. Crea una service account (nombre: calendario-whatsapp)\n` +
      `   3. Añade una clave JSON y descárgala\n` +
      `   4. Guarda el archivo como credentials/google-oauth.json\n` +
      `   5. Comparte tu calendario con el email de la service account`
    );
  }

  try {
    const key = JSON.parse(fs.readFileSync(config.google.credentialsPath, 'utf-8'));

    // La clave de service account tiene el campo "client_email" y "private_key"
    if (!key.client_email || !key.private_key) {
      throw new Error(
        '❌ El archivo no parece ser una clave de Service Account.\n' +
        '   Debe contener "client_email" y "private_key".'
      );
    }

    console.log(`🔑 Service account: ${key.client_email}`);

    const client = new google.auth.JWT({
      email: key.client_email,
      key: key.private_key,
      scopes: SCOPES,
    });

    // Verificar que funciona
    await client.authorize();
    console.log('✅ Autenticación Google Calendar OK (Service Account).');

    return client;
  } catch (error: any) {
    if (error.message?.includes('No se encontró') || error.message?.includes('no parece ser')) {
      throw error;
    }
    throw new Error(
      `❌ Error al autenticar con Google Calendar:\n   ${error.message}`
    );
  }
}
