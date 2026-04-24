import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Node } from '@xyflow/react';
import { ApiError } from '@/lib/api';
import {
  fetchDataBridgeWriteTableColumns,
  fetchDataBridgeWriteTables,
  type DataBridgeWriteColumnRow,
  type DataBridgeWriteTableRow,
} from '@/lib/integration-workflows';
import { WorkflowJsonResultViewer } from './WorkflowJsonResultViewer';
import type { NodeRunExecutionView } from './workflow-run-types';

const SERVER_COLUMNS = new Set(['id', 'created_at', 'business_id', 'workflow_id']);

type Props = {
  businessId: string;
  workflowId: string;
  node: Node;
  previousNode: Node | null;
  onClose: () => void;
  onSave: (nodeId: string, data: Record<string, unknown>) => void;
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}

/** Alinea inferencia de mapeos con Code (`testInputJson`), MSSQL (`rows`) o el wrapper del editor. */
function unwrapMappingPayload(raw: unknown): unknown {
  if (raw == null) return null;
  if (Array.isArray(raw)) return raw;
  if (!isRecord(raw)) return raw;
  if (Array.isArray(raw.rows)) return raw;
  const data = raw.data;
  if (isRecord(data)) {
    const tj = data.testInputJson;
    if (typeof tj === 'string' && tj.trim()) {
      try {
        return JSON.parse(tj) as unknown;
      } catch {
        return null;
      }
    }
    if (Array.isArray(data.rows)) return data;
    return data;
  }
  return raw;
}

/** ¿Parece el payload que recibirá el sink (arreglo o `{ rows: [...] }`)? */
function looksLikeWorkflowStepPayload(v: unknown): boolean {
  if (Array.isArray(v)) return true;
  if (!isRecord(v)) return false;
  return Array.isArray(v.rows);
}

const CUSTOM_MAPPING_VALUE = '__custom__';

function pickSampleRowForMappings(previousOutput: unknown, arrayPath: string): Record<string, unknown> | null {
  const p = (arrayPath ?? '').trim();
  let container: unknown = previousOutput;
  if (p !== '') {
    if (!isRecord(container)) return null;
    container = container[p];
  }
  if (!Array.isArray(container) || container.length === 0) return null;
  const first = container[0];
  if (!isRecord(first)) return null;
  return first;
}

function collectPathsFromRow(
  row: Record<string, unknown>,
  base: string,
  depth: number,
  maxDepth: number,
  out: Set<string>,
  budget: { n: number },
) {
  if (depth > maxDepth || budget.n <= 0) return;
  for (const k of Object.keys(row)) {
    if (budget.n <= 0) return;
    if (!k || k.length > 80 || k.includes('.') || k.includes('[')) continue;
    const path = `${base}.${k}`;
    out.add(path);
    budget.n -= 1;
    const v = row[k];
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      collectPathsFromRow(v as Record<string, unknown>, path, depth + 1, maxDepth, out, budget);
    }
  }
}

function buildBaseMappingOptions(sampleRow: Record<string, unknown> | null): Set<string> {
  const s = new Set<string>(['', '$businessId', '$workflowId', '$row']);
  if (sampleRow) {
    collectPathsFromRow(sampleRow, '$row', 0, 4, s, { n: 64 });
  }
  return s;
}

function sortMappingSelectOptions(opts: string[]): string[] {
  const rank = (x: string) =>
    x === '' ? 0 : x === '$businessId' ? 1 : x === '$workflowId' ? 2 : x === '$row' ? 3 : 4;
  return [...opts].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

export function WorkflowSinkAutomationNodePanel({
  businessId,
  workflowId,
  node,
  previousNode,
  onClose,
  onSave,
}: Props) {
  const d0 = (node.data || {}) as {
    label?: string;
    tableName?: string;
    arrayPath?: string;
    fieldMappings?: Record<string, string>;
  };
  const [label, setLabel] = useState(d0.label || 'Guardar en data bridge');
  const [tableName, setTableName] = useState(d0.tableName || '');
  const [arrayPath, setArrayPath] = useState(typeof d0.arrayPath === 'string' ? d0.arrayPath : 'rows');
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>(() =>
    isRecord(d0.fieldMappings) ? { ...(d0.fieldMappings as Record<string, string>) } : {},
  );
  const [tables, setTables] = useState<DataBridgeWriteTableRow[]>([]);
  const [columns, setColumns] = useState<DataBridgeWriteColumnRow[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [busyTables, setBusyTables] = useState(false);
  const [busyCols, setBusyCols] = useState(false);
  const [mappingOtherMode, setMappingOtherMode] = useState<Record<string, boolean>>({});
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'err'>('idle');

  useEffect(() => {
    const nd = (node.data || {}) as {
      label?: string;
      tableName?: string;
      arrayPath?: string;
      fieldMappings?: Record<string, string>;
    };
    setLabel(nd.label || 'Guardar en data bridge');
    setTableName(typeof nd.tableName === 'string' ? nd.tableName : '');
    setArrayPath(typeof nd.arrayPath === 'string' ? nd.arrayPath : 'rows');
    setFieldMappings(isRecord(nd.fieldMappings) ? { ...(nd.fieldMappings as Record<string, string>) } : {});
    setMappingOtherMode({});
  }, [node.id, node.data]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setBusyTables(true);
    setLoadErr(null);
    void fetchDataBridgeWriteTables(businessId)
      .then((rows) => {
        if (cancelled) return;
        setTables(rows);
        if (!tableName && rows.length > 0) {
          setTableName(rows[0].tableName);
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setLoadErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Error al cargar tablas');
      })
      .finally(() => {
        if (!cancelled) setBusyTables(false);
      });
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  useEffect(() => {
    const t = tableName.trim();
    if (!t) {
      setColumns([]);
      return;
    }
    let cancelled = false;
    setBusyCols(true);
    setLoadErr(null);
    void fetchDataBridgeWriteTableColumns(businessId, t)
      .then((rows) => {
        if (cancelled) return;
        setColumns(rows);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setColumns([]);
        setLoadErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Error al cargar columnas');
      })
      .finally(() => {
        if (!cancelled) setBusyCols(false);
      });
    return () => {
      cancelled = true;
    };
  }, [businessId, tableName]);

  const setMapping = useCallback((col: string, value: string) => {
    setFieldMappings((prev) => {
      const next = { ...prev };
      if (!value.trim()) delete next[col];
      else next[col] = value.trim();
      return next;
    });
  }, []);

  const onApply = useCallback(() => {
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(fieldMappings)) {
      if (typeof v === 'string' && v.trim()) clean[k] = v.trim();
    }
    onSave(node.id, {
      label: label.trim() || 'Guardar en data bridge',
      tableName: tableName.trim(),
      arrayPath: arrayPath.trim(),
      fieldMappings: clean,
    });
    onClose();
  }, [arrayPath, fieldMappings, label, node.id, onClose, onSave, tableName]);

  const runExec = (node.data as { runExecution?: NodeRunExecutionView } | undefined)?.runExecution;

  /**
   * Lo que verá / recibirá el sink: entrada del paso en una ejecución, salida real del nodo anterior,
   * o —solo en editor— el JSON de prueba del Code (`testInputJson`), no el wrapper { nodeId, data }.
   */
  const inputPreview = useMemo(() => {
    if (runExec?.input !== undefined) return runExec.input;
    const prevRe = (previousNode?.data as { runExecution?: NodeRunExecutionView } | undefined)?.runExecution;
    if (prevRe && !prevRe.error && prevRe.output !== undefined) {
      return prevRe.output;
    }
    if (!previousNode) return null;
    const shell = {
      nodeId: previousNode.id,
      type: previousNode.type,
      label: (previousNode.data as { label?: string } | undefined)?.label ?? null,
      data: previousNode.data ?? {},
    };
    const fromEditor = unwrapMappingPayload(shell);
    if (fromEditor != null && fromEditor !== shell && looksLikeWorkflowStepPayload(fromEditor)) {
      return fromEditor;
    }
    return shell;
  }, [previousNode, runExec?.input]);

  const mappingSourcePayload = useMemo(() => {
    if (runExec?.input !== undefined) return runExec.input;
    const prevRe = (previousNode?.data as { runExecution?: NodeRunExecutionView } | undefined)?.runExecution;
    if (prevRe && !prevRe.error && prevRe.output !== undefined) return prevRe.output;
    return null;
  }, [runExec?.input, previousNode]);

  const mappingInferencePayload = useMemo(() => {
    const primary = unwrapMappingPayload(mappingSourcePayload);
    if (primary != null) return primary;
    if (inputPreview != null) return unwrapMappingPayload(inputPreview);
    return null;
  }, [mappingSourcePayload, inputPreview]);

  const sampleRowForMappings = useMemo(
    () => pickSampleRowForMappings(mappingInferencePayload, arrayPath),
    [mappingInferencePayload, arrayPath],
  );

  const sinkRunOutputPreview = useMemo(() => {
    if (!runExec) return null;
    if (runExec.error) {
      return {
        error: runExec.error,
        response: runExec.output ?? null,
        logs: runExec.logs ?? [],
      };
    }
    if (runExec.output !== undefined) return runExec.output;
    return { logs: runExec.logs ?? [], note: 'Sin resultado en esta ejecución' };
  }, [runExec]);

  const onCopyOutput = useCallback(async () => {
    if (sinkRunOutputPreview == null) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(sinkRunOutputPreview, null, 2));
      setCopyState('ok');
      window.setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('err');
      window.setTimeout(() => setCopyState('idle'), 2000);
    }
  }, [sinkRunOutputPreview]);

  const baseMappingOptionSet = useMemo(() => buildBaseMappingOptions(sampleRowForMappings), [sampleRowForMappings]);

  const mappableColumns = useMemo(
    () => columns.filter((c) => !SERVER_COLUMNS.has(c.columnName)),
    [columns],
  );

  const optionsForColumn = useCallback(
    (columnName: string) => {
      const cur = (fieldMappings[columnName] ?? '').trim();
      const s = new Set(baseMappingOptionSet);
      if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(columnName)) {
        s.add(`$row.${columnName}`);
      }
      if (cur) s.add(cur);
      return sortMappingSelectOptions(Array.from(s));
    },
    [baseMappingOptionSet, fieldMappings],
  );

  return (
    <div
      className="fixed inset-0 z-[320] flex flex-col bg-white dark:bg-neutral-950"
      role="dialog"
      aria-label="Configurar destino data bridge"
    >
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-2.5 dark:border-neutral-800">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">Guardar en data bridge</h1>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
            Nodo: {label || node.id} · flujo {workflowId.slice(0, 8)}…
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onApply}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-500"
          >
            Guardar y cerrar
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-neutral-800"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_minmax(0,1fr)]">
        {/* Izquierda: entrada */}
        <aside className="flex min-h-0 min-w-0 flex-col border-b border-gray-200 dark:border-neutral-800 lg:border-b-0 lg:border-r">
          <div className="shrink-0 border-b border-gray-100 px-3 py-2 dark:border-neutral-800">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">Entrada</h2>
            <p className="mt-0.5 text-[11px] leading-snug text-gray-500 dark:text-gray-400">
              Misma forma que en ejecución: salida del nodo anterior, entrada del sink en la última corrida, o el JSON
              de prueba del Code (no el editor interno).
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden p-2">
            <div className="h-full min-h-[200px] overflow-hidden rounded-lg border border-gray-200 dark:border-neutral-700 lg:min-h-0">
              {inputPreview != null ? (
                <WorkflowJsonResultViewer data={inputPreview} fillContainer />
              ) : (
                <div className="flex h-full min-h-[160px] items-center justify-center p-3 text-center text-xs text-gray-500 dark:text-gray-400">
                  Conecta un nodo antes del sink para ver la entrada.
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Centro: configuración */}
        <main className="min-h-0 min-w-0 overflow-y-auto border-b border-gray-200 p-4 dark:border-neutral-800 lg:border-b-0 lg:border-x lg:px-4">
          {loadErr && (
            <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
              {loadErr}
            </p>
          )}
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Etiqueta</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-600 dark:bg-neutral-900 dark:text-gray-100"
          />

          <label className="mt-4 block text-xs font-medium text-gray-700 dark:text-gray-300">Tabla (data_bridge)</label>
          <select
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            disabled={busyTables || tables.length === 0}
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-600 dark:bg-neutral-900 dark:text-gray-100"
          >
            {tables.length === 0 && !busyTables ? (
              <option value="">No hay tablas BASE en data_bridge (o sin permiso de lectura al catálogo)</option>
            ) : null}
            {tables.map((t) => (
              <option key={t.tableName} value={t.tableName}>
                {t.tableName}
              </option>
            ))}
          </select>
          {busyTables && <p className="mt-1 text-[11px] text-gray-500">Cargando tablas…</p>}

          <label className="mt-4 block text-xs font-medium text-gray-700 dark:text-gray-300">
            Ruta al arreglo de filas
          </label>
          <input
            type="text"
            value={arrayPath}
            onChange={(e) => setArrayPath(e.target.value)}
            placeholder="rows (vacío = el paso anterior debe ser un arreglo)"
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 font-mono text-sm dark:border-neutral-600 dark:bg-neutral-900 dark:text-gray-100"
          />
          <p className="mt-1 text-[11px] leading-snug text-gray-500 dark:text-gray-400">
            Tras un nodo MSSQL suele ser <code className="rounded bg-gray-100 px-0.5 dark:bg-neutral-800">rows</code>.
            Vacío: se espera que la salida del paso anterior sea directamente un arreglo de objetos.
          </p>

          <p className="mt-4 text-xs font-medium text-gray-800 dark:text-gray-200">Mapeo de columnas</p>
          <p className="mt-1 text-[11px] leading-snug text-gray-500 dark:text-gray-400">
            Rutas inferidas desde la <strong>entrada</strong> (columna izquierda), según la ruta al arreglo. También{' '}
            <code className="rounded bg-gray-100 px-0.5 dark:bg-neutral-800">$businessId</code> y{' '}
            <code className="rounded bg-gray-100 px-0.5 dark:bg-neutral-800">$workflowId</code>. Si la tabla tiene{' '}
            <code className="rounded bg-gray-100 px-0.5 dark:bg-neutral-800">business_id</code> /{' '}
            <code className="rounded bg-gray-100 px-0.5 dark:bg-neutral-800">workflow_id</code>, el servidor las rellena.
          </p>
          {!sampleRowForMappings && previousNode && (
            <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-950 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-100">
              No se detectó una fila de ejemplo: revisa la ruta al arreglo o ejecuta el flujo para poblar el
              desplegable.
            </p>
          )}

          {busyCols && <p className="mt-2 text-[11px] text-gray-500">Cargando columnas…</p>}

          <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200 dark:border-neutral-700">
            <table className="w-full min-w-[320px] text-left text-xs">
              <thead className="bg-gray-50 dark:bg-neutral-900/80">
                <tr>
                  <th className="px-2 py-1.5 font-medium text-gray-600 dark:text-gray-400">Columna</th>
                  <th className="px-2 py-1.5 font-medium text-gray-600 dark:text-gray-400">Tipo</th>
                  <th className="px-2 py-1.5 font-medium text-gray-600 dark:text-gray-400">Expresión</th>
                </tr>
              </thead>
              <tbody>
                {columns
                  .filter((c) => SERVER_COLUMNS.has(c.columnName))
                  .map((c) => (
                    <tr key={c.columnName} className="border-t border-gray-100 bg-gray-50/80 dark:border-neutral-800 dark:bg-neutral-900/40">
                      <td className="px-2 py-1.5 font-mono text-gray-700 dark:text-gray-300">{c.columnName}</td>
                      <td className="px-2 py-1.5 text-gray-500">{c.dataType}</td>
                      <td className="px-2 py-1.5 text-gray-500 italic">Servidor</td>
                    </tr>
                  ))}
                {mappableColumns.map((c) => {
                  const cur = (fieldMappings[c.columnName] ?? '').trim();
                  const opts = optionsForColumn(c.columnName);
                  const inList = cur === '' || opts.includes(cur);
                  const other = mappingOtherMode[c.columnName] === true;
                  const selectValue = other ? CUSTOM_MAPPING_VALUE : inList ? cur : CUSTOM_MAPPING_VALUE;
                  const showTextInput = other || (!inList && cur !== '');
                  return (
                    <tr key={c.columnName} className="border-t border-gray-100 dark:border-neutral-800">
                      <td className="px-2 py-1.5 font-mono text-gray-800 dark:text-gray-200">
                        {c.columnName}
                        {c.isNullable === 'YES' || c.hasDefault ? (
                          <span className="ml-1 text-[10px] text-gray-400">opc.</span>
                        ) : null}
                      </td>
                      <td className="px-2 py-1.5 text-gray-600 dark:text-gray-400">{c.dataType}</td>
                      <td className="px-1 py-1">
                        <div className="flex min-w-0 flex-col gap-1">
                          <select
                            value={selectValue}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === CUSTOM_MAPPING_VALUE) {
                                setMappingOtherMode((m) => ({ ...m, [c.columnName]: true }));
                                setMapping(c.columnName, '');
                                return;
                              }
                              setMappingOtherMode((m) => ({ ...m, [c.columnName]: false }));
                              setMapping(c.columnName, v);
                            }}
                            className="w-full min-w-[140px] rounded border border-gray-200 bg-white px-1 py-1 font-mono text-[11px] dark:border-neutral-600 dark:bg-neutral-900 dark:text-gray-100"
                            aria-label={`Mapeo para ${c.columnName}`}
                          >
                            <option value="">(ninguno)</option>
                            {opts
                              .filter((o) => o !== '')
                              .map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))}
                            <option value={CUSTOM_MAPPING_VALUE}>Otro (texto libre)…</option>
                          </select>
                          {showTextInput && (
                            <input
                              type="text"
                              value={cur}
                              onChange={(e) => setMapping(c.columnName, e.target.value)}
                              placeholder={c.columnName === 'row_payload' ? '$row' : `$row.${c.columnName}`}
                              className="w-full min-w-[140px] rounded border border-dashed border-gray-300 bg-white px-1.5 py-1 font-mono text-[11px] dark:border-neutral-500 dark:bg-neutral-900 dark:text-gray-100"
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </main>

        {/* Derecha: salida de este nodo */}
        <aside className="flex min-h-0 min-w-0 flex-col border-gray-200 dark:border-neutral-800 lg:border-l">
          <div className="shrink-0 border-b border-gray-100 px-3 py-2 dark:border-neutral-800">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">Salida</h2>
                <p className="mt-0.5 text-[11px] leading-snug text-gray-500 dark:text-gray-400">
                  Respuesta real de este nodo en la última ejecución resaltada.
                </p>
              </div>
              <div className="flex items-center gap-1">
                {copyState === 'ok' && <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Copiado</span>}
                {copyState === 'err' && (
                  <span className="text-[10px] text-red-600 dark:text-red-400">No se pudo copiar</span>
                )}
                <button
                  type="button"
                  onClick={onCopyOutput}
                  disabled={sinkRunOutputPreview == null}
                  className="rounded border border-gray-300 bg-white px-2 py-1 text-[10px] font-medium text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-gray-100 dark:hover:bg-neutral-700"
                  title="Copiar respuesta del nodo"
                >
                  Copiar respuesta
                </button>
              </div>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden p-2">
            <div className="h-full min-h-[200px] overflow-hidden rounded-lg border border-gray-200 dark:border-neutral-700 lg:min-h-0">
              {sinkRunOutputPreview != null ? (
                <WorkflowJsonResultViewer data={sinkRunOutputPreview} fillContainer />
              ) : (
                <div className="flex h-full min-h-[160px] items-center justify-center p-3 text-center text-xs text-gray-500 dark:text-gray-400">
                  Ejecuta el flujo con este nodo en contexto (p. ej. pestaña Ejecuciones) para ver la salida aquí.
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
