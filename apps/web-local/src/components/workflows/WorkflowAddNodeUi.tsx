import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Panel, useReactFlow, type Node } from '@xyflow/react';
import type { ConnectorRow } from '@/lib/integration-workflows';

const DEFAULT_MSSQL_QUERY = 'SELECT 1 AS ok';

type Props = { connectors: ConnectorRow[]; readOnly: boolean };

function newNodeId() {
  return `n-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function WorkflowAddNodeUi({ connectors, readOnly }: Props) {
  const { getNodes, setNodes } = useReactFlow();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'menu' | 'connectors'>('menu');

  const placePosition = useCallback((): { x: number; y: number } => {
    const nodes = getNodes();
    if (nodes.length === 0) return { x: 40, y: 80 };
    const width = 240;
    let maxRight = 0;
    let y = 80;
    for (const n of nodes) {
      const r = n.position.x + width;
      if (r >= maxRight) {
        maxRight = r;
        y = n.position.y;
      }
    }
    return { x: maxRight + 48, y };
  }, [getNodes]);

  const pushNode = useCallback(
    (node: Node) => {
      setNodes((ns) => [...ns, { ...node, deletable: node.deletable !== false } as Node]);
      setOpen(false);
      setStep('menu');
    },
    [setNodes],
  );

  const onAddMssql = useCallback(
    (c: ConnectorRow) => {
      pushNode({
        id: newNodeId(),
        type: 'connectorMssql',
        position: placePosition(),
        data: {
          label: c.name,
          connectorId: c.id,
          query: DEFAULT_MSSQL_QUERY,
        },
      } as Node);
    },
    [placePosition, pushNode],
  );

  const onAddCode = useCallback(() => {
    pushNode({
      id: newNodeId(),
      type: 'code',
      position: placePosition(),
      data: {
        label: 'Code',
        code: `// Misma API que n8n: $input.first().json, $input.all()
return $input.first().json;
`,
        testInputJson: JSON.stringify({ message: 'ok' }, null, 2),
      },
    } as Node);
  }, [placePosition, pushNode]);

  const onAddHttp = useCallback(() => {
    pushNode({
      id: newNodeId(),
      type: 'httpRequest',
      position: placePosition(),
      data: { label: 'HTTP request' },
    } as Node);
  }, [placePosition, pushNode]);

  const onAddSinkAutomation = useCallback(() => {
    pushNode({
      id: newNodeId(),
      type: 'sinkAutomation',
      position: placePosition(),
      data: {
        label: 'Guardar en data bridge',
        tableName: 'workflow_ingested_rows',
        arrayPath: 'rows',
        fieldMappings: {
          product_code: '$row.product_code',
          quantity: '$row.quantity',
        },
      },
    } as Node);
  }, [placePosition, pushNode]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setStep('menu');
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open]);

  if (readOnly) return null;

  const mssqlConnectors = connectors.filter((c) => c.connectorTypeId === 'mssql' && c.isEnabled);

  return (
    <>
      <Panel position="top-right" className="m-0 !mt-2 !mr-2">
        <button
          type="button"
          onClick={() => {
            setOpen((o) => !o);
            setStep('menu');
          }}
          className="flex items-center gap-1.5 rounded-md border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm font-medium text-gray-800 dark:text-gray-100 shadow-sm hover:bg-gray-50 dark:hover:bg-neutral-700/80"
          title="Agregar nodo al flujo"
        >
          <span className="text-lg leading-none">+</span>
          <span>Agregar</span>
        </button>
      </Panel>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
        <>
          <div
            className="fixed inset-0 z-[300] bg-black/25 dark:bg-black/50"
            aria-hidden
            onClick={() => {
              setOpen(false);
              setStep('menu');
            }}
          />
          <div
            className="fixed right-0 top-0 z-[310] flex h-full w-[min(100vw,22rem)] flex-col border-l border-gray-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900"
            role="dialog"
            aria-label="Agregar nodo"
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2.5 dark:border-neutral-800">
              {step === 'connectors' ? (
                <button
                  type="button"
                  className="text-sm text-sky-600 dark:text-sky-400"
                  onClick={() => setStep('menu')}
                >
                  ← Atrás
                </button>
              ) : (
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Agregar nodo</span>
              )}
              <button
                type="button"
                className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                onClick={() => {
                  setOpen(false);
                  setStep('menu');
                }}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {step === 'menu' && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Elige un tipo de nodo</p>
                  <button
                    type="button"
                    onClick={() => setStep('connectors')}
                    className="flex w-full items-start gap-3 rounded-lg border border-sky-200 bg-sky-50/80 p-3 text-left transition hover:border-sky-300 hover:bg-sky-50 dark:border-sky-800 dark:bg-sky-950/40 dark:hover:bg-sky-900/30"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-sky-200/80 text-sky-800 dark:bg-sky-500/30 dark:text-sky-100">
                      <DatabaseGlyph />
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">Origen de datos</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">Conector (MSSQL) y consulta</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={onAddCode}
                    className="flex w-full items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-left transition hover:border-amber-300 dark:border-amber-800 dark:bg-amber-950/40 dark:hover:bg-amber-900/30"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-200/80 text-amber-900 dark:bg-amber-500/30 dark:text-amber-100">
                      <CodeGlyph />
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">Code</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">Ejecución de código (configuración próximamente)</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={onAddHttp}
                    className="flex w-full items-start gap-3 rounded-lg border border-violet-200 bg-violet-50/80 p-3 text-left transition hover:border-violet-300 dark:border-violet-800 dark:bg-violet-950/40 dark:hover:bg-violet-900/30"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-violet-200/80 text-violet-800 dark:bg-violet-500/30 dark:text-violet-100">
                      <HttpGlyph />
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">HTTP request</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">Llamada HTTP (configuración próximamente)</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={onAddSinkAutomation}
                    className="flex w-full items-start gap-3 rounded-lg border border-cyan-200 bg-cyan-50/80 p-3 text-left transition hover:border-cyan-300 hover:bg-cyan-50 dark:border-cyan-800 dark:bg-cyan-950/40 dark:hover:bg-cyan-900/30"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-cyan-200/80 text-cyan-900 dark:bg-cyan-500/30 dark:text-cyan-100">
                      <AutomationGlyph />
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">Guardar en data bridge</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        INSERT en tablas permitidas del esquema data_bridge (filas del paso anterior)
                      </span>
                    </span>
                  </button>
                </div>
              )}
              {step === 'connectors' && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Conectores MSSQL activos en esta sucursal</p>
                  {mssqlConnectors.length === 0 ? (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      No hay conectores MSSQL activos. Crea uno en la configuración de conectores.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {mssqlConnectors.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => onAddMssql(c)}
                            className="w-full rounded-md border border-gray-200 bg-gray-50/80 px-3 py-2 text-left text-sm text-gray-900 hover:border-sky-300 hover:bg-sky-50/50 dark:border-neutral-600 dark:bg-neutral-800/80 dark:text-gray-100 dark:hover:border-sky-600"
                          >
                            {c.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </>,
        document.body,
      )}
    </>
  );
}

function DatabaseGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v6c0 1.7 4 3 9 3s9-1.3 9-3V5" />
      <path d="M3 11v6c0 1.7 4 3 9 3s9-1.3 9-3v-6" />
    </svg>
  );
}

function CodeGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 4L3 9l5 5" />
      <path d="M16 4l5 5-5 5" />
      <path d="M10 20h4" />
    </svg>
  );
}

function HttpGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15 15 0 0 1 0 20" />
    </svg>
  );
}

function AutomationGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="8" ry="2.5" />
      <path d="M4 5v4c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5V5" />
      <path d="M4 9v3c0 1.4 3.6 2.5 8 2.5" />
      <path d="M17 16l3 3M20 16l-3 3" />
    </svg>
  );
}
