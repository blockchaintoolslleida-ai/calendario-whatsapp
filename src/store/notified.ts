import fs from 'fs';
import path from 'path';
import { config } from '../config';

interface NotifiedDb {
  [eventId: string]: string[]; // ej: "abc123": ["24h", "12h"]
}

let db: NotifiedDb | null = null;

/**
 * Carga la base de datos de notificaciones desde disco.
 */
function loadDb(): NotifiedDb {
  if (db) return db;

  const dir = path.dirname(config.notifiedDbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(config.notifiedDbPath)) {
    db = {};
    saveDb();
    return db!;
  }

  try {
    const raw = fs.readFileSync(config.notifiedDbPath, 'utf-8');
    db = JSON.parse(raw);
  } catch {
    console.warn('⚠️  Error al leer notified.json, iniciando vacío.');
    db = {};
  }

  return db!;
}

/**
 * Guarda la base de datos a disco.
 */
function saveDb(): void {
  const dir = path.dirname(config.notifiedDbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(config.notifiedDbPath, JSON.stringify(db, null, 2), 'utf-8');
}

/**
 * Comprueba si ya se envió una notificación para un evento en una ventana.
 */
export function wasNotified(eventId: string, windowLabel: string): boolean {
  const data = loadDb();
  return data[eventId]?.includes(windowLabel) ?? false;
}

/**
 * Registra que se ha enviado una notificación.
 */
export function markNotified(eventId: string, windowLabel: string): void {
  const data = loadDb();
  if (!data[eventId]) {
    data[eventId] = [];
  }
  if (!data[eventId].includes(windowLabel)) {
    data[eventId].push(windowLabel);
    saveDb();
  }
}

/**
 * Limpia entradas antiguas (eventos que ya pasaron).
 * Se llama cada vez que se ejecuta el check.
 */
export function cleanupOldEntries(activeEventIds: Set<string>): void {
  const data = loadDb();
  let changed = false;
  for (const eventId of Object.keys(data)) {
    if (!activeEventIds.has(eventId)) {
      delete data[eventId];
      changed = true;
    }
  }
  if (changed) saveDb();
}
