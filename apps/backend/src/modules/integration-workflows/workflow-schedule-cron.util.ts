import { CronExpressionParser } from 'cron-parser';
import type { FlowDefinition, FlowNode } from './workflow-executor.util';

/** Convierte cron estilo 5 campos (min hor dom mes dow) al formato de 6 campos del parser (seg min …). */
export function normalizeCronForParser(expression: string): string {
  const trimmed = expression.trim();
  if (!trimmed) return trimmed;
  const parts = trimmed.split(/\s+/);
  if (parts.length === 5) {
    return `0 ${trimmed}`;
  }
  return trimmed;
}

/**
 * True si el cron debería dispararse en el minuto de reloj que contiene `now` (zona `tz`).
 * Usa un ancla dentro del minuto para que `prev()` caiga en el disparo del mismo minuto.
 */
export function shouldFireScheduledCron(cronExpr: string, now: Date, tz: string): boolean {
  const expr = cronExpr.trim();
  if (!expr) return false;
  try {
    const normalized = normalizeCronForParser(expr);
    const anchor = new Date(now.getTime() + 15_000);
    const interval = CronExpressionParser.parse(normalized, { tz, currentDate: anchor });
    const prev = interval.prev().toDate();
    const delta = anchor.getTime() - prev.getTime();
    return delta >= 0 && delta < 60_000;
  } catch {
    return false;
  }
}

export function extractScheduleCronFromDefinition(definition: unknown): string | null {
  const nodes = Array.isArray((definition as FlowDefinition | null)?.nodes)
    ? ((definition as FlowDefinition).nodes as FlowNode[])
    : [];
  const n = nodes.find((x) => x?.type === 'triggerSchedule');
  const data = (n?.data || {}) as Record<string, unknown>;
  const cron = data.cron;
  return typeof cron === 'string' && cron.trim() ? cron.trim() : null;
}
