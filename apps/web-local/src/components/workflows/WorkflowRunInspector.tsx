import { useState } from 'react';
import type { WorkflowRunStep } from './workflow-run-types';
import { buildStepInput } from './workflow-run-types';

function JsonBlock({ label, value, emptyHint }: { label: string; value: unknown; emptyHint?: string }) {
  const text = (() => {
    if (value === null || value === undefined) {
      if (value === null) return 'null';
      return emptyHint ?? '(sin valor)';
    }
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  })();
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
      <pre className="max-h-52 overflow-auto rounded border border-gray-200 dark:border-neutral-600 bg-gray-50 p-2 font-mono text-[10px] text-gray-800 dark:bg-neutral-900/80 dark:text-gray-200">
        {text}
      </pre>
    </div>
  );
}

type Props = {
  steps: WorkflowRunStep[];
  status?: string;
  runError?: string | null;
  /** Nodo a resaltar en el lienzo (sincronizado con la fila activa) */
  focusedNodeId: string | null;
  onFocusNode: (nodeId: string) => void;
  onClearFocus?: () => void;
  title?: string;
};

const typeLabel: Record<string, string> = {
  triggerManual: 'Inicio (manual)',
  triggerSchedule: 'Inicio (programado)',
  connectorMssql: 'Origen MSSQL',
  code: 'Code',
  sinkLog: 'Salida interna',
  httpRequest: 'HTTP',
  httpPlaceholder: 'HTTP (legacy)',
};

function labelForType(t: string) {
  return typeLabel[t] || t;
}

export function WorkflowRunInspector({
  steps,
  status,
  runError,
  focusedNodeId,
  onFocusNode,
  onClearFocus,
  title = 'Datos de la ejecución (paso a paso)',
}: Props) {
  const [openIdx, setOpenIdx] = useState(0);
  if (!steps.length) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">No hay pasos en esta ejecución.</p>
    );
  }
  return (
    <div className="space-y-2" data-workflow-run-inspector>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</h3>
        {onClearFocus && (
          <button
            type="button"
            onClick={onClearFocus}
            className="text-[10px] text-sky-600 dark:text-sky-400 hover:underline"
          >
            Quitar foco en el lienzo
          </button>
        )}
        <div className="w-full text-[11px] text-gray-500 dark:text-gray-400">
          Estado: <span className="font-medium text-gray-800 dark:text-gray-200">{status || '—'}</span>
          {runError ? (
            <span className="ml-2 text-red-600 dark:text-red-300">· {runError}</span>
          ) : null}
        </div>
      </div>
      <p className="text-[10px] text-gray-500 dark:text-gray-500">
        Pulsa un paso para resaltarlo en el grafo. Entrada = salida del nodo anterior (como n8n).
      </p>
      <ol className="space-y-2">
        {steps.map((step, i) => {
          const input = buildStepInput(steps, i);
          const isOpen = openIdx === i;
          const isFocused = focusedNodeId === step.nodeId;
          return (
            <li key={`${step.nodeId}-${i}`} className="rounded-lg border border-gray-200 dark:border-neutral-600 overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setOpenIdx(i);
                  onFocusNode(step.nodeId);
                }}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition ${
                  isFocused
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200/80 dark:border-emerald-800'
                    : 'bg-white dark:bg-neutral-800/50 hover:bg-gray-50 dark:hover:bg-neutral-800'
                }`}
              >
                <span className="min-w-0">
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">Paso {i + 1}</span>{' '}
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {labelForType(step.type)}
                  </span>
                  <span className="block truncate font-mono text-[10px] text-gray-500" title={step.nodeId}>
                    {step.nodeId}
                  </span>
                </span>
                <span
                  className={
                    step.error
                      ? 'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200'
                      : 'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                  }
                >
                  {step.error ? 'Error' : 'Listo'}
                </span>
              </button>
              {isOpen && (
                <div className="space-y-3 border-t border-gray-100 dark:border-neutral-700 bg-gray-50/80 dark:bg-neutral-900/30 p-3">
                  <JsonBlock label="Entrada (desde el paso anterior)" value={input} emptyHint="(primer nodo: no hay entrada)" />
                  {step.error ? (
                    <div className="space-y-1">
                      <div className="text-[10px] font-semibold uppercase text-red-600 dark:text-red-400">Error</div>
                      <pre className="max-h-40 overflow-auto rounded border border-red-200 dark:border-red-800 bg-red-50/50 p-2 text-[10px] text-red-800 dark:bg-red-200/20">
                        {step.error}
                      </pre>
                    </div>
                  ) : null}
                  {!step.error ? (
                    <JsonBlock
                      label="Salida (result)"
                      value={step.result}
                      emptyHint="(sin resultado o undefined serializado como null en JSON)"
                    />
                  ) : null}
                  {step.logs && step.logs.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-semibold uppercase text-gray-500">Consola / logs</div>
                      <ul className="list-inside list-disc text-[10px] text-gray-600 dark:text-gray-300">
                        {step.logs.map((l, j) => (
                          <li key={j} className="font-mono">
                            {l}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
