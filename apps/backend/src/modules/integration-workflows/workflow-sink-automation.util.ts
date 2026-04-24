/** Tablas automation permitidas para INSERT desde workflows (allowlist estricta). */
export const AUTOMATION_WRITE_TABLE_ALLOWLIST = new Set(['workflow_ingested_rows']);

export const MAX_AUTOMATION_INSERT_ROWS = 500;

/** Solo identificadores en minúsculas snake_case (coincide con nombres en allowlist). */
export const AUTOMATION_TABLE_NAME_RE = /^[a-z][a-z0-9_]*$/;

export function isAllowedAutomationWriteTable(name: string): boolean {
  const n = name.trim().toLowerCase();
  return AUTOMATION_TABLE_NAME_RE.test(n) && AUTOMATION_WRITE_TABLE_ALLOWLIST.has(n);
}

export function extractRowsFromPrevious(
  previous: unknown,
  arrayPath: string,
): { ok: true; rows: unknown[] } | { ok: false; error: string } {
  const path = (arrayPath || '').trim();
  if (path === '') {
    if (!Array.isArray(previous)) {
      return {
        ok: false,
        error:
          'La entrada del paso anterior debe ser un arreglo de objetos. Usa "rows" u otra ruta si el dato viene en una propiedad.',
      };
    }
    return { ok: true, rows: previous };
  }
  if (previous == null || typeof previous !== 'object' || Array.isArray(previous)) {
    return { ok: false, error: `La entrada no es un objeto; no se puede leer "${path}".` };
  }
  const v = (previous as Record<string, unknown>)[path];
  if (!Array.isArray(v)) {
    return { ok: false, error: `El campo "${path}" no es un arreglo.` };
  }
  return { ok: true, rows: v };
}

export function resolveFieldSpec(
  row: Record<string, unknown>,
  spec: string,
  ctx: { businessId: string; workflowId?: string | null },
): unknown {
  const s = spec.trim();
  if (s === '$businessId') return ctx.businessId;
  if (s === '$workflowId') return ctx.workflowId ?? null;
  if (s === '$row') return row;
  const parts = s.split('.').filter(Boolean);
  if (parts.length === 0) return undefined;
  let cur: unknown = row;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object' || Array.isArray(cur)) return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}
