import Head from 'next/head';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LocalLayout from '@/components/layout/LocalLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { usePermission } from '@/lib/role-guards';
import {
  fetchConnectors,
  fetchWorkflow,
  fetchWorkflowRuns,
  runWorkflow,
  updateWorkflow,
  type WorkflowRunRow,
  type WorkflowRow,
  type ConnectorRow,
} from '@/lib/integration-workflows';
import { WorkflowCanvas, type WorkflowCanvasHandle } from '@/components/workflows/WorkflowCanvas';
import type { WorkflowRunStep } from '@/components/workflows/workflow-run-types';
import { parseLogSummarySteps } from '@/components/workflows/workflow-run-types';
import SettingsSidebar from '@/components/settings/SettingsSidebar';
import { isOperatorRole, normalizeOperatorPermissions } from '@/lib/operator-permissions';

function runDurationText(r: WorkflowRunRow) {
  if (!r.finishedAt || !r.startedAt) return '—';
  const ms = new Date(r.finishedAt).getTime() - new Date(r.startedAt).getTime();
  if (ms < 0) return '—';
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.floor(ms / 60_000)} min`;
}

function canAccessWorkflows(
  role: string,
  isSuperadmin: boolean,
  settings?: Record<string, boolean> | null,
) {
  if (isOperatorRole(role) && settings) {
    return settings['branches_integrations_workflows'] === true;
  }
  if (isSuperadmin) return true;
  return isOperatorRole(role) ? false : true;
}

function WorkflowRunHistoryAside({
  runHistory,
  lastClientRun,
  onPick,
}: {
  runHistory: WorkflowRunRow[];
  lastClientRun: { fromListId?: string } | null;
  onPick: (r: WorkflowRunRow) => void;
}) {
  return (
    <aside
      className="flex h-full min-h-0 w-[min(20rem,100%)] max-w-[22rem] shrink-0 flex-col border-r border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-900/50"
      aria-label="Historial de ejecuciones"
    >
      <div className="shrink-0 border-b border-gray-200 px-3 py-2.5 dark:border-neutral-600">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Ejecuciones</h2>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">{runHistory.length} en los últimos registros</p>
      </div>
      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2 pr-1">
        {runHistory.length === 0 ? (
          <li className="px-1 text-sm text-gray-500">Aún no hay ejecuciones.</li>
        ) : (
          runHistory.map((r) => {
            const active = lastClientRun?.fromListId === r.id;
            const ok = r.status === 'success';
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onPick(r)}
                  className={`w-full rounded-md border text-left text-xs transition ${
                    active
                      ? 'border-sky-400 bg-sky-50 dark:border-sky-600 dark:bg-sky-950/40'
                      : 'border-transparent bg-gray-50 hover:bg-gray-100 dark:bg-neutral-800/80 dark:hover:bg-neutral-800'
                  } ${ok ? 'border-l-4 border-l-emerald-500 pl-2' : 'border-l-4 border-l-red-500 pl-2'} p-2`}
                >
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {r.startedAt
                      ? new Date(r.startedAt).toLocaleString('es', {
                          dateStyle: 'short',
                          timeStyle: 'medium',
                        })
                      : '—'}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-[11px] text-gray-600 dark:text-gray-400">
                    <span className={ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                      {ok ? 'OK' : 'Error'}
                    </span>
                    <span>· {runDurationText(r)}</span>
                  </div>
                  {r.error && (
                    <p className="mt-1 line-clamp-2 text-[10px] text-red-600 dark:text-red-400">{r.error}</p>
                  )}
                </button>
              </li>
            );
          })
        )}
      </ul>
    </aside>
  );
}

export default function IntegrationsWorkflowEditorPage() {
  const router = useRouter();
  const { id } = router.query;
  const workflowId = typeof id === 'string' ? id : null;
  const { user } = useAuth();
  const { selectedBusiness, isLoading, availableBusinesses } = useSelectedBusiness();
  const canManage = usePermission('canManageSettings');
  const [wf, setWf] = useState<WorkflowRow | null>(null);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [connectors, setConnectors] = useState<ConnectorRow[]>([]);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [runHistory, setRunHistory] = useState<WorkflowRunRow[]>([]);
  const [runBusy, setRunBusy] = useState(false);
  const [viewMode, setViewMode] = useState<'editor' | 'executions'>('editor');
  const canvasRef = useRef<WorkflowCanvasHandle | null>(null);
  /** Ejecución mostrada en el grafo (Play o al elegir en pestaña Ejecuciones) */
  const [lastClientRun, setLastClientRun] = useState<{
    runId: string;
    status: string;
    error?: string;
    steps: WorkflowRunStep[];
    /** Si vino de la lista del historial, id del registro (resaltar fila) */
    fromListId?: string;
  } | null>(null);
  const [runAnimHighlight, setRunAnimHighlight] = useState<string | null>(null);
  const [userRunFocus, setUserRunFocus] = useState<string | null>(null);
  const [canvasMaximized, setCanvasMaximized] = useState(false);

  const businessId = selectedBusiness?.business_id;
  const role = selectedBusiness?.role ?? 'operations_staff';
  const operatorPerms = selectedBusiness?.permissions
    ? normalizeOperatorPermissions(selectedBusiness.permissions as Record<string, unknown>)
    : null;
  const canSee =
    canManage && businessId
      ? canAccessWorkflows(role, isSuperadmin, operatorPerms?.settings as Record<string, boolean> | null)
      : false;

  useEffect(() => {
    const run = async () => {
      if (!selectedBusiness?.business_id) return;
      const b = await import('@/lib/business');
      try {
        const res = await b.businessService.getMyBusiness(selectedBusiness.business_id);
        if (res?.user_role === 'superadmin') setIsSuperadmin(true);
        else setIsSuperadmin(availableBusinesses.some((x) => x.role === 'superadmin'));
      } catch {
        setIsSuperadmin(availableBusinesses.some((x) => x.role === 'superadmin'));
      }
    };
    if (user) run();
  }, [user, selectedBusiness?.business_id, availableBusinesses]);

  const load = useCallback(async () => {
    if (!businessId || !workflowId) return;
    setErr(null);
    try {
      const w = await fetchWorkflow(businessId, workflowId);
      setWf(w);
      setName(w.name);
      setDesc(w.description || '');
      const [c, runs] = await Promise.all([fetchConnectors(businessId), fetchWorkflowRuns(businessId, workflowId, 30)]);
      setConnectors(c);
      setRunHistory(runs);
    } catch (e: any) {
      setErr(e?.message || 'Error al cargar el flujo');
    }
  }, [businessId, workflowId]);

  useEffect(() => {
    if (!isLoading && user && canManage && businessId && workflowId && canSee) {
      load();
    }
  }, [isLoading, user, canManage, businessId, workflowId, canSee, load]);

  useEffect(() => {
    setLastClientRun(null);
    setUserRunFocus(null);
    setRunAnimHighlight(null);
    setCanvasMaximized(false);
  }, [workflowId]);

  const onSave = async () => {
    if (!businessId || !workflowId) return;
    setSaving(true);
    setErr(null);
    try {
      const fromCanvas =
        typeof canvasRef.current?.getDefinition === 'function' ? canvasRef.current.getDefinition() : null;
      const def = fromCanvas ?? wf?.definition;
      if (!def) {
        setErr('No hay definición de flujo');
        return;
      }
      await updateWorkflow(businessId, workflowId, {
        name: name || wf?.name,
        description: desc,
        definition: def,
      });
      await load();
    } catch (e: any) {
      setErr(e?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const runFromCurrentDefinition = useCallback(async () => {
    if (!businessId || !workflowId || !wf) return;
    setRunBusy(true);
    setErr(null);
    try {
      const fromCanvas =
        typeof canvasRef.current?.getDefinition === 'function' ? canvasRef.current.getDefinition() : null;
      const def = (fromCanvas || wf.definition) as Record<string, unknown> | null;
      if (!def) {
        setErr('No hay definición de flujo para ejecutar');
        return;
      }
      const res = await runWorkflow(businessId, workflowId, { definition: def });
      const steps = (res.steps || []) as WorkflowRunStep[];
      setLastClientRun({
        runId: res.runId,
        status: res.status,
        error: res.error,
        steps,
        fromListId: undefined,
      });
      setUserRunFocus(null);
      const runs = await fetchWorkflowRuns(businessId, workflowId, 30);
      setRunHistory(runs);
    } catch (e: any) {
      setErr(e?.message || 'Error al ejecutar el flujo');
    } finally {
      setRunBusy(false);
    }
  }, [businessId, workflowId, wf]);

  const applyRunFromHistory = useCallback((r: WorkflowRunRow) => {
    const steps = parseLogSummarySteps(r.logSummary);
    if (!steps || steps.length === 0) {
      setErr('No hay pasos en el registro de esta ejecución.');
      return;
    }
    setErr(null);
    setLastClientRun({
      runId: r.id,
      fromListId: r.id,
      status: r.status,
      error: r.error || undefined,
      steps,
    });
    setUserRunFocus(null);
  }, []);

  const onFlowViewModeChange = useCallback(
    (m: 'editor' | 'executions') => {
      setViewMode(m);
      if (m === 'executions' && businessId && workflowId) {
        void fetchWorkflowRuns(businessId, workflowId, 30)
          .then(setRunHistory)
          .catch(() => {});
      }
    },
    [businessId, workflowId],
  );

  useEffect(() => {
    if (!lastClientRun?.steps?.length) {
      setRunAnimHighlight(null);
      return;
    }
    setRunAnimHighlight(null);
    const steps = lastClientRun.steps;
    let i = 0;
    setRunAnimHighlight(steps[0].nodeId);
    const t = setInterval(() => {
      i += 1;
      if (i >= steps.length) {
        setRunAnimHighlight(null);
        clearInterval(t);
        return;
      }
      setRunAnimHighlight(steps[i].nodeId);
    }, 650);
    return () => {
      clearInterval(t);
      setRunAnimHighlight(null);
    };
  }, [lastClientRun?.runId]);

  const runExecutionForCanvas = useMemo(() => {
    if (!lastClientRun?.steps?.length) return null;
    return {
      steps: lastClientRun.steps,
      highlightNodeId: userRunFocus ?? runAnimHighlight,
    };
  }, [lastClientRun, userRunFocus, runAnimHighlight]);

  if (isLoading || !user) {
    return (
      <LocalLayout>
        <div className="p-6 text-sm text-gray-500">Cargando…</div>
      </LocalLayout>
    );
  }

  if (!canManage) {
    router.replace('/');
    return null;
  }

  if (selectedBusiness && !canSee) {
    return (
      <LocalLayout>
        <div className="p-6">Sin permiso.</div>
      </LocalLayout>
    );
  }

  if (!businessId || !workflowId) {
    return (
      <LocalLayout>
        <div className="p-6 text-sm">Selecciona una sucursal o flujo válido.</div>
      </LocalLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Editar flujo - AGORA Local</title>
      </Head>
      <LocalLayout>
        <div className="w-full min-w-0 p-6">
          <div className="mb-6">
            <h1 className="text-xl font-normal text-gray-900 dark:text-gray-100 mb-2">Configuración</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Gestiona la configuración de tu tienda y personal</p>
          </div>
          <div className="flex gap-6">
            <SettingsSidebar currentPath={router.pathname} />
            <div className="flex-1 min-w-0">
              {err && (
                <div className="mb-4 p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-sm text-red-800 dark:text-red-200">
                  {err}
                </div>
              )}

              {!wf ? (
                <div className="text-sm text-gray-500">Cargando flujo…</div>
              ) : (
                <>
                  {viewMode === 'editor' && (
                    <>
                      <div className="mb-4 flex flex-wrap items-end gap-2">
                        <div className="flex-1 min-w-[200px]">
                          <label className="text-xs text-gray-500">Nombre</label>
                          <input
                            className="w-full mt-0.5 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1.5 text-sm"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                          />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                          <label className="text-xs text-gray-500">Descripción</label>
                          <input
                            className="w-full mt-0.5 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1.5 text-sm"
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={onSave}
                            disabled={saving}
                            className="px-4 py-2 rounded-md bg-black text-white text-sm"
                          >
                            Guardar
                          </button>
                          <button
                            type="button"
                            onClick={runFromCurrentDefinition}
                            disabled={runBusy}
                            className="px-4 py-2 rounded-md border border-gray-300 dark:border-neutral-600 text-sm"
                            title="Ejecuta con el grafo actual (guardado o no en memoria). El flujo puede estar desactivado en el listado; sigue pudiendo probarse desde el editor."
                          >
                            {runBusy ? 'Ejecutando…' : 'Ejecutar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => router.push('/settings/integrations-workflows')}
                            className="px-4 py-2 text-sm text-gray-600"
                          >
                            Volver
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Conectores en esta sucursal: {connectors.filter((c) => c.isEnabled).length} activos. El nodo MSSQL
                        usa el <code>connectorId</code> en los datos del nodo (revisa JSON en seed de demo).
                      </p>
                    </>
                  )}

                  {viewMode === 'executions' && (
                    <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                      El flujo a la derecha es el definitivo. Al elegir un intento, se muestran I/O y resaltado en el grafo
                      igual que con &quot;Probar flujo&quot;. Usa <strong>Editor</strong> para editar o guardar.
                    </p>
                  )}

                  <div
                    className={
                      viewMode === 'executions'
                        ? 'flex h-[min(70vh,640px)] w-full min-h-0 overflow-hidden rounded-lg border border-gray-200 dark:border-neutral-700'
                        : 'w-full min-h-0'
                    }
                  >
                    {viewMode === 'executions' && !canvasMaximized && (
                      <WorkflowRunHistoryAside
                        runHistory={runHistory}
                        lastClientRun={lastClientRun}
                        onPick={applyRunFromHistory}
                      />
                    )}
                    <div className={viewMode === 'executions' ? 'min-h-0 min-w-0 flex-1' : 'w-full min-h-0'}>
                      <WorkflowCanvas
                        key={wf.id}
                        ref={canvasRef}
                        workflowId={wf.id}
                        businessId={businessId}
                        definition={wf.definition as Record<string, unknown>}
                        connectors={connectors}
                        onPlayRequest={runFromCurrentDefinition}
                        playRequestLoading={runBusy}
                        runExecution={runExecutionForCanvas}
                        onLastRunFocusNode={setUserRunFocus}
                        flowViewMode={viewMode}
                        onFlowViewModeChange={onFlowViewModeChange}
                        canvasMaximized={canvasMaximized}
                        onCanvasMaximizedChange={setCanvasMaximized}
                        executionsSidebar={
                          viewMode === 'executions' ? (
                            <WorkflowRunHistoryAside
                              runHistory={runHistory}
                              lastClientRun={lastClientRun}
                              onPick={applyRunFromHistory}
                            />
                          ) : null
                        }
                      />
                    </div>
                  </div>

                  {lastClientRun && lastClientRun.steps.length > 0 && (
                    <p className="mb-0 mt-3 flex flex-wrap items-center justify-end gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                      <span className="min-w-0 text-left sm:text-right">
                        Entrada y salida en cada nodo. Clic en un nodo resalta el paso; clic en el fondo quita el foco.
                        {viewMode === 'executions' && ' · I/O desde el registro de servidor al elegir en la lista.'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setLastClientRun(null);
                          setUserRunFocus(null);
                          setRunAnimHighlight(null);
                        }}
                        className="shrink-0 text-sky-600 dark:text-sky-400 hover:underline"
                      >
                        Quitar I/O y resaltado
                      </button>
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </LocalLayout>
    </>
  );
}
