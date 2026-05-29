import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

export const config = {
  google: {
    credentialsPath: path.resolve(
      __dirname,
      '..',
      process.env.GOOGLE_CREDENTIALS_PATH || 'credentials/google-oauth.json'
    ),
    tokenPath: path.resolve(
      __dirname,
      '..',
      process.env.GOOGLE_TOKEN_PATH || 'data/token.json'
    ),
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth2callback',
  },
  whatsapp: {
    // whatsapp-web.js guarda la sesión automáticamente en esta carpeta
    sessionPath: path.resolve(__dirname, '..', '.wwebjs_auth'),
  },
  notifiedDbPath: path.resolve(
    __dirname,
    '..',
    process.env.NOTIFIED_DB_PATH || 'data/notified.json'
  ),
  checkIntervalMinutes: parseInt(process.env.CHECK_INTERVAL_MINUTES || '15', 10),
  timezone: process.env.TZ || 'Europe/Madrid',
  // Ventanas de recordatorio en horas antes del evento
  reminderWindows: [24, 12, 3],
  // Margen en minutos para considerar que "toca" enviar
  toleranceMinutes: 15,
};
