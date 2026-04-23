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
import { WorkflowRunInspector } from '@/components/workflows/WorkflowRunInspector';
import type { WorkflowRunStep } from '@/components/workflows/workflow-run-types';
import { parseLogSummarySteps } from '@/components/workflows/workflow-run-types';
import SettingsSidebar from '@/components/settings/SettingsSidebar';
import { isOperatorRole, normalizeOperatorPermissions } from '@/lib/operator-permissions';

function ViewRunHistoryModal({
  viewRun,
  onClose,
}: {
  viewRun: WorkflowRunRow;
  onClose: () => void;
}) {
  const steps = parseLogSummarySteps(viewRun.logSummary);
  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 dark:bg-black/60"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 shadow-xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">Detalle de ejecución</h3>
          <button
            type="button"
            className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
          {viewRun.startedAt
            ? new Date(viewRun.startedAt).toLocaleString('es', { dateStyle: 'full', timeStyle: 'long' })
            : ''}{' '}
          · {viewRun.status}
        </p>
        {viewRun.error && (
          <p className="mb-2 text-sm text-red-700 dark:text-red-300">Error: {viewRun.error}</p>
        )}
        {steps && steps.length > 0 ? (
          <div className="mb-3">
            <WorkflowRunInspector
              steps={steps}
              status={viewRun.status}
              runError={viewRun.error}
              focusedNodeId={null}
              onFocusNode={() => {}}
              title="Entrada y salida por nodo (registro en servidor)"
            />
          </div>
        ) : null}
        <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">JSON completo (depuración):</p>
        <pre className="max-h-[32vh] overflow-auto rounded bg-gray-100 p-2 text-[11px] dark:bg-neutral-800">
          {JSON.stringify(viewRun.logSummary, null, 2)}
        </pre>
      </div>
    </div>
  );
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
  const [runLog, setRunLog] = useState<string | null>(null);
  const [connectors, setConnectors] = useState<ConnectorRow[]>([]);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [runHistory, setRunHistory] = useState<WorkflowRunRow[]>([]);
  const [runBusy, setRunBusy] = useState(false);
  const [viewRun, setViewRun] = useState<WorkflowRunRow | null>(null);
  const canvasRef = useRef<WorkflowCanvasHandle | null>(null);
  /** Última ejecución desde el editor (para resaltado + inspector) */
  const [lastClientRun, setLastClientRun] = useState<{
    runId: string;
    status: string;
    error?: string;
    steps: WorkflowRunStep[];
  } | null>(null);
  const [runAnimHighlight, setRunAnimHighlight] = useState<string | null>(null);
  const [userRunFocus, setUserRunFocus] = useState<string | null>(null);

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
    setRunLog(null);
    setRunBusy(true);
    setErr(null);
    try {
      const fromCanvas =
        typeof canvasRef.current?.getDefinition === 'function' ? canvasRef.current.getDefinition() : null;
      const def = (fromCanvas || wf.definition) as Record<string, unknown> | null;
      if (!def) {
        setRunLog('No hay definición de flujo para ejecutar');
        return;
      }
      const res = await runWorkflow(businessId, workflowId, { definition: def });
      setRunLog(JSON.stringify(res, null, 2));
      const steps = (res.steps || []) as WorkflowRunStep[];
      setLastClientRun({
        runId: res.runId,
        status: res.status,
        error: res.error,
        steps,
      });
      setUserRunFocus(null);
      const runs = await fetchWorkflowRuns(businessId, workflowId, 30);
      setRunHistory(runs);
    } catch (e: any) {
      setRunLog(e?.message || 'Error al ejecutar');
    } finally {
      setRunBusy(false);
    }
  }, [businessId, workflowId, wf]);

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
                  {runLog && (
                    <div className="mb-4 space-y-1">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Resultado de la última ejecución (cada run queda guardado en el historial abajo).
                      </p>
                      <pre className="p-3 rounded-md bg-gray-100 dark:bg-neutral-800 text-xs overflow-auto max-h-48">
                        {runLog}
                      </pre>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Conectores en esta sucursal: {connectors.filter((c) => c.isEnabled).length} activos. El nodo MSSQL usa
                    el <code>connectorId</code> en los datos del nodo (revisa JSON en seed de demo).
                  </p>

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
                  />

                  {lastClientRun && lastClientRun.steps.length > 0 && (
                    <p className="mb-3 flex flex-wrap items-center justify-end gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                      <span className="min-w-0 text-left sm:text-right">
                        La entrada y la salida de cada paso están en el nodo (sección plegable). Clic en un nodo
                        resalta ese paso; clic en el fondo del lienzo quita el foco.
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

                  <div className="mt-4">
                    <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Historial de ejecuciones</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      Cada intento (Play o &quot;Ejecutar&quot;) se guarda en el servidor; abre un registro para ver el detalle
                      (pasos, errores, resultados).
                    </p>
                    {runHistory.length === 0 ? (
                      <p className="text-sm text-gray-500">Aún no hay ejecuciones.</p>
                    ) : (
                      <ul className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {runHistory.map((r) => (
                          <li
                            key={r.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-800/50 px-2 py-1.5 text-sm"
                          >
                            <div className="min-w-0">
                              <span
                                className={
                                  r.status === 'success'
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : 'text-red-700 dark:text-red-300'
                                }
                              >
                                {r.status === 'success' ? 'OK' : 'Fallo'}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400 mx-1.5">·</span>
                              <span className="text-gray-700 dark:text-gray-200">
                                {r.startedAt
                                  ? new Date(r.startedAt).toLocaleString('es', {
                                      dateStyle: 'short',
                                      timeStyle: 'medium',
                                    })
                                  : '—'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setViewRun(r)}
                              className="shrink-0 text-xs text-sky-600 dark:text-sky-400 hover:underline"
                            >
                              Ver detalle
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </LocalLayout>
      {viewRun && (
        <ViewRunHistoryModal
          viewRun={viewRun}
          onClose={() => setViewRun(null)}
        />
      )}
    </>
  );
}
