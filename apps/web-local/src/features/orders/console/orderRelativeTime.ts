/**
 * Politica deliberada de fecha en consola operativa:
 * - Hoy: solo hora
 * - Ultimos 7 dias: relativo
 * - Mayor antiguedad: fecha corta
 */
export function formatOrderRelativeTime(
  isoDate: string,
  locale = 'es-MX',
  timezone = 'America/Mexico_City',
): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dateTs = date.getTime();
  if (dateTs >= todayStart) {
    return new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  const diffMs = now.getTime() - dateTs;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays < 7) {
    if (diffDays <= 0) return 'hace unas horas';
    if (diffDays === 1) return 'hace 1 dia';
    return `hace ${diffDays} dias`;
  }

  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  }).format(date);
}

export function hoursSince(isoDate: string): number {
  const ts = new Date(isoDate).getTime();
  if (Number.isNaN(ts)) return 0;
  return Math.floor((Date.now() - ts) / 3600000);
}
