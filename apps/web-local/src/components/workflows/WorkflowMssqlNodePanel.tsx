import { useCallback, useEffect, useState } from 'react';
import type { Node } from '@xyflow/react';
import type { ConnectorRow } from '@/lib/integration-workflows';
import { ApiError } from '@/lib/api';
import { previewMssqlQuery, testMssqlConnectionForConnector, type MssqlPreviewResult } from '@/lib/integration-workflows';

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

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
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

  useEffect(() => {
    const d = (node.data || {}) as { connectorId?: string; query?: string; label?: string };
    setConnectorId(d.connectorId || '');
    setQuery(typeof d.query === 'string' && d.query.trim() ? d.query : DEFAULT_QUERY);
    setPreview(null);
    setPreviewError(null);
    setTestStatus(null);
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

  const inputJson = previousNode
    ? {
        nodeId: previousNode.id,
        type: previousNode.type,
        label: (previousNode.data as { label?: string } | undefined)?.label ?? null,
        data: previousNode.data ?? {},
      }
    : null;

  const rows = Array.isArray(preview?.rows) ? preview?.rows : [];
  const firstRow = rows[0];
  const tableKeys = isRecord(firstRow) ? Object.keys(firstRow) : [];

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
        <section className="flex min-h-0 flex-col border-b border-gray-200 dark:border-neutral-800 md:border-b-0 md:border-r">
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
          <div className="min-h-0 flex-1 overflow-auto p-3 text-xs">
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
            ) : (
              <pre className="whitespace-pre-wrap break-words rounded border border-gray-200 bg-gray-50 p-2 font-mono text-[11px] text-gray-800 dark:border-neutral-700 dark:bg-neutral-900/50 dark:text-gray-200">
                {JSON.stringify(inputJson, null, 2)}
              </pre>
            )}
          </div>
        </section>

        {/* Proceso */}
        <section className="flex min-h-0 flex-col border-b border-gray-200 dark:border-neutral-800 md:border-b-0 md:border-r">
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
              <label className="text-xs text-gray-500">Consulta SQL</label>
              <textarea
                className="mt-0.5 w-full min-h-[140px] rounded border border-gray-300 bg-white px-2 py-1.5 font-mono text-xs text-gray-900 dark:border-neutral-600 dark:bg-neutral-900 dark:text-gray-100"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                spellCheck={false}
              />
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              La misma consulta se usará al ejecutar el flujo. El servidor puede limitar el número de filas.
            </p>
          </div>
        </section>

        {/* Salida */}
        <section className="flex min-h-0 flex-col">
          <div className="border-b border-gray-100 bg-gray-50 dark:border-neutral-800 dark:bg-neutral-900/80 px-3 py-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Salida</h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Resultado de la consulta (vista previa)</p>
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
            <div className="min-h-0 flex-1 overflow-auto p-2 text-xs">
              {previewError && (
                <p className="text-red-700 dark:text-red-300 whitespace-pre-wrap">{previewError}</p>
              )}
              {preview && !previewError && outTab === 'json' && (
                <pre className="whitespace-pre-wrap break-words font-mono text-[11px] text-gray-800 dark:text-gray-200">
                  {JSON.stringify(preview, null, 2)}
                </pre>
              )}
              {preview && !previewError && outTab === 'table' && rows.length > 0 && tableKeys.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[11px]">
                    <thead>
                      <tr>
                        {tableKeys.map((k) => (
                          <th key={k} className="border border-gray-200 bg-gray-100 px-1 py-0.5 text-left font-medium dark:border-neutral-600 dark:bg-neutral-800">
                            {k}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 100).map((row, i) => (
                        <tr key={i}>
                          {isRecord(row)
                            ? tableKeys.map((k) => (
                                <td key={k} className="border border-gray-100 px-1 py-0.5 font-mono dark:border-neutral-700">
                                  {row[k] === null || row[k] === undefined
                                    ? ''
                                    : String(row[k] as string | number | boolean)}
                                </td>
                              ))
                            : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {preview && !previewError && outTab === 'table' && rows.length === 0 && (
                <p className="text-gray-500">0 filas</p>
              )}
              {preview && !previewError && outTab === 'schema' && (
                <ul className="list-inside list-disc text-gray-700 dark:text-gray-200">
                  {tableKeys.length ? (
                    tableKeys.map((k) => <li key={k}>{k}</li>)
                  ) : (
                    <li className="list-none">Sin filas; ejecuta la consulta para inferir columnas</li>
                  )}
                </ul>
              )}
              {!preview && !previewError && !queryBusy && (
                <p className="text-gray-500">Ejecuta la consulta para ver la salida.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
