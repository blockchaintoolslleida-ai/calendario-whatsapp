# Calendario → WhatsApp Recordatorios 🗓️📱

Servicio que consulta Google Calendar cada día, extrae los teléfonos de los
títulos de las citas de mañana, y envía recordatorios automáticos por WhatsApp
**24 horas, 12 horas y 3 horas** antes de cada cita.

## Requisitos

1. **Node.js 18+** — [Descargar de nodejs.org](https://nodejs.org)
2. **Google Cloud Console** — proyecto con Calendar API habilitada
3. **WhatsApp** en tu móvil (para escanear el QR la primera vez)

## Configuración inicial

### 1. Clonar e instalar dependencias

```bash
git clone <repo-url>
cd calendario-whatsapp
npm install
```

### 2. Configurar Google Calendar

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea un proyecto o selecciona uno existente
3. Habilita la **Google Calendar API**
4. Ve a **APIs y Servicios > Credenciales**
5. Crea una credencial **OAuth 2.0 Client ID** de tipo **Desktop App**
6. Descarga el JSON y guárdalo como:
   ```
   credentials/google-oauth.json
   ```

### 3. Configurar variables de entorno

Edita `.env`:

```env
# Zona horaria
TZ=Europe/Madrid

# Intervalo de chequeo (minutos)
CHECK_INTERVAL_MINUTES=15
```

## Uso

### En Windows

Ejecuta `start.bat` desde el explorador de archivos.

O desde una terminal:

```bash
npm start
```

### Primera ejecución

1. Se abrirá tu navegador para autorizar el acceso a Google Calendar.
   - Alternativamente, copia la URL que aparece en la terminal.
2. Después, aparecerá un **código QR en la terminal**.
   - Ábrelo con WhatsApp en tu móvil: **Ajustes > Dispositivos vinculados**.
3. ¡Listo! El servicio queda corriendo y chequeando cada 15 minutos.

### Ejecutar al iniciar Windows

Copia `start.bat` en la carpeta de inicio de Windows:

1. Pulsa `Win + R`
2. Escribe `shell:startup`
3. Copia un acceso directo a `start.bat`

## Formato de las citas

El número de teléfono debe estar en el **título** del evento de Google Calendar.

**Ejemplos de títulos válidos:**

- ✅ `Cita con Juan +34600111222`
- ✅ `Revisión médica 600111222`
- ✅ `Llamada cliente +1 555-123-4567`
- ✅ `Peluquería 600 111 222`

**Ejemplos NO válidos:**

- ❌ `Cita con Juan` (sin teléfono)
- ❌ `Reunión equipo` (sin teléfono — se ignora silenciosamente)

## Mensaje enviado

El destinatario recibe:

> 🔔 **Recordatorio de cita**
>
> 📋 **Cita con Juan**
>
> 📅 Fecha: viernes, 30 de mayo de 2026
> ⏰ Hora: 16:00
> ⏳ Tiempo restante: 3 hora(s)
>
> 💡 Este es un recordatorio automático. ¡Te esperamos!

## Funcionamiento

```
cada 15 min:
  → consulta Google Calendar (eventos de mañana)
  → extrae teléfonos de los títulos
  → calcula si toca enviar algún recordatorio (24h/12h/3h antes)
  → si toca y no se ha enviado ya → envía WhatsApp
  → registra el envío para no duplicar
```

## Solución de problemas

| Problema | Solución |
|----------|----------|
| WhatsApp desconectado | Borra la carpeta `.wwebjs_auth` y reinicia para escanear QR de nuevo |
| Error "chromium not found" | Instala Chromium: `npm install puppeteer` |
| Google auth expirado | Borra `data/token.json` y reinicia para reautorizar |
| No encuentra teléfono | Asegúrate de que el número está en el título de la cita |
| Puerto 3000 ocupado | El script reintentará automáticamente en el puerto 3001 |
