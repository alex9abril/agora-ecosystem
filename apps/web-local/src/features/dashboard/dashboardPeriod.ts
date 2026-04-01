export type DashboardPeriodId = 'today' | 'week' | 'month' | 'year';

export function getPeriodDates(period: DashboardPeriodId) {
  const now = new Date();
  const toISO = (d: Date) => d.toISOString();
  let start = new Date(now);
  let end = new Date(now);
  let prevStart: Date;
  let prevEnd: Date;
  let periodLabel: string;
  if (period === 'today') {
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(23, 59, 59, 999);
    prevEnd = new Date(start);
    prevEnd.setUTCSeconds(prevEnd.getUTCSeconds() - 1);
    prevStart = new Date(prevEnd);
    prevStart.setUTCHours(0, 0, 0, 0);
    periodLabel = 'día anterior';
  } else if (period === 'week') {
    end.setUTCHours(23, 59, 59, 999);
    start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 6);
    start.setUTCHours(0, 0, 0, 0);
    prevEnd = new Date(start);
    prevEnd.setUTCSeconds(prevEnd.getUTCSeconds() - 1);
    prevStart = new Date(prevEnd);
    prevStart.setUTCDate(prevStart.getUTCDate() - 6);
    prevStart.setUTCHours(0, 0, 0, 0);
    periodLabel = 'semana anterior';
  } else if (period === 'month') {
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCMonth(end.getUTCMonth() + 1, 0);
    end.setUTCHours(23, 59, 59, 999);
    prevEnd = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 0, 23, 59, 59, 999));
    prevStart = new Date(Date.UTC(prevEnd.getUTCFullYear(), prevEnd.getUTCMonth(), 1, 0, 0, 0, 0));
    periodLabel = 'mes anterior';
  } else {
    start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
    end = new Date(Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59, 999));
    prevEnd = new Date(Date.UTC(now.getUTCFullYear() - 1, 11, 31, 23, 59, 59, 999));
    prevStart = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1, 0, 0, 0, 0));
    periodLabel = 'año anterior';
  }
  return {
    startDate: toISO(start),
    endDate: toISO(end),
    previousStartDate: toISO(prevStart),
    previousEndDate: toISO(prevEnd),
    periodLabel,
  };
}
