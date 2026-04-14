/**
 * Clave calendario YYYY-MM-DD en una zona horaria (para comparar "mismo día" sin depender del reloj local del navegador).
 */
function calendarDayKey(isoOrMs: string | number, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(isoOrMs));
}

/** Día calendario anterior al "hoy" en la zona horaria del negocio. */
function yesterdayCalendarDayKey(timeZone: string): string {
  const today = calendarDayKey(Date.now(), timeZone);
  let t = Date.now();
  for (let i = 0; i < 72; i++) {
    t -= 3600000;
    if (calendarDayKey(t, timeZone) !== today) {
      return calendarDayKey(t, timeZone);
    }
  }
  return calendarDayKey(Date.now() - 48 * 3600000, timeZone);
}

/**
 * Texto único para la columna "Creado" en la tabla de pedidos:
 * - Hoy (en TZ del negocio): solo hora
 * - Ayer: fecha de ese día (sin "hace unas horas")
 * - Antes de ayer: fecha corta
 */
export function formatOrderCreatedCell(isoDate: string, locale = 'es-MX', timeZone = 'America/Mexico_City'): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  const orderDay = calendarDayKey(isoDate, timeZone);
  const todayDay = calendarDayKey(Date.now(), timeZone);
  const yesterdayDay = yesterdayCalendarDayKey(timeZone);

  if (orderDay === todayDay) {
    return new Intl.DateTimeFormat(locale, {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  if (orderDay === yesterdayDay) {
    return new Intl.DateTimeFormat(locale, {
      timeZone,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  return new Intl.DateTimeFormat(locale, {
    timeZone,
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  }).format(date);
}

/** Fecha y hora completas para tooltip (title) al pasar el cursor. */
export function formatOrderCreatedTooltip(
  isoDate: string,
  locale = 'es-MX',
  timeZone = 'America/Mexico_City',
): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(date);
}

export function hoursSince(isoDate: string): number {
  const ts = new Date(isoDate).getTime();
  if (Number.isNaN(ts)) return 0;
  return Math.floor((Date.now() - ts) / 3600000);
}
