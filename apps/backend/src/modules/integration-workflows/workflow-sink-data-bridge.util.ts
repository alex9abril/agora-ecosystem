/** Límite de filas por ejecución del nodo sinkAutomation → data_bridge. */
export const MAX_DATA_BRIDGE_INSERT_ROWS = 10_000;

/** Solo identificadores en minúsculas snake_case (nombres de tabla en data_bridge). */
export const DATA_BRIDGE_TABLE_NAME_RE = /^[a-z][a-z0-9_]*$/;

export function isValidDataBridgeWriteTableName(name: string): boolean {
  return DATA_BRIDGE_TABLE_NAME_RE.test(name.trim().toLowerCase());
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

/** Contexto para resolver expresiones de mapeo (incluye una sola `executedAt` por ejecución del nodo). */
export type DataBridgeFieldResolveCtx = {
  businessId: string;
  workflowId?: string | null;
  executedAt: Date;
};

export function resolveFieldSpec(
  row: Record<string, unknown>,
  spec: string,
  ctx: DataBridgeFieldResolveCtx,
): unknown {
  const s = spec.trim();
  if (s === '$businessId') return ctx.businessId;
  if (s === '$workflowId') return ctx.workflowId ?? null;
  /** Fecha/hora del servidor al ejecutar el nodo (misma para todas las filas del lote). */
  if (s === '$now') return ctx.executedAt;
  if (s === '$row') return row;
  const parts = s.split('.').filter(Boolean);
  if (parts.length === 0) return undefined;
  /** `$row.campo` = la fila actual; el primer segmento no es una clave del objeto. */
  let i = 0;
  let cur: unknown = row;
  if (parts[0] === '$row') {
    i = 1;
    cur = row;
  }
  for (; i < parts.length; i++) {
    const p = parts[i];
    if (cur == null || typeof cur !== 'object' || Array.isArray(cur)) return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}
