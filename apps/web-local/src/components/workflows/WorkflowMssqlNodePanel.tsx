import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Node } from '@xyflow/react';
import type { ConnectorRow } from '@/lib/integration-workflows';
import { ApiError } from '@/lib/api';
import { previewMssqlQuery, testMssqlConnectionForConnector, type MssqlPreviewResult } from '@/lib/integration-workflows';
import { WorkflowJsonResultViewer } from './WorkflowJsonResultViewer';
import type { NodeRunExecutionView } from './workflow-run-types';

/** Convierte la salida del paso en el grafo a la misma forma que la vista previa API. */
function mssqlResultFromRunExecution(
  re: NodeRunExecutionView | undefined,
): { preview: MssqlPreviewResult | null; flowError: string | null; jsonFallback: unknown } {
  if (!re) return { preview: null, flowError: null, jsonFallback: null };
  if (re.error) return { preview: null, flowError: re.error, jsonFallback: null };
  const out = re.output;
  if (out != null && typeof out === 'object' && !Array.isArray(out) && Array.isArray((out as { rows?: unknown }).rows)) {
    const o = out as { rows: unknown[]; truncated?: boolean; total?: number };
    return { preview: { rows: o.rows, truncated: o.truncated, total: o.total }, flowError: null, jsonFallback: o };
  }
  if (Array.isArray(out)) {
    return { preview: { rows: out }, flowError: null, jsonFallback: { rows: out } };
  }
  if (out !== undefined) {
    return { preview: null, flowError: null, jsonFallback: out };
  }
  return { preview: null, flowError: null, jsonFallback: null };
}

const MssqlQueryEditor = dynamic(
  () => import('./WorkflowMssqlQueryEditor').then((m) => m.WorkflowMssqlQueryEditor),
  {
    ssr: false,
    loading: () => (
      <div
        className="mt-0.5 h-[196px] min-h-[176px] rounded-md border border-dashed border-gray-300 dark:border-neutral-600 bg-gray-50 dark:bg-neutral-900/50 animate-pulse"
        aria-hidden
      />
    ),
  },
);

type ViewTab = 'json' | 'table' | 'schema';

type Props = {
  businessId: string;
  node: Node;
  previousNode: Node | null;
  connectors: ConnectorRow[];
  onClose: () => void;
  onSave: (nodeId: string, data: Record<string, unknown>) => void;
};

const DEFAULT_QUERY = 'SELECT 1 AS ok';

const TABLE_PAGE_SIZES = [25, 50, 100] as const;

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}

function cellString(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

function escapeTsvField(s: string): string {
  if (s.includes('\t') || s.includes('\n') || s.includes('\r') || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function comparePreviewCells(a: unknown, b: unknown, dir: 'asc' | 'desc'): number {
  const sa = cellString(a);
  const sb = cellString(b);
  const cmp = sa.localeCompare(sb, undefined, { numeric: true, sensitivity: 'base' });
  return dir === 'asc' ? cmp : -cmp;
}

/** Etiqueta legible a partir de valores devueltos (JSON/JS); no es el tipo T-SQL del servidor. */
function classifyPreviewValue(v: unknown): string {
  if (v === null) return 'nulo';
  if (v === undefined) return 'vacío';
  if (typeof v === 'boolean') return 'booleano';
  if (typeof v === 'number') {
    if (Number.isNaN(v)) return 'NaN';
    return Number.isInteger(v) ? 'entero' : 'decimal';
  }
  if (typeof v === 'bigint') return 'entero largo';
  if (v instanceof Date) return 'fecha/hora';
  if (typeof v === 'string') {
    if (/^\d{4}-\d{2}-\d{2}([T ].*)?$/.test(v.trim())) return 'fecha/hora (ISO)';
    return 'texto';
  }
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(v)) return 'binario';
  if (v instanceof ArrayBuffer) return 'binario';
  if (Array.isArray(v)) return 'arreglo';
  return 'objeto';
}

function inferColumnTypeLabel(columnKey: string, dataRows: unknown[]): string {
  const labels = new Set<string>();
  for (const row of dataRows) {
    if (!isRecord(row)) continue;
    const v = row[columnKey];
    if (v === null || v === undefined) continue;
    labels.add(classifyPreviewValue(v));
  }
  if (labels.size === 0) return 'solo nulos o vacío';
  return Array.from(labels)
    .sort()
    .join(' · ');
}

export function WorkflowMssqlNodePanel({ businessId, node, previousNode, connectors, onClose, onSave }: Props) {
  const mssql = connectors.filter((c) => c.connectorTypeId === 'mssql');
  const [connectorId, setConnectorId] = useState<string>('');
  const [query, setQuery] = useState<string>(DEFAULT_QUERY);
  const [outTab, setOutTab] = useState<ViewTab>('json');
  const [inTab, setInTab] = useState<'json' | 'text'>('json');
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [testBusy, setTestBusy] = useState(false);
  const [queryBusy, setQueryBusy] = useState(false);
  const [preview, setPreview] = useState<MssqlPreviewResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [tableFilter, setTableFilter] = useState('');
  const [tableSort, setTableSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState<(typeof TABLE_PAGE_SIZES)[number]>(25);
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'err'>('idle');

  useEffect(() => {
    const d = (node.data || {}) as { connectorId?: string; query?: string; label?: string };
    setConnectorId(d.connectorId || '');
    setQuery(typeof d.query === 'string' && d.query.trim() ? d.query : DEFAULT_QUERY);
    setPreview(null);
    setPreviewError(null);
    setTestStatus(null);
    setTableFilter('');
    setTableSort(null);
    setTablePage(1);
  }, [node.id, node.data]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const selectedConnector = mssql.find((c) => c.id === connectorId);

  const onTest = useCallback(async () => {
    if (!connectorId) {
      setTestStatus('Elige un conector');
      return;
    }
    setTestBusy(true);
    setTestStatus(null);
    try {
      const r = await testMssqlConnectionForConnector(businessId, connectorId, {});
      if (r.success) {
        setTestStatus(
          'Conexión correcta. Parámetros usados (sin contraseña):\n' + JSON.stringify(r.usedConnection, null, 2),
        );
      } else {
        setTestStatus(
          (r.message || 'Error') +
            '\n\n' +
            JSON.stringify(
              {
                usedConnection: r.usedConnection,
                errorCode: r.errorCode,
                errorNumber: r.errorNumber,
                sqlState: r.sqlState,
              },
              null,
              2,
            ),
        );
      }
    } catch (e: unknown) {
      if (e instanceof ApiError && e.data && typeof e.data === 'object' && (e.data as { details?: unknown }).details) {
        const d = (e.data as { details: unknown }).details;
        setTestStatus(`${e.message}\n\n${JSON.stringify(d, null, 2)}`);
      } else {
        setTestStatus(e instanceof Error ? e.message : 'Error al probar');
      }
    } finally {
      setTestBusy(false);
    }
  }, [businessId, connectorId]);

  const onRunQuery = useCallback(async () => {
    if (!connectorId) {
      setPreviewError('Elige un conector');
      return;
    }
    setQueryBusy(true);
    setPreviewError(null);
    setPreview(null);
    try {
      const r = await previewMssqlQuery(businessId, connectorId, query);
      setPreview(r);
    } catch (e: unknown) {
      if (e instanceof ApiError && e.data && typeof e.data === 'object' && (e.data as { details?: unknown }).details) {
        const d = (e.data as { details: unknown }).details;
        setPreviewError(`${e.message}\n\n${JSON.stringify(d, null, 2)}`);
      } else {
        setPreviewError(e instanceof Error ? e.message : 'Error al ejecutar la consulta');
      }
    } finally {
      setQueryBusy(false);
    }
  }, [businessId, connectorId, query]);

  const onApply = useCallback(() => {
    const label = selectedConnector?.name || 'Origen de datos';
    onSave(node.id, {
      connectorId,
      query: query.trim() || DEFAULT_QUERY,
      label,
    });
    onClose();
  }, [connectorId, node.id, onClose, onSave, query, selectedConnector?.name]);

  const runExec = (node.data as { runExecution?: NodeRunExecutionView } | undefined)?.runExecution;

  const inputJson = previousNode
    ? {
        nodeId: previousNode.id,
        type: previousNode.type,
        label: (previousNode.data as { label?: string } | undefined)?.label ?? null,
        data: previousNode.data ?? {},
      }
    : null;

  const fromLastFlowRun = useMemo(() => mssqlResultFromRunExecution(runExec), [runExec]);

  /** Vista previa interactiva gana; si no, rellenamos con la última ejecución del flujo. */
  const activePreview = preview ?? fromLastFlowRun.preview;
  const activeJsonPayload =
    preview != null
      ? preview
      : fromLastFlowRun.preview != null
        ? fromLastFlowRun.preview
        : fromLastFlowRun.jsonFallback;
  const showFlowErrorOnly = !preview && fromLastFlowRun.flowError;
  const isShowingFlowOutput = !preview && fromLastFlowRun.preview != null;
  const isShowingFlowJson = !preview && fromLastFlowRun.preview == null && fromLastFlowRun.jsonFallback != null;

  const rows = Array.isArray(activePreview?.rows) ? activePreview?.rows : [];
  const firstRow = rows[0];
  const tableKeys = isRecord(firstRow) ? Object.keys(firstRow) : [];

  useEffect(() => {
    setTableFilter('');
    setTableSort(null);
    setTablePage(1);
  }, [activePreview, node.id]);

  const filteredTableRows = useMemo(() => {
    if (!rows.length) return [];
    const q = tableFilter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      if (!isRecord(row)) return false;
      return tableKeys.some((k) => cellString(row[k]).toLowerCase().includes(q));
    });
  }, [rows, tableKeys, tableFilter]);

  const sortedTableRows = useMemo(() => {
    if (!tableSort) return filteredTableRows;
    const { key, dir } = tableSort;
    const next = [...filteredTableRows];
    next.sort((a, b) => {
      if (!isRecord(a) || !isRecord(b)) return 0;
      return comparePreviewCells(a[key], b[key], dir);
    });
    return next;
  }, [filteredTableRows, tableSort]);

  const tableRowCount = sortedTableRows.length;
  const tablePageCount = Math.max(1, Math.ceil(tableRowCount / tablePageSize) || 1);
  const effectiveTablePage = Math.min(Math.max(1, tablePage), tablePageCount);

  useEffect(() => {
    if (tablePage !== effectiveTablePage) {
      setTablePage(effectiveTablePage);
    }
  }, [tablePage, effectiveTablePage]);

  useEffect(() => {
    setTablePage(1);
  }, [tableFilter]);

  const pageTableRows = useMemo(() => {
    const start = (effectiveTablePage - 1) * tablePageSize;
    return sortedTableRows.slice(start, start + tablePageSize);
  }, [sortedTableRows, effectiveTablePage, tablePageSize]);

  const schemaColumnMeta = useMemo(
    () => tableKeys.map((k) => ({ key: k, typeLabel: inferColumnTypeLabel(k, rows) })),
    [tableKeys, rows],
  );

  const onTableHeaderClick = useCallback((key: string) => {
    setTableSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
    });
  }, []);

  const onCopyTable = useCallback(async () => {
    if (!tableKeys.length) return;
    setCopyState('idle');
    const lines: string[] = [[escapeTsvField('índice'), ...tableKeys.map(escapeTsvField)].join('\t')];
    sortedTableRows.forEach((row, idx) => {
      if (!isRecord(row)) return;
      const num = String(idx + 1);
      lines.push([escapeTsvField(num), ...tableKeys.map((k) => escapeTsvField(cellString(row[k])))].join('\t'));
    });
    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopyState('ok');
      window.setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('err');
      window.setTimeout(() => setCopyState('idle'), 3000);
    }
  }, [tableKeys, sortedTableRows]);

  return (
    <div
      className="fixed inset-0 z-[320] flex flex-col bg-white dark:bg-neutral-950"
      role="dialog"
      aria-label="Configurar origen de datos MSSQL"
    >
      <header className="flex items-center justify-between border-b border-gray-200 dark:border-neutral-800 px-4 py-2.5 shrink-0">
        <div className="min-w-0">
          <h1 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            Origen de datos (MSSQL)
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Nodo: {(node.data as { label?: string })?.label || node.id}</p>
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
            className="rounded-md px-2 py-1 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-3">
        {/* Entrada */}
        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden border-b border-gray-200 dark:border-neutral-800 md:border-b-0 md:border-r">
          <div className="border-b border-gray-100 bg-gray-50 dark:border-neutral-800 dark:bg-neutral-900/80 px-3 py-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Entrada</h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Datos del nodo anterior conectado</p>
            <div className="mt-1 flex gap-1">
              <button
                type="button"
                onClick={() => setInTab('json')}
                className={`rounded px-1.5 py-0.5 text-[10px] ${inTab === 'json' ? 'bg-white shadow dark:bg-neutral-800' : ''}`}
              >
                JSON
              </button>
              <button
                type="button"
                onClick={() => setInTab('text')}
                className={`rounded px-1.5 py-0.5 text-[10px] ${inTab === 'text' ? 'bg-white shadow dark:bg-neutral-800' : ''}`}
              >
                Resumen
              </button>
            </div>
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-3 text-xs">
            {!previousNode ? (
              <div className="rounded border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
                <p className="text-amber-900 dark:text-amber-100">No hay nodo conectado a la entrada.</p>
                <p className="mt-1 text-amber-800/80 dark:text-amber-200/80">
                  Conecta un nodo a la izquierda de este origen. Al ejecutar el flujo, aquí verás el resultado
                  publicado por ese paso.
                </p>
              </div>
            ) : inTab === 'text' ? (
              <div className="space-y-1 text-gray-700 dark:text-gray-200">
                <p>
                  <span className="text-gray-500">Tipo:</span> {previousNode.type}
                </p>
                <p>
                  <span className="text-gray-500">Id:</span> {previousNode.id}
                </p>
              </div>
            ) : runExec ? (
              <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden">
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-emerald-200/90 bg-emerald-50/40 p-1.5 dark:border-emerald-800/60 dark:bg-emerald-950/20">
                  <p className="shrink-0 px-0.5 text-[10px] font-medium text-emerald-800 dark:text-emerald-200">
                    Última ejecución: entrada a este nodo (resultado publicado por el paso anterior)
                  </p>
                  <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pt-0.5">
                    <WorkflowJsonResultViewer data={runExec.input} fillContainer />
                  </div>
                </div>
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-gray-200 bg-gray-50/80 p-1.5 dark:border-neutral-700 dark:bg-neutral-900/40">
                  <p className="shrink-0 px-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                    Referencia de diseño (nodo conectado en el editor; el objeto puede incluir metadatos de I/O)
                  </p>
                  <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pt-0.5">
                    <WorkflowJsonResultViewer data={inputJson} fillContainer />
                  </div>
                </div>
              </div>
            ) : (
              inputJson && (
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                  <WorkflowJsonResultViewer data={inputJson} fillContainer />
                </div>
              )
            )}
          </div>
        </section>

        {/* Proceso */}
        <section className="flex min-h-0 min-w-0 flex-col border-b border-gray-200 dark:border-neutral-800 md:border-b-0 md:border-r">
          <div className="border-b border-gray-100 bg-gray-50 dark:border-neutral-800 dark:bg-neutral-900/80 px-3 py-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Proceso</h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Conector y consulta SQL (SELECT)</p>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            <div>
              <label className="text-xs text-gray-500">Conector MSSQL</label>
              <select
                className="mt-0.5 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-600 dark:bg-neutral-800"
                value={connectorId}
                onChange={(e) => setConnectorId(e.target.value)}
              >
                <option value="">— Selecciona —</option>
                {mssql.map((c) => (
                  <option key={c.id} value={c.id} disabled={!c.isEnabled}>
                    {c.name} {!c.isEnabled ? '(inactivo)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onTest}
                disabled={testBusy || !connectorId}
                className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-gray-100 dark:hover:bg-neutral-700"
              >
                {testBusy ? 'Probando…' : 'Probar conexión'}
              </button>
            </div>
            {testStatus && (
              <pre
                className={`text-[10px] whitespace-pre-wrap break-words max-h-40 overflow-y-auto font-mono rounded border border-gray-200 dark:border-neutral-600 bg-gray-50 dark:bg-neutral-900/50 p-2 ${
                  testStatus.includes('correcta') ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-900 dark:text-amber-200'
                }`}
              >
                {testStatus}
              </pre>
            )}
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Consulta SQL (T‑SQL)</p>
                <span
                  className="text-[10px] text-gray-400 dark:text-gray-500"
                  title="Números de línea, resaltado T-SQL, indentación con Tab, tema claro/oscuro"
                >
                  Editor con resaltado · MSSQL
                </span>
              </div>
              <div className="mt-0.5" role="group" aria-label="Editor de consulta SQL">
                <MssqlQueryEditor value={query} onChange={setQuery} />
              </div>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              La misma consulta se usará al ejecutar el flujo. El servidor puede limitar el número de filas. Usa
              corchetes <code className="text-[10px]">[schema].[tabla]</code> como en Management Studio.
            </p>
          </div>
        </section>

        {/* Salida */}
        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50 dark:border-neutral-800 dark:bg-neutral-900/80 px-3 py-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Salida</h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Última ejecución del flujo o vista previa (botón rojo)
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {(['json', 'table', 'schema'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setOutTab(t)}
                  className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${outTab === t ? 'bg-white font-medium shadow dark:bg-neutral-800' : 'text-gray-500'}`}
                >
                  {t === 'json' ? 'JSON' : t === 'table' ? 'Tabla' : 'Esquema'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="border-b border-gray-100 p-2 dark:border-neutral-800">
              <button
                type="button"
                onClick={onRunQuery}
                disabled={queryBusy || !connectorId}
                className="w-full rounded-md bg-red-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50"
              >
                {queryBusy ? 'Ejecutando…' : 'Ejecutar consulta (vista previa)'}
              </button>
            </div>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-2 text-xs">
              {(isShowingFlowOutput || isShowingFlowJson) && (
                <p className="mb-1.5 shrink-0 rounded border border-emerald-200 bg-emerald-50/80 px-2 py-1 text-[10px] text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                  Mostrando la salida de la <strong>última ejecución</strong> del flujo. El botón rojo ejecuta otra
                  consulta al servidor (vista previa) y reemplaza esta vista mientras tengas el panel abierto.
                </p>
              )}
              {previewError && (
                <p className="shrink-0 text-red-700 dark:text-red-300 whitespace-pre-wrap overflow-y-auto max-h-48">
                  {previewError}
                </p>
              )}
              {showFlowErrorOnly && fromLastFlowRun.flowError && (
                <pre className="mb-1 shrink-0 max-h-48 overflow-y-auto rounded border border-red-200 bg-red-50/80 p-2 font-mono text-[10px] text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
                  {fromLastFlowRun.flowError}
                </pre>
              )}
              {activeJsonPayload != null && !previewError && !showFlowErrorOnly && outTab === 'json' && (
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                  <WorkflowJsonResultViewer data={activeJsonPayload} fillContainer />
                </div>
              )}
              {activePreview && !previewError && !showFlowErrorOnly && outTab === 'table' && rows.length > 0 && tableKeys.length > 0 && (
                <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor="mssql-table-filter">
                      Filtrar filas
                    </label>
                    <input
                      id="mssql-table-filter"
                      type="search"
                      value={tableFilter}
                      onChange={(e) => setTableFilter(e.target.value)}
                      placeholder="Filtrar por cualquier columna…"
                      className="min-w-[12rem] flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-[11px] text-gray-900 placeholder:text-gray-400 dark:border-neutral-600 dark:bg-neutral-900 dark:text-gray-100"
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={onCopyTable}
                      disabled={tableRowCount === 0}
                      className="shrink-0 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-gray-100 dark:hover:bg-neutral-700"
                    >
                      {copyState === 'ok' ? 'Copiado' : copyState === 'err' ? 'Error' : 'Copy'}
                    </button>
                  </div>
                  <p className="shrink-0 text-[10px] text-gray-500 dark:text-gray-400">
                    {tableFilter.trim()
                      ? `${sortedTableRows.length} fila${sortedTableRows.length === 1 ? '' : 's'} coinciden · de ${rows.length} en la respuesta de vista previa`
                      : `${rows.length} fila${rows.length === 1 ? '' : 's'} en la respuesta`}
                    {tableRowCount > 0
                      ? ` · filas ${(effectiveTablePage - 1) * tablePageSize + 1}–${Math.min(effectiveTablePage * tablePageSize, tableRowCount)} de ${tableRowCount} (vista filtrada/ordenada)`
                      : ''}
                    {activePreview?.truncated ? ' · resultado truncado en el servidor' : ''}
                  </p>
                  <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto rounded border border-gray-200 dark:border-neutral-700">
                    <table className="w-full border-collapse text-[11px]">
                      <thead>
                        <tr>
                          <th
                            className="w-10 border border-gray-200 bg-gray-100 px-1 py-0.5 text-right text-[10px] font-medium text-gray-600 dark:border-neutral-600 dark:bg-neutral-800 dark:text-gray-300"
                            scope="col"
                          >
                            índice
                          </th>
                          {tableKeys.map((k) => {
                            const sorted = tableSort?.key === k ? tableSort.dir : null;
                            return (
                              <th
                                key={k}
                                className="border border-gray-200 bg-gray-100 dark:border-neutral-600 dark:bg-neutral-800"
                                aria-sort={
                                  sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'
                                }
                              >
                                <button
                                  type="button"
                                  onClick={() => onTableHeaderClick(k)}
                                  className="flex w-full items-center justify-between gap-1 px-1 py-0.5 text-left font-medium text-gray-900 hover:bg-gray-200/80 dark:text-gray-100 dark:hover:bg-neutral-700/80"
                                >
                                  <span className="min-w-0 truncate">{k}</span>
                                  {sorted === 'asc' ? (
                                    <span className="shrink-0 text-gray-500" aria-hidden>
                                      ↑
                                    </span>
                                  ) : sorted === 'desc' ? (
                                    <span className="shrink-0 text-gray-500" aria-hidden>
                                      ↓
                                    </span>
                                  ) : (
                                    <span className="shrink-0 text-gray-300 dark:text-neutral-600" aria-hidden>
                                      ↕
                                    </span>
                                  )}
                                </button>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {pageTableRows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={tableKeys.length + 1}
                              className="border border-gray-100 px-2 py-3 text-center text-gray-500 dark:border-neutral-700"
                            >
                              {tableFilter.trim()
                                ? 'Ninguna fila coincide con el filtro.'
                                : 'Sin filas para mostrar.'}
                            </td>
                          </tr>
                        ) : (
                          pageTableRows.map((row, i) => {
                            const globalIdx = (effectiveTablePage - 1) * tablePageSize + i + 1;
                            return (
                              <tr key={`${globalIdx}-${i}`}>
                                <td className="border border-gray-100 px-1 py-0.5 text-right tabular-nums text-gray-500 dark:border-neutral-700">
                                  {globalIdx}
                                </td>
                                {isRecord(row)
                                  ? tableKeys.map((k) => (
                                      <td
                                        key={k}
                                        className="border border-gray-100 px-1 py-0.5 font-mono dark:border-neutral-700"
                                      >
                                        {row[k] === null || row[k] === undefined
                                          ? ''
                                          : String(row[k] as string | number | boolean)}
                                      </td>
                                    ))
                                  : null}
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  {tableRowCount > 0 && (
                    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 text-[10px] text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <span className="whitespace-nowrap">Filas por página</span>
                        <select
                          value={tablePageSize}
                          onChange={(e) => {
                            setTablePageSize(Number(e.target.value) as (typeof TABLE_PAGE_SIZES)[number]);
                            setTablePage(1);
                          }}
                          className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-[11px] text-gray-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-gray-100"
                        >
                          {TABLE_PAGE_SIZES.map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </div>
                      <span className="whitespace-nowrap" aria-live="polite">
                        Página {effectiveTablePage} de {tablePageCount} · {tableRowCount} en total
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                          disabled={effectiveTablePage <= 1}
                          className="rounded border border-gray-300 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-40 dark:border-neutral-600 dark:bg-neutral-800 dark:text-gray-100 dark:hover:bg-neutral-700"
                        >
                          Anterior
                        </button>
                        <button
                          type="button"
                          onClick={() => setTablePage((p) => Math.min(tablePageCount, p + 1))}
                          disabled={effectiveTablePage >= tablePageCount}
                          className="rounded border border-gray-300 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-40 dark:border-neutral-600 dark:bg-neutral-800 dark:text-gray-100 dark:hover:bg-neutral-700"
                        >
                          Siguiente
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {activePreview && !previewError && !showFlowErrorOnly && outTab === 'table' && rows.length === 0 && (
                <p className="shrink-0 text-gray-500">0 filas</p>
              )}
              {activePreview && !previewError && !showFlowErrorOnly && outTab === 'schema' && (
                <div className="flex min-h-0 flex-1 flex-col gap-1.5">
                  <p className="shrink-0 text-[10px] leading-snug text-gray-500 dark:text-gray-400">
                    Tipo inferido a partir de los valores en la vista previa (no es el tipo T‑SQL en el servidor).
                  </p>
                  {schemaColumnMeta.length > 0 ? (
                    <div
                      className="min-h-0 flex-1 overflow-y-auto rounded-md border border-gray-200 dark:border-neutral-700"
                      role="list"
                    >
                      {schemaColumnMeta.map((col) => (
                        <div
                          key={col.key}
                          role="listitem"
                          className="flex items-start justify-between gap-3 border-b border-gray-100 px-2.5 py-2 last:border-b-0 dark:border-neutral-800"
                        >
                          <span
                            className="min-w-0 break-words font-mono text-[11px] text-gray-900 dark:text-gray-100"
                            title={col.key}
                          >
                            {col.key}
                          </span>
                          <span
                            className="shrink-0 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-600 tabular-nums dark:border-neutral-600 dark:bg-neutral-800/80 dark:text-gray-300"
                            title="Tipo según los datos mostrados"
                          >
                            {col.typeLabel}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="shrink-0 rounded-md border border-dashed border-gray-200 px-2.5 py-3 text-center text-[11px] text-gray-500 dark:border-neutral-600 dark:text-gray-400">
                      Sin columnas. Ejecuta la consulta para detectar nombres y tipos aproximados.
                    </p>
                  )}
                </div>
              )}
              {!activeJsonPayload && !previewError && !queryBusy && !showFlowErrorOnly && (
                <p className="shrink-0 text-gray-500">Ejecuta el flujo (Play) o la vista previa (botón rojo) para ver la salida.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
