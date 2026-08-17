import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Node } from '@xyflow/react';
import type { ConnectorRow, HttpKvPair, HttpRestBodyMode } from '@/lib/integration-workflows';
import { ApiError } from '@/lib/api';
import {
  previewHttpRestRequest,
  testHttpRestConnectionForConnector,
  type HttpRestPreviewResult,
} from '@/lib/integration-workflows';
import { WorkflowJsonResultViewer } from './WorkflowJsonResultViewer';
import {
  compactHttpKvPairs,
  emptyHttpKvPair,
  mergeHttpKvPairs,
  normalizeHttpKvPairs,
  pathnameOnly,
  splitPathAndQuery,
  WorkflowHttpKvEditor,
} from './WorkflowHttpKvEditor';
import type { NodeRunExecutionView } from './workflow-run-types';

type Props = {
  businessId: string;
  node: Node;
  previousNode: Node | null;
  connectors: ConnectorRow[];
  onClose: () => void;
  onSave: (nodeId: string, data: Record<string, unknown>) => void;
};

const METHODS = ['GET', 'POST'] as const;
type RequestTab = 'params' | 'headers' | 'body' | 'pagination';

function httpResultFromRunExecution(
  re: NodeRunExecutionView | undefined,
): { preview: HttpRestPreviewResult | null; flowError: string | null; jsonFallback: unknown } {
  if (!re) return { preview: null, flowError: null, jsonFallback: null };
  if (re.error) return { preview: null, flowError: re.error, jsonFallback: null };
  const out = re.output;
  if (
    out != null &&
    typeof out === 'object' &&
    !Array.isArray(out) &&
    'statusCode' in (out as object) &&
    'body' in (out as object)
  ) {
    return { preview: out as HttpRestPreviewResult, flowError: null, jsonFallback: out };
  }
  if (out !== undefined) {
    return { preview: null, flowError: null, jsonFallback: out };
  }
  return { preview: null, flowError: null, jsonFallback: null };
}

export function WorkflowHttpNodePanel({
  businessId,
  node,
  previousNode,
  connectors,
  onClose,
  onSave,
}: Props) {
  const httpConnectors = connectors.filter((c) => c.connectorTypeId === 'http_rest');
  const [connectorId, setConnectorId] = useState('');
  const [method, setMethod] = useState<(typeof METHODS)[number]>('GET');
  const [path, setPath] = useState('');
  const [queryParams, setQueryParams] = useState<HttpKvPair[]>([emptyHttpKvPair()]);
  const [headers, setHeaders] = useState<HttpKvPair[]>([emptyHttpKvPair()]);
  const [bodyMode, setBodyMode] = useState<HttpRestBodyMode>('none');
  const [bodyParams, setBodyParams] = useState<HttpKvPair[]>([emptyHttpKvPair()]);
  const [bodyJson, setBodyJson] = useState('{\n  \n}');
  const [paginationEnabled, setPaginationEnabled] = useState(false);
  const [pageParam, setPageParam] = useState('page');
  const [startPage, setStartPage] = useState('1');
  const [pageSizeParam, setPageSizeParam] = useState('pageSize');
  const [pageSize, setPageSize] = useState('100');
  const [itemsPath, setItemsPath] = useState('items');
  const [totalPath, setTotalPath] = useState('total');
  const [maxPages, setMaxPages] = useState('500');
  const [reqTab, setReqTab] = useState<RequestTab>('params');
  const [inTab, setInTab] = useState<'json' | 'text'>('json');
  const [outTab, setOutTab] = useState<'json' | 'meta'>('json');
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [testBusy, setTestBusy] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [preview, setPreview] = useState<HttpRestPreviewResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  useEffect(() => {
    const d = (node.data || {}) as {
      connectorId?: string;
      method?: string;
      path?: string;
      queryParams?: unknown;
      headers?: unknown;
      bodyMode?: string;
      bodyParams?: unknown;
      bodyJson?: unknown;
      pagination?: {
        enabled?: boolean;
        pageParam?: string;
        startPage?: number;
        pageSizeParam?: string;
        pageSize?: number;
        itemsPath?: string;
        totalPath?: string;
        maxPages?: number;
      };
      label?: string;
    };
    setConnectorId(d.connectorId || '');
    const m = String(d.method || 'GET').toUpperCase();
    setMethod(m === 'POST' ? 'POST' : 'GET');
    const rawPath = typeof d.path === 'string' ? d.path : '';
    const split = splitPathAndQuery(rawPath);
    setPath(split.path);
    setQueryParams(
      normalizeHttpKvPairs(mergeHttpKvPairs(normalizeHttpKvPairs(d.queryParams), split.params)),
    );
    setHeaders(normalizeHttpKvPairs(d.headers));
    const bm = d.bodyMode === 'urlencoded' || d.bodyMode === 'json' ? d.bodyMode : 'none';
    setBodyMode(bm);
    setBodyParams(normalizeHttpKvPairs(d.bodyParams));
    if (typeof d.bodyJson === 'string') {
      setBodyJson(d.bodyJson);
    } else if (d.bodyJson && typeof d.bodyJson === 'object') {
      setBodyJson(JSON.stringify(d.bodyJson, null, 2));
    } else {
      setBodyJson('{\n  \n}');
    }
    const pg = d.pagination;
    setPaginationEnabled(pg?.enabled === true);
    setPageParam(typeof pg?.pageParam === 'string' && pg.pageParam.trim() ? pg.pageParam : 'page');
    setStartPage(String(pg?.startPage ?? 1));
    setPageSizeParam(typeof pg?.pageSizeParam === 'string' ? pg.pageSizeParam : 'pageSize');
    setPageSize(String(pg?.pageSize ?? 100));
    setItemsPath(typeof pg?.itemsPath === 'string' ? pg.itemsPath : 'items');
    setTotalPath(typeof pg?.totalPath === 'string' ? pg.totalPath : 'total');
    setMaxPages(String(pg?.maxPages ?? 500));
    setReqTab('params');
    setPreview(null);
    setPreviewError(null);
    setTestStatus(null);
    setSaveNotice(null);
    // Solo al abrir otro nodo: guardar no debe resetear pestaña ni vista previa.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rehydrate from the newly opened node
  }, [node.id]);

  useEffect(() => {
    if (!saveNotice) return;
    const t = window.setTimeout(() => setSaveNotice(null), 2000);
    return () => window.clearTimeout(t);
  }, [saveNotice]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const selectedConnector = httpConnectors.find((c) => c.id === connectorId);
  const baseUrl = selectedConnector ? String(selectedConnector.config?.baseUrl || '') : '';
  const authHeaderName = selectedConnector
    ? String(selectedConnector.config?.authHeaderName || '')
    : '';

  const cleanPath = pathnameOnly(path);

  const fullUrlPreview = useMemo(() => {
    if (!baseUrl) return '—';
    const b = baseUrl.replace(/\/+$/, '');
    const p = cleanPath;
    let joined = b;
    if (p) {
      joined = /^https?:\/\//i.test(p) ? p : `${b}/${p.replace(/^\/+/, '')}`;
    }
    try {
      const u = new URL(joined);
      u.search = '';
      for (const row of queryParams) {
        if (!row.enabled || !row.key.trim()) continue;
        u.searchParams.append(row.key.trim(), row.value);
      }
      return u.toString();
    } catch {
      return joined;
    }
  }, [baseUrl, cleanPath, queryParams]);

  const absorbPathQuery = useCallback(() => {
    const split = splitPathAndQuery(path);
    if (split.params.length === 0) {
      if (split.path !== path) setPath(split.path);
      return;
    }
    setPath(split.path);
    setQueryParams((prev) => normalizeHttpKvPairs(mergeHttpKvPairs(prev, split.params)));
  }, [path]);

  const onTest = useCallback(async () => {
    if (!connectorId) {
      setTestStatus('Elige un conector');
      return;
    }
    setTestBusy(true);
    setTestStatus(null);
    try {
      const r = await testHttpRestConnectionForConnector(businessId, connectorId, {});
      if (r.success) {
        setTestStatus(
          `Health OK (HTTP ${r.statusCode}).\n` + JSON.stringify(r.usedConnection, null, 2),
        );
      } else {
        setTestStatus(
          (r.message || 'Error') +
            '\n\n' +
            JSON.stringify({ usedConnection: r.usedConnection, statusCode: r.statusCode }, null, 2),
        );
      }
    } catch (e: unknown) {
      if (e instanceof ApiError && e.data && typeof e.data === 'object' && (e.data as { details?: unknown }).details) {
        setTestStatus(`${e.message}\n\n${JSON.stringify((e.data as { details: unknown }).details, null, 2)}`);
      } else {
        setTestStatus(e instanceof Error ? e.message : 'Error al probar');
      }
    } finally {
      setTestBusy(false);
    }
  }, [businessId, connectorId]);

  const onRunPreview = useCallback(async () => {
    if (!connectorId) {
      setPreviewError('Elige un conector');
      return;
    }
    setPreviewBusy(true);
    setPreviewError(null);
    setPreview(null);
    try {
      const r = await previewHttpRestRequest(businessId, connectorId, {
        method,
        path: cleanPath,
        queryParams: compactHttpKvPairs(queryParams),
        headers: compactHttpKvPairs(headers),
        bodyMode: method === 'POST' ? bodyMode : 'none',
        bodyParams: method === 'POST' && bodyMode === 'urlencoded' ? compactHttpKvPairs(bodyParams) : [],
        bodyJson: method === 'POST' && bodyMode === 'json' ? bodyJson : undefined,
      });
      setPreview(r);
      setOutTab('json');
    } catch (e: unknown) {
      if (e instanceof ApiError && e.data && typeof e.data === 'object' && (e.data as { details?: unknown }).details) {
        setPreviewError(`${e.message}\n\n${JSON.stringify((e.data as { details: unknown }).details, null, 2)}`);
      } else {
        setPreviewError(e instanceof Error ? e.message : 'Error al ejecutar la petición');
      }
    } finally {
      setPreviewBusy(false);
    }
  }, [bodyJson, bodyMode, bodyParams, businessId, cleanPath, connectorId, headers, method, queryParams]);

  const persistNode = useCallback((): boolean => {
    if (!connectorId) {
      setTestStatus('Elige un conector antes de guardar');
      return false;
    }
    onSave(node.id, {
      label: selectedConnector?.name || 'HTTP request',
      connectorId,
      method,
      path: cleanPath,
      queryParams: compactHttpKvPairs(queryParams),
      headers: compactHttpKvPairs(headers),
      bodyMode: method === 'POST' ? bodyMode : 'none',
      bodyParams: method === 'POST' ? compactHttpKvPairs(bodyParams) : [],
      bodyJson: method === 'POST' && bodyMode === 'json' ? bodyJson : '',
      pagination: {
        enabled: paginationEnabled,
        pageParam: pageParam.trim() || 'page',
        startPage: Math.max(1, Number(startPage) || 1),
        pageSizeParam: pageSizeParam.trim(),
        pageSize: Math.min(500, Math.max(1, Number(pageSize) || 100)),
        itemsPath: itemsPath.trim() || 'items',
        totalPath: totalPath.trim() || 'total',
        maxPages: Math.min(2000, Math.max(1, Number(maxPages) || 500)),
      },
    });
    return true;
  }, [
    bodyJson,
    bodyMode,
    bodyParams,
    connectorId,
    headers,
    method,
    node.id,
    onSave,
    cleanPath,
    queryParams,
    paginationEnabled,
    pageParam,
    startPage,
    pageSizeParam,
    pageSize,
    itemsPath,
    totalPath,
    maxPages,
    selectedConnector?.name,
  ]);

  const onSaveOnly = useCallback(() => {
    if (!persistNode()) return;
    setSaveNotice('Guardado');
  }, [persistNode]);

  const onSaveAndClose = useCallback(() => {
    if (!persistNode()) return;
    onClose();
  }, [onClose, persistNode]);

  const runExec = (node.data as { runExecution?: NodeRunExecutionView } | undefined)?.runExecution;

  const inputJson = previousNode
    ? {
        nodeId: previousNode.id,
        type: previousNode.type,
        label: (previousNode.data as { label?: string } | undefined)?.label ?? null,
        data: previousNode.data ?? {},
      }
    : null;

  const fromLastFlowRun = useMemo(() => httpResultFromRunExecution(runExec), [runExec]);
  const activePreview = preview ?? fromLastFlowRun.preview;
  const activeJsonPayload =
    preview != null
      ? preview
      : fromLastFlowRun.preview != null
        ? fromLastFlowRun.preview
        : fromLastFlowRun.jsonFallback;
  const showFlowErrorOnly = !preview && fromLastFlowRun.flowError;
  const isShowingFlowOutput = !preview && (fromLastFlowRun.preview != null || fromLastFlowRun.jsonFallback != null);

  return (
    <div
      className="fixed inset-0 z-[320] flex flex-col bg-white dark:bg-neutral-950"
      role="dialog"
      aria-label="Configurar HTTP request"
    >
      <header className="flex items-center justify-between border-b border-gray-200 dark:border-neutral-800 px-4 py-2.5 shrink-0">
        <div className="min-w-0">
          <h1 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">HTTP request</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            Nodo: {(node.data as { label?: string })?.label || node.id}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saveNotice && (
            <span className="text-xs text-emerald-700 dark:text-emerald-300" role="status">
              {saveNotice}
            </span>
          )}
          <button
            type="button"
            onClick={onSaveOnly}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-gray-100 dark:hover:bg-neutral-700"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={onSaveAndClose}
            className="rounded-md bg-black px-3 py-1.5 text-sm text-white hover:bg-neutral-800"
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
                  Conecta un nodo a la izquierda. Al ejecutar el flujo, aquí verás el resultado de ese paso.
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
                    Última ejecución: entrada a este nodo
                  </p>
                  <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pt-0.5">
                    <WorkflowJsonResultViewer data={runExec.input} fillContainer />
                  </div>
                </div>
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-gray-200 bg-gray-50/80 p-1.5 dark:border-neutral-700 dark:bg-neutral-900/40">
                  <p className="shrink-0 px-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                    Referencia de diseño (nodo conectado en el editor)
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
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              GET o POST, con params, headers y body (estilo Postman)
            </p>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            <div>
              <label className="text-xs text-gray-500">Conector HTTP / REST</label>
              <select
                className="mt-0.5 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-600 dark:bg-neutral-800"
                value={connectorId}
                onChange={(e) => setConnectorId(e.target.value)}
              >
                <option value="">— Selecciona —</option>
                {httpConnectors.map((c) => (
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
              <pre className="max-h-40 overflow-auto rounded border border-gray-200 bg-gray-50 p-2 text-[11px] text-gray-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-gray-200 whitespace-pre-wrap break-all">
                {testStatus}
              </pre>
            )}

            {baseUrl && (
              <div className="rounded-md border border-violet-100 bg-violet-50/70 px-2.5 py-2 text-[11px] text-violet-950 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-100">
                <div>
                  <span className="font-medium">URL base: </span>
                  <span className="break-all font-mono">{baseUrl}</span>
                </div>
                {authHeaderName && (
                  <div className="mt-1">
                    <span className="font-medium">Header auth: </span>
                    <span className="font-mono">{authHeaderName}</span>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label className="text-xs text-gray-500">Método</label>
                <select
                  className="mt-0.5 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-600 dark:bg-neutral-800"
                  value={method}
                  onChange={(e) => {
                    const next = e.target.value as (typeof METHODS)[number];
                    setMethod(next);
                    if (next === 'GET') setReqTab((t) => (t === 'body' ? 'params' : t));
                  }}
                >
                  {METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500">Ruta (relativa a la URL base)</label>
                <input
                  className="mt-0.5 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm font-mono dark:border-neutral-600 dark:bg-neutral-800"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  onBlur={absorbPathQuery}
                  placeholder="/inventario"
                />
                <p className="mt-0.5 text-[10px] text-gray-500">
                  Solo la ruta. Los query params van en la tabla Params (no en la URL).
                </p>
              </div>
            </div>

            <div className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-2 text-[11px] text-gray-600 dark:border-neutral-700 dark:bg-neutral-800/60 dark:text-gray-300">
              <span className="font-medium text-gray-700 dark:text-gray-200">URL efectiva: </span>
              <span className="break-all font-mono">{fullUrlPreview}</span>
              <p className="mt-1 text-[10px] text-gray-500">
                La API key se inyecta desde el conector (cifrada en servidor). No se edita aquí.
              </p>
            </div>

            <div>
              <div className="mb-2 flex gap-1 border-b border-gray-200 dark:border-neutral-700">
                {([
                  { id: 'params' as const, label: 'Params' },
                  { id: 'headers' as const, label: 'Headers' },
                  ...(method === 'POST' ? [{ id: 'body' as const, label: 'Body' }] : []),
                  { id: 'pagination' as const, label: paginationEnabled ? 'Paginación · on' : 'Paginación' },
                ]).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setReqTab(tab.id)}
                    className={`-mb-px border-b-2 px-2.5 py-1.5 text-[11px] font-medium ${
                      reqTab === tab.id
                        ? 'border-black text-gray-900 dark:border-white dark:text-gray-100'
                        : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {reqTab === 'params' && (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-gray-500">
                    Query params uno por fila. Se agregan a la URL en GET y POST. El checkbox
                    desactiva un param sin borrarlo.
                  </p>
                  <WorkflowHttpKvEditor
                    rows={queryParams}
                    onChange={setQueryParams}
                    keyPlaceholder="page"
                    valuePlaceholder="1"
                    addLabel="Agregar parámetro"
                  />
                </div>
              )}

              {reqTab === 'headers' && (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-gray-500">
                    Headers extra. Elige de las sugerencias (Accept, Content-Type, …) o escribe uno
                    propio. El de autenticación del conector se envía siempre y no se puede
                    sobrescribir.
                  </p>
                  <WorkflowHttpKvEditor
                    rows={headers}
                    onChange={setHeaders}
                    keyPlaceholder="Accept"
                    valuePlaceholder="application/json"
                    addLabel="Agregar header"
                    suggestions="headers"
                  />
                </div>
              )}

              {reqTab === 'body' && method === 'POST' && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-3 text-[11px] text-gray-700 dark:text-gray-200">
                    {(
                      [
                        ['none', 'Ninguno'],
                        ['urlencoded', 'x-www-form-urlencoded'],
                        ['json', 'JSON'],
                      ] as const
                    ).map(([id, label]) => (
                      <label key={id} className="inline-flex items-center gap-1.5">
                        <input
                          type="radio"
                          name="http-body-mode"
                          checked={bodyMode === id}
                          onChange={() => setBodyMode(id)}
                          className="accent-black"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  {bodyMode === 'none' && (
                    <p className="text-[11px] text-gray-500">Esta petición POST no enviará body.</p>
                  )}
                  {bodyMode === 'urlencoded' && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-gray-500">
                        Pares clave/valor en el body (application/x-www-form-urlencoded).
                      </p>
                      <WorkflowHttpKvEditor
                        rows={bodyParams}
                        onChange={setBodyParams}
                        keyPlaceholder="sku"
                        valuePlaceholder="04466AZ213"
                        addLabel="Agregar campo"
                      />
                    </div>
                  )}
                  {bodyMode === 'json' && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-gray-500">Body crudo (application/json).</p>
                      <textarea
                        className="h-40 w-full rounded border border-gray-300 bg-white p-2 font-mono text-[11px] dark:border-neutral-600 dark:bg-neutral-800"
                        value={bodyJson}
                        onChange={(e) => setBodyJson(e.target.value)}
                        spellCheck={false}
                        placeholder={'{\n  "sku": "04466AZ213"\n}'}
                      />
                    </div>
                  )}
                </div>
              )}

              {reqTab === 'pagination' && (
                <div className="space-y-3">
                  <label className="flex items-start gap-2 text-[12px] text-gray-800 dark:text-gray-200">
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-black"
                      checked={paginationEnabled}
                      onChange={(e) => setPaginationEnabled(e.target.checked)}
                    />
                    <span>
                      Paginar hasta el final
                      <span className="mt-0.5 block text-[10px] font-normal text-gray-500">
                        En Play, pide página 1, 2, 3… y en cada una corre Code y data_bridge. No junta
                        las 11 mil en memoria. La vista previa (botón rojo) sigue siendo una sola
                        página.
                      </span>
                    </span>
                  </label>
                  <div className={`grid grid-cols-2 gap-2 ${paginationEnabled ? '' : 'opacity-50 pointer-events-none'}`}>
                    <div>
                      <label className="text-[10px] text-gray-500">Param de página</label>
                      <input
                        className="mt-0.5 w-full rounded border border-gray-300 bg-white px-2 py-1 font-mono text-[12px] dark:border-neutral-600 dark:bg-neutral-800"
                        value={pageParam}
                        onChange={(e) => setPageParam(e.target.value)}
                        placeholder="page"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500">Página inicial</label>
                      <input
                        type="number"
                        min={1}
                        className="mt-0.5 w-full rounded border border-gray-300 bg-white px-2 py-1 font-mono text-[12px] dark:border-neutral-600 dark:bg-neutral-800"
                        value={startPage}
                        onChange={(e) => setStartPage(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500">Param de tamaño</label>
                      <input
                        className="mt-0.5 w-full rounded border border-gray-300 bg-white px-2 py-1 font-mono text-[12px] dark:border-neutral-600 dark:bg-neutral-800"
                        value={pageSizeParam}
                        onChange={(e) => setPageSizeParam(e.target.value)}
                        placeholder="pageSize"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500">Tamaño de página</label>
                      <input
                        type="number"
                        min={1}
                        max={500}
                        className="mt-0.5 w-full rounded border border-gray-300 bg-white px-2 py-1 font-mono text-[12px] dark:border-neutral-600 dark:bg-neutral-800"
                        value={pageSize}
                        onChange={(e) => setPageSize(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500">Ruta de ítems en el JSON</label>
                      <input
                        className="mt-0.5 w-full rounded border border-gray-300 bg-white px-2 py-1 font-mono text-[12px] dark:border-neutral-600 dark:bg-neutral-800"
                        value={itemsPath}
                        onChange={(e) => setItemsPath(e.target.value)}
                        placeholder="items"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500">Ruta de total</label>
                      <input
                        className="mt-0.5 w-full rounded border border-gray-300 bg-white px-2 py-1 font-mono text-[12px] dark:border-neutral-600 dark:bg-neutral-800"
                        value={totalPath}
                        onChange={(e) => setTotalPath(e.target.value)}
                        placeholder="total"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-gray-500">Máximo de páginas (tope de seguridad)</label>
                      <input
                        type="number"
                        min={1}
                        max={2000}
                        className="mt-0.5 w-full rounded border border-gray-300 bg-white px-2 py-1 font-mono text-[12px] dark:border-neutral-600 dark:bg-neutral-800"
                        value={maxPages}
                        onChange={(e) => setMaxPages(e.target.value)}
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    Para Dalton: ruta <span className="font-mono">/inventario</span>, param{' '}
                    <span className="font-mono">page</span>, tamaño{' '}
                    <span className="font-mono">pageSize=100</span>, ítems{' '}
                    <span className="font-mono">items</span>, total{' '}
                    <span className="font-mono">total</span>. Corta cuando{' '}
                    <span className="font-mono">items</span> viene vacío o{' '}
                    <span className="font-mono">page × pageSize ≥ total</span>.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Salida */}
        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50 dark:border-neutral-800 dark:bg-neutral-900/80 px-3 py-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Salida</h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Última ejecución del flujo o vista previa (botón rojo)
            </p>
            <div className="mt-1 flex gap-1">
              <button
                type="button"
                onClick={() => setOutTab('json')}
                className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${outTab === 'json' ? 'bg-white shadow dark:bg-neutral-800' : ''}`}
              >
                JSON
              </button>
              <button
                type="button"
                onClick={() => setOutTab('meta')}
                className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${outTab === 'meta' ? 'bg-white shadow dark:bg-neutral-800' : ''}`}
              >
                Meta
              </button>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3">
            <button
              type="button"
              onClick={onRunPreview}
              disabled={previewBusy || !connectorId}
              className="shrink-0 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
            >
              {previewBusy ? 'Ejecutando…' : 'Ejecutar petición (vista previa)'}
            </button>
            {paginationEnabled && (
              <p className="shrink-0 text-[10px] text-gray-500">
                Vista previa = una página. El Play del flujo pagina y escribe cada lote en data_bridge.
              </p>
            )}

            {previewError && (
              <pre className="max-h-28 shrink-0 overflow-auto rounded border border-red-200 bg-red-50 p-2 text-[11px] text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100 whitespace-pre-wrap break-all">
                {previewError}
              </pre>
            )}
            {showFlowErrorOnly && (
              <pre className="max-h-28 shrink-0 overflow-auto rounded border border-red-200 bg-red-50 p-2 text-[11px] text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100 whitespace-pre-wrap break-all">
                {fromLastFlowRun.flowError}
              </pre>
            )}
            {isShowingFlowOutput && !preview && (
              <p className="shrink-0 text-[10px] text-violet-700 dark:text-violet-300">
                Mostrando salida de la última ejecución del flujo. Usa el botón rojo para una vista previa nueva.
              </p>
            )}

            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              {!activeJsonPayload && !previewError && !showFlowErrorOnly ? (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Ejecuta el flujo (Play) o la vista previa (botón rojo) para ver la salida.
                </p>
              ) : outTab === 'meta' && activePreview ? (
                <dl className="space-y-2 text-xs text-gray-800 dark:text-gray-200">
                  <div>
                    <dt className="text-gray-500">HTTP</dt>
                    <dd className="font-mono">
                      {activePreview.method} → {activePreview.statusCode}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">URL</dt>
                    <dd className="break-all font-mono text-[11px]">{activePreview.url}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Conector</dt>
                    <dd>{activePreview.connectorName}</dd>
                  </div>
                </dl>
              ) : activeJsonPayload != null ? (
                <WorkflowJsonResultViewer
                  data={outTab === 'json' ? (activePreview?.body ?? activeJsonPayload) : activeJsonPayload}
                  fillContainer
                />
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
