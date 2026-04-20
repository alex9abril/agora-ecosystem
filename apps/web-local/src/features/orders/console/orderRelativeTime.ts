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

function calendarYear(isoOrMs: string | number, timeZone: string): number {
  return parseInt(
    new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric' }).format(new Date(isoOrMs)),
    10,
  );
}

/**
 * Texto único para la columna "Creado" en la tabla de pedidos:
 * - Hoy (en TZ del negocio): solo hora
 * - Otro día: día y mes; si el año del pedido ≠ año actual en esa TZ, incluye año completo
 */
export function formatOrderCreatedCell(isoDate: string, locale = 'es-MX', timeZone = 'America/Mexico_City'): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  const orderDay = calendarDayKey(isoDate, timeZone);
  const todayDay = calendarDayKey(Date.now(), timeZone);

  if (orderDay === todayDay) {
    return new Intl.DateTimeFormat(locale, {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  const nowYear = calendarYear(Date.now(), timeZone);
  const orderYear = calendarYear(isoDate, timeZone);
  const opts: Intl.DateTimeFormatOptions = {
    timeZone,
    day: 'numeric',
    month: 'short',
  };
  if (orderYear !== nowYear) {
    opts.year = 'numeric';
  }

  return new Intl.DateTimeFormat(locale, opts).format(date);
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

/** Ventana para el chip "Nuevo": no abiertos antiguos (p. ej. semana pasada) solo muestran el punto, no la etiqueta. */
const NUEVO_MAX_AGE_MS = 48 * 60 * 60 * 1000;

/**
 * ¿El pedido es lo bastante reciente para mostrar la etiqueta "Nuevo"?
 * Criterio: `created_at` dentro de las últimas 48 h (reloj del cliente; el listado ya filtra por negocio).
 */
export function isOrderRecentForNuevoBadge(createdAt: string | undefined | null): boolean {
  if (!createdAt) return false;
  const ts = new Date(createdAt).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts <= NUEVO_MAX_AGE_MS;
}
