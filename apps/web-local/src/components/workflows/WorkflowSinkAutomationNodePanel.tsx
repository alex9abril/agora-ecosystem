import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Node } from '@xyflow/react';
import { ApiError } from '@/lib/api';
import {
  fetchDataBridgeWriteTableColumns,
  fetchDataBridgeWriteTables,
  type DataBridgeWriteColumnRow,
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
  const [tables, setTables] = useState<{ tableName: string }[]>([]);
  const [columns, setColumns] = useState<DataBridgeWriteColumnRow[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [busyTables, setBusyTables] = useState(false);
  const [busyCols, setBusyCols] = useState(false);

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

  const inputPreview = useMemo(() => {
    if (runExec?.input !== undefined) return runExec.input;
    if (!previousNode) return null;
    return {
      nodeId: previousNode.id,
      type: previousNode.type,
      label: (previousNode.data as { label?: string } | undefined)?.label ?? null,
      data: previousNode.data ?? {},
    };
  }, [previousNode, runExec?.input]);

  const mappableColumns = useMemo(
    () => columns.filter((c) => !SERVER_COLUMNS.has(c.columnName)),
    [columns],
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

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-2">
        <div className="min-h-0 overflow-y-auto border-b border-gray-200 p-4 dark:border-neutral-800 lg:border-b-0 lg:border-r">
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
            {tables.length === 0 && !busyTables ? <option value="">Sin tablas disponibles</option> : null}
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
            Por fila: <code className="rounded bg-gray-100 px-0.5 dark:bg-neutral-800">$row</code> (objeto completo),{' '}
            <code className="rounded bg-gray-100 px-0.5 dark:bg-neutral-800">$row.campo</code>,{' '}
            <code className="rounded bg-gray-100 px-0.5 dark:bg-neutral-800">$businessId</code>,{' '}
            <code className="rounded bg-gray-100 px-0.5 dark:bg-neutral-800">$workflowId</code>.{' '}
            <code className="rounded bg-gray-100 px-0.5 dark:bg-neutral-800">business_id</code> y{' '}
            <code className="rounded bg-gray-100 px-0.5 dark:bg-neutral-800">workflow_id</code> los rellena el servidor.
          </p>

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
                {mappableColumns.map((c) => (
                  <tr key={c.columnName} className="border-t border-gray-100 dark:border-neutral-800">
                    <td className="px-2 py-1.5 font-mono text-gray-800 dark:text-gray-200">
                      {c.columnName}
                      {c.isNullable === 'YES' || c.hasDefault ? (
                        <span className="ml-1 text-[10px] text-gray-400">opc.</span>
                      ) : null}
                    </td>
                    <td className="px-2 py-1.5 text-gray-600 dark:text-gray-400">{c.dataType}</td>
                    <td className="px-1 py-1">
                      <input
                        type="text"
                        value={fieldMappings[c.columnName] ?? ''}
                        onChange={(e) => setMapping(c.columnName, e.target.value)}
                        placeholder={c.columnName === 'row_payload' ? '$row' : `$row.${c.columnName}`}
                        className="w-full min-w-[140px] rounded border border-gray-200 bg-white px-1.5 py-1 font-mono text-[11px] dark:border-neutral-600 dark:bg-neutral-900 dark:text-gray-100"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex min-h-0 flex-col p-4">
          <p className="text-xs font-medium text-gray-800 dark:text-gray-200">Entrada del paso anterior (referencia)</p>
          <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
            Útil para elegir rutas; la ejecución usa la salida real del grafo.
          </p>
          <div className="mt-2 min-h-0 flex-1 overflow-hidden rounded-lg border border-gray-200 dark:border-neutral-700">
            {inputPreview != null ? (
              <WorkflowJsonResultViewer data={inputPreview} fillContainer />
            ) : (
              <div className="flex h-40 items-center justify-center p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                Conecta un nodo a la izquierda para ver contexto.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
