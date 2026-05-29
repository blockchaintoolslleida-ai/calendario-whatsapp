/**
 * Extrae un número de teléfono del título de una cita.
 * Soporta formatos españoles e internacionales.
 *
 * Formatos reconocidos:
 *   - +34 600 111 222   (con/sin prefijo internacional)
 *   - 0034 600 111 222  (doble cero)
 *   - 600111222          (móvil español sin prefijo)
 *   - 700111222          (fijo español sin prefijo)
 *   - +1 (555) 123-4567  (internacional)
 *
 * @param title - El título/asunto del evento de calendario
 * @returns El número de teléfono sin espacios ni guiones, o null si no se encontró
 */
export function extractPhoneNumber(title: string): string | null {
  if (!title) return null;

  // Limpiar el título de caracteres extraños
  const cleaned = title.trim();

  // Regex para números de teléfono:
  // 1. Número con prefijo internacional (+XX o 00XX)
  // 2. Número español (empieza por 6, 7, 8 o 9 y tiene 9 dígitos)
  const patterns = [
    // Formato internacional: +34 600111222, +1 5551234567, etc.
    /(\+\d{1,3}[\s.-]?\d{3,4}[\s.-]?\d{3}[\s.-]?\d{3,4})/,
    // Formato 00XX: 0034 600111222
    /(00\d{1,3}[\s.-]?\d{3,4}[\s.-]?\d{3}[\s.-]?\d{3,4})/,
    // Formato español sin prefijo: 600 111 222 (móvil) o 91 123 45 67 (fijo)
    /\b([6-9]\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2})\b/,
    // Móvil español pegado: 600111222
    /\b([67]\d{8})\b/,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      // Limpiar el número: quitar espacios, guiones, puntos
      let phone = match[1].replace(/[\s.\-()]/g, '');

      // Normalizar: si no tiene prefijo y empieza por 6 o 7, añadir +34
      if (!phone.startsWith('+') && !phone.startsWith('00')) {
        if (/^[67]\d{8}$/.test(phone)) {
          phone = '+34' + phone;
        }
      }

      // Convertir 00XX a +XX
      if (phone.startsWith('00')) {
        phone = '+' + phone.slice(2);
      }

      return phone;
    }
  }

  console.warn(`⚠️  No se encontró teléfono en: "${title}"`);
  return null;
}
