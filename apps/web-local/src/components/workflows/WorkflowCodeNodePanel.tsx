import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Node } from '@xyflow/react';
import { ApiError } from '@/lib/api';
import { previewWorkflowCode } from '@/lib/integration-workflows';
import { WorkflowCodeEditor } from './WorkflowCodeEditor';
import { WorkflowJsonResultViewer } from './WorkflowJsonResultViewer';
import type { NodeRunExecutionView } from './workflow-run-types';

const DEFAULT_CODE = `// Misma API que n8n: $input.first().json, $input.all()
// Lotes: divide arrays en el propio script (p. ej. const rows = $input.first().json?.rows)
return $input.first().json;
`;

type Props = {
  businessId: string;
  node: Node;
  previousNode: Node | null;
  onClose: () => void;
  onSave: (nodeId: string, data: Record<string, unknown>) => void;
};

function suggestedTestInputJson(nodeType: string | undefined): string {
  if (nodeType === 'connectorMssql') {
    return JSON.stringify({ rows: [], truncated: false }, null, 2);
  }
  if (nodeType === 'code') {
    return JSON.stringify({ example: 'salida de un nodo Code anterior' }, null, 2);
  }
  if (nodeType === 'sinkLog') {
    return JSON.stringify({ previous: {}, note: 'Salida interna' }, null, 2);
  }
  if (nodeType === 'triggerSchedule') {
    return JSON.stringify({ message: 'Disparo manual (programación interna aún no ejecuta cron)' }, null, 2);
  }
  return JSON.stringify({ message: 'ok' }, null, 2);
}

export function WorkflowCodeNodePanel({ businessId, node, previousNode, onClose, onSave }: Props) {
  const d = (node.data || {}) as { label?: string; code?: string; testInputJson?: string };
  const [label, setLabel] = useState(d.label || 'Code');
  const [code, setCode] = useState(typeof d.code === 'string' && d.code.trim() ? d.code : DEFAULT_CODE);
  const [testInputJson, setTestInputJson] = useState(
    typeof d.testInputJson === 'string' && d.testInputJson.trim()
      ? d.testInputJson
      : suggestedTestInputJson(previousNode?.type),
  );
  const [okPreview, setOkPreview] = useState<{ value: unknown; logs: string[] } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewErrorLogs, setPreviewErrorLogs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [inputTab, setInputTab] = useState<'vista' | 'texto'>('vista');

  const runExecution = useMemo(
    () => (node.data as { runExecution?: NodeRunExecutionView } | undefined)?.runExecution,
    [node.data],
  );

  useEffect(() => {
    const nd = (node.data || {}) as { label?: string; code?: string; testInputJson?: string; runExecution?: NodeRunExecutionView };
    setLabel(nd.label || 'Code');
    setCode(typeof nd.code === 'string' && nd.code.trim() ? nd.code : DEFAULT_CODE);
    const re = nd.runExecution;
    if (re) {
      try {
        setTestInputJson(JSON.stringify(re.input, null, 2));
      } catch {
        setTestInputJson(
          typeof nd.testInputJson === 'string' && nd.testInputJson.trim()
            ? nd.testInputJson
            : suggestedTestInputJson(previousNode?.type),
        );
      }
    } else {
      setTestInputJson(
        typeof nd.testInputJson === 'string' && nd.testInputJson.trim()
          ? nd.testInputJson
          : suggestedTestInputJson(previousNode?.type),
      );
    }
    setOkPreview(null);
    setPreviewError(null);
    setPreviewErrorLogs([]);
  }, [node.id, node.data, previousNode?.type]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const onResetTestInput = useCallback(() => {
    setTestInputJson(suggestedTestInputJson(previousNode?.type));
    setInputTab('vista');
  }, [previousNode?.type]);

  const testInputParse = useMemo(() => {
    const raw = testInputJson.trim();
    if (!raw) return { ok: true as const, value: { message: 'ok' } as unknown };
    try {
      return { ok: true as const, value: JSON.parse(raw) as unknown };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message || 'JSON no válido' };
    }
  }, [testInputJson]);

  const onRunPreview = useCallback(async () => {
    setBusy(true);
    setPreviewError(null);
    setPreviewErrorLogs([]);
    setOkPreview(null);
    let input: unknown;
    try {
      input = testInputJson.trim() ? JSON.parse(testInputJson) : { message: 'ok' };
    } catch {
      setPreviewError('JSON de entrada de prueba no válido');
      setBusy(false);
      return;
    }
    try {
      const r = await previewWorkflowCode(businessId, { code, input });
      if (r.success) {
        setOkPreview({ value: r.result, logs: r.logs });
      } else {
        setPreviewError(r.error);
        setPreviewErrorLogs(r.logs);
      }
    } catch (e: unknown) {
      if (e instanceof ApiError && e.data && typeof e.data === 'object') {
        setPreviewError(`${e.message}\n${JSON.stringify((e.data as { message?: unknown }).message || e.data)}`);
      } else {
        setPreviewError(e instanceof Error ? e.message : 'Error al ejecutar la vista previa');
      }
    } finally {
      setBusy(false);
    }
  }, [businessId, code, testInputJson]);

  const onApply = useCallback(() => {
    onSave(node.id, {
      label: label.trim() || 'Code',
      code,
      testInputJson,
    });
    onClose();
  }, [code, label, node.id, onClose, onSave, testInputJson]);

  const fromLastRunOut = useMemo(() => {
    if (!runExecution) return null;
    if (runExecution.error) {
      return { kind: 'error' as const, error: runExecution.error, logs: runExecution.logs ?? [] };
    }
    return { kind: 'ok' as const, value: runExecution.output, logs: runExecution.logs ?? [] };
  }, [runExecution]);

  const inputJson =
    previousNode
      ? {
          nodeId: previousNode.id,
          type: previousNode.type,
          label: (previousNode.data as { label?: string } | undefined)?.label ?? null,
        }
      : null;

  return (
    <div
      className="fixed inset-0 z-[320] flex flex-col bg-white dark:bg-neutral-950"
      role="dialog"
      aria-label="Configurar nodo Code"
    >
      <header className="flex items-center justify-between border-b border-gray-200 dark:border-neutral-800 px-4 py-2.5 shrink-0">
        <div className="min-w-0">
          <h1 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">Código (JavaScript)</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            Misma ejecución que al correr el flujo: sandbox en servidor, sin require/fs.
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
            className="rounded-md px-2 py-1 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-3">
        <section className="flex min-h-0 flex-col border-b border-gray-200 dark:border-neutral-800 md:border-b-0 md:border-r">
          <div className="shrink-0 border-b border-gray-100 bg-gray-50 dark:border-neutral-800 dark:bg-neutral-900/80 px-3 py-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Entrada ($input)</h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Debe ser el <strong className="font-medium">mismo JSON</strong> que publica el nodo previo. Tras
              &quot;Probar flujo&quot;, el cuadro se rellena con la entrada real; puedes editarlo y usar
              &quot;Vista previa&quot; sin guardar aún.
            </p>
            {runExecution && (
              <p className="mt-1 text-[10px] text-emerald-800 dark:text-emerald-200">
                Hay datos de la última ejecución: el JSON mostrado es el que <code className="text-[10px]">$input</code> recibió
                (salida del paso anterior, p. ej. <code className="text-[10px]">rows</code> del origen MSSQL).
              </p>
            )}
            {inputJson && !runExecution && (
              <p className="text-[10px] text-gray-500 dark:text-gray-500 mt-1">
                Nodo previo en el grafo: {String(inputJson.type)} · usa &quot;Sugerir&quot; o pega un ejemplo.
              </p>
            )}
            <button
              type="button"
              onClick={onResetTestInput}
              className="mt-1 rounded border border-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600 hover:bg-gray-100 dark:border-neutral-600 dark:text-gray-300 dark:hover:bg-neutral-800"
            >
              Sugerir según nodo previo
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-2">
            <div className="mb-1.5 flex shrink-0 flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setInputTab('vista')}
                className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                  inputTab === 'vista'
                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-neutral-800'
                }`}
              >
                Vista JSON
              </button>
              <button
                type="button"
                onClick={() => setInputTab('texto')}
                className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                  inputTab === 'texto'
                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-neutral-800'
                }`}
              >
                Editar texto
              </button>
            </div>
            {inputTab === 'vista' && testInputParse.ok && (
              <div className="flex min-h-[200px] min-h-0 flex-1 flex-col">
                <WorkflowJsonResultViewer data={testInputParse.value} fillContainer />
              </div>
            )}
            {inputTab === 'vista' && !testInputParse.ok && (
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <p className="shrink-0 text-[10px] text-red-700 dark:text-red-300">
                  {testInputParse.error} — pasa a &quot;Editar texto&quot; para corregir.
                </p>
                <button
                  type="button"
                  onClick={() => setInputTab('texto')}
                  className="shrink-0 self-start rounded border border-gray-300 bg-white px-2 py-1 text-[10px] text-gray-800 dark:border-neutral-600 dark:bg-neutral-800 dark:text-gray-200"
                >
                  Abrir editor de texto
                </button>
              </div>
            )}
            {inputTab === 'texto' && (
              <div className="flex min-h-[200px] min-h-0 flex-1 flex-col">
                <label className="shrink-0 text-[10px] text-gray-500" htmlFor="code-test-input">
                  JSON (texto)
                </label>
                <textarea
                  id="code-test-input"
                  value={testInputJson}
                  onChange={(e) => setTestInputJson(e.target.value)}
                  className="mt-0.5 min-h-[200px] w-full min-w-0 flex-1 resize-y rounded border border-gray-300 bg-white p-2 font-mono text-[11px] text-gray-900 dark:border-neutral-600 dark:bg-neutral-900 dark:text-gray-100"
                  spellCheck={false}
                />
                <p className="mt-1 shrink-0 text-[10px] text-gray-500 dark:text-gray-400">
                  Vuelve a &quot;Vista JSON&quot; para ver el mismo resaltado, líneas y copiado que en la salida.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="flex min-h-0 flex-col border-b border-gray-200 dark:border-neutral-800 md:border-b-0 md:border-r">
          <div className="border-b border-gray-100 bg-gray-50 dark:border-neutral-800 dark:bg-neutral-900/80 px-3 py-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Código</h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Cuerpo de función: usa <code className="text-[10px]">return</code>. Variables{' '}
              <code className="text-[10px]">$input</code> e <code className="text-[10px]">input</code> (alias) y <code className="text-[10px]">console.log</code> a la consola (se guarda en la vista previa).
            </p>
            <ul className="mt-1 list-inside list-disc text-[10px] text-amber-800/90 dark:text-amber-200/80 space-y-0.5">
              <li>
                Lotes: convierte, por ejemplo, <code className="text-[10px]">rows</code> en un arreglo de objetos <code className="text-[10px]">{'{ json: { … } }'}</code> o devuelve un arreglo; el
                flujo pasa un único <code className="text-[10px]">result</code> al siguiente nodo.
              </li>
            </ul>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
            <div>
              <label className="text-[10px] text-gray-500" htmlFor="code-node-label">
                Etiqueta
              </label>
              <input
                id="code-node-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="mt-0.5 w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-neutral-600 dark:bg-neutral-800"
              />
            </div>
            <div>
              <WorkflowCodeEditor value={code} onChange={setCode} />
            </div>
            <button
              type="button"
              onClick={onRunPreview}
              disabled={busy}
              className="w-full rounded-md bg-amber-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-amber-500 disabled:opacity-50"
            >
              {busy ? 'Ejecutando…' : 'Vista previa (servidor)'}
            </button>
          </div>
        </section>

        <section className="flex min-h-0 flex-col">
          <div className="border-b border-gray-100 bg-gray-50 dark:border-neutral-800 dark:bg-neutral-900/80 px-3 py-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Salida</h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Última ejecución del flujo o vista previa (botón en Código)</p>
          </div>
          <div className="min-h-0 flex-1 flex flex-col overflow-hidden p-2 text-xs">
            {okPreview === null && fromLastRunOut?.kind === 'ok' && !previewError && (
              <p className="mb-1.5 shrink-0 rounded border border-emerald-200 bg-emerald-50/80 px-2 py-1 text-[10px] text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                Salida de la <strong>última ejecución</strong> (valor de <code className="text-[10px]">return</code> en el
                servidor). &quot;Vista previa&quot; la sustituye mientras tengas el panel abierto.
              </p>
            )}
            {previewError && (
              <p className="shrink-0 text-red-700 dark:text-red-300 whitespace-pre-wrap text-[11px] overflow-y-auto max-h-40">
                {previewError}
                {previewErrorLogs.length > 0 ? `\n${previewErrorLogs.join('\n')}` : ''}
              </p>
            )}
            {okPreview === null && fromLastRunOut?.kind === 'error' && !previewError && (
              <pre className="mb-1 max-h-48 shrink-0 overflow-y-auto rounded border border-red-200 bg-red-50/80 p-2 font-mono text-[10px] text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
                {fromLastRunOut.error}
                {fromLastRunOut.logs.length > 0 ? `\n--- consola ---\n${fromLastRunOut.logs.join('\n')}` : ''}
              </pre>
            )}
            {okPreview !== null && !previewError && (
              <div className="min-h-0 flex-1 flex flex-col overflow-hidden">
                <WorkflowJsonResultViewer data={{ result: okPreview.value, consoleLogs: okPreview.logs }} />
              </div>
            )}
            {okPreview === null && fromLastRunOut?.kind === 'ok' && !previewError && (
              <div className="min-h-0 flex-1 flex flex-col overflow-hidden">
                <WorkflowJsonResultViewer data={{ result: fromLastRunOut.value, consoleLogs: fromLastRunOut.logs }} />
              </div>
            )}
            {okPreview === null && !previewError && fromLastRunOut === null && (
              <p className="text-gray-500">Ejecuta &quot;Probar flujo&quot; o &quot;Vista previa (servidor)&quot; para ver un resultado.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
