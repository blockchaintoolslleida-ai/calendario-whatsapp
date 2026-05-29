import { google, Auth } from 'googleapis';
import fs from 'fs';
import path from 'path';
import http from 'http';
import url from 'url';
import { config } from '../config';

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

/**
 * Crea un cliente OAuth2 y obtiene/refresca el token automáticamente.
 * La primera vez abre un navegador para que el usuario autorice.
 */
export async function getAuthClient(): Promise<Auth.OAuth2Client> {
  // Asegurar que existe la carpeta data
  const dataDir = path.dirname(config.google.tokenPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Leer credenciales OAuth descargadas de Google Cloud Console
  if (!fs.existsSync(config.google.credentialsPath)) {
    throw new Error(
      `❌ No se encontró el archivo de credenciales en:\n` +
      `   ${config.google.credentialsPath}\n` +
      `   Descárgalo desde Google Cloud Console y guárdalo en esa ruta.`
    );
  }

  const credentials = JSON.parse(
    fs.readFileSync(config.google.credentialsPath, 'utf-8')
  );

  const { client_id, client_secret } = credentials.installed || credentials.web;
  if (!client_id || !client_secret) {
    throw new Error(
      '❌ El archivo de credenciales no contiene client_id o client_secret.'
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    config.google.redirectUri
  );

  // Intentar cargar token guardado
  if (fs.existsSync(config.google.tokenPath)) {
    const token = JSON.parse(fs.readFileSync(config.google.tokenPath, 'utf-8'));
    oauth2Client.setCredentials(token);

    // Refrescar si está expirado
    if (token.expiry_date && token.expiry_date <= Date.now() + 60_000) {
      try {
        const { credentials: newTokens } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(newTokens);
        fs.writeFileSync(config.google.tokenPath, JSON.stringify(newTokens, null, 2));
        console.log('✅ Token OAuth refrescado automáticamente.');
      } catch (err) {
        console.warn('⚠️  No se pudo refrescar el token. Se solicitará nueva autorización.');
        return doFirstTimeAuth(oauth2Client);
      }
    }

    console.log('✅ Autenticación Google Calendar OK.');
    return oauth2Client;
  }

  // Primera autenticación
  return doFirstTimeAuth(oauth2Client);
}

/**
 * Abre un servidor HTTP local para recibir el callback OAuth.
 * Muestra la URL para que el usuario autorice desde el navegador.
 */
function doFirstTimeAuth(oauth2Client: Auth.OAuth2Client): Promise<Auth.OAuth2Client> {
  return new Promise((resolve, reject) => {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent', // forzar refresh_token
    });

    console.log('\n🔐 Autorización de Google Calendar necesaria.\n');
    console.log('📋 Abre esta URL en tu navegador:\n');
    console.log(`   ${authUrl}\n`);

    const server = http.createServer(async (req, res) => {
      const parsedUrl = url.parse(req.url || '', true);
      const code = parsedUrl.query.code as string;

      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <html>
            <body style="font-family:sans-serif;text-align:center;padding-top:50px;">
              <h1>✅ ¡Autorización completada!</h1>
              <p>Puedes cerrar esta ventana y volver a la terminal.</p>
            </body>
          </html>
        `);

        try {
          const { tokens } = await oauth2Client.getToken(code);
          oauth2Client.setCredentials(tokens);

          // Guardar token para futuras ejecuciones
          const tokenDir = path.dirname(config.google.tokenPath);
          if (!fs.existsSync(tokenDir)) {
            fs.mkdirSync(tokenDir, { recursive: true });
          }
          fs.writeFileSync(config.google.tokenPath, JSON.stringify(tokens, null, 2));
          console.log('✅ Token guardado en:', config.google.tokenPath);

          server.close();
          resolve(oauth2Client);
        } catch (err) {
          server.close();
          reject(err);
        }
      } else {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Error: No se recibió el código de autorización.');
        server.close();
        reject(new Error('No authorization code received'));
      }
    });

    server.listen(3000, () => {
      console.log('⏳ Esperando autorización en http://localhost:3000 ...\n');
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(
          '⚠️  El puerto 3000 está ocupado. Cerrando servidor existente e intentando de nuevo...'
        );
        // Reintento simple
        server.listen(3001);
      } else {
        reject(err);
      }
    });
  });
}
