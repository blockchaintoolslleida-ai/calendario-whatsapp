# Calendario → WhatsApp Recordatorios

Servicio que consulta Google Calendar, extrae teléfonos de los títulos de las citas
del día siguiente, y envía recordatorios por WhatsApp a 24h, 12h y 3h antes.

## Arquitectura

```
src/
├── index.ts              # Orquestador: cron cada N min → check → enviar
├── config.ts             # Config desde .env
├── calendar/
│   ├── auth.ts           # Service Account JWT (NO OAuth2)
│   └── events.ts         # getTomorrowEvents() → CalendarEvent[]
├── whatsapp/
│   └── sender.ts         # sendReminder() vía OpenWA REST API
├── scheduler/
│   └── reminders.ts      # Ventanas 24h/12h/3h ±15min tolerancia
├── parser/
│   └── phone.ts          # Regex extraer tlf del título
└── store/
    └── notified.ts       # JSON: {eventId: ["24h","12h"]} evita duplicados
```

## Auth: Service Account

- Archivo: `credentials/google-oauth.json` (clave JSON de service account)
- El calendario debe compartirse con el email de la service account (permiso "Ver todos los detalles")
- CALENDAR_ID en .env = email del dueño del calendario
- Para crear eventos vía API: se necesita permiso "Realizar cambios en eventos"

## WhatsApp

- OpenWA REST API en `http://localhost:2785` (debe estar corriendo)
- Dashboard en `http://localhost:2886` (escanear QR primera vez)
- Sesión guardada en `~/openwa/data/sessions/`
- whatsapp-web.js ELIMINADO — OpenWA maneja toda la conexión WhatsApp

## Comandos

```bash
# Instalar dependencias
npm install

# Instalar Chrome para Puppeteer (una vez)
npx @puppeteer/browsers install chrome@stable

# Ejecutar
npm start
# o en Windows:
setup.bat
```

## Formato de citas

El número de teléfono DEBE ir en el **título** del evento:
- `Cita Juan +34600111222`
- `Peluquería 600111222`

## Configuración (.env)

- `GOOGLE_CREDENTIALS_PATH` → JSON de service account
- `CALENDAR_ID` → email cuyo calendario se lee
- `CHECK_INTERVAL_MINUTES` → cada cuánto chequea (default 15)
- `TZ` → zona horaria (Europe/Madrid)
