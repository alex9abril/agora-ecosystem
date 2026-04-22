import Head from 'next/head';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useRef, useState } from 'react';
import LocalLayout from '@/components/layout/LocalLayout';
import ConnectorManageDialog from '@/components/settings/ConnectorManageDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { usePermission } from '@/lib/role-guards';
import {
  createWorkflow,
  defaultWorkflowDefinition,
  deleteConnector,
  deleteWorkflow,
  fetchConnectors,
  fetchConnectorTypes,
  fetchWorkflows,
  type ConnectorTypeRow,
  type ConnectorRow,
  type WorkflowRow,
  updateConnector,
  updateWorkflow,
} from '@/lib/integration-workflows';
import { isOperatorRole, normalizeOperatorPermissions } from '@/lib/operator-permissions';
import SettingsSidebar from '@/components/settings/SettingsSidebar';

type Tab = 'workflows' | 'connectors';

type ConnectorDialogState = null | { mode: 'create' } | { mode: 'edit'; row: ConnectorRow };

function formatShortDate(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

function IconMssql({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M4 6.5C4 5.12 7.58 4 12 4s8 1.12 8 2.5S16.42 7 12 7 4 7.88 4 6.5zM4 9v3c0 1.1 2.9 2 8 2s8-.9 8-2V9c-1.38 1.1-4.5 1.5-8 1.5-3.5 0-6.62-.4-8-1.5zM4 15v3c0 1.1 2.9 2 8 2s8-.9 8-2v-3c-1.38 1.1-4.5 1.5-8 1.5-3.5 0-6.62-.4-8-1.5z" />
    </svg>
  );
}

function IconHttpRest({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
      />
    </svg>
  );
}

function ActiveToggle({
  enabled,
  onToggle,
  disabled,
}: {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-sm text-gray-600 dark:text-gray-300 select-none tabular-nums w-[4.75rem] text-right">
        {enabled ? 'Activo' : 'Inactivo'}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={enabled ? 'Desactivar' : 'Activar'}
        disabled={disabled}
        onClick={onToggle}
        className={[
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2',
          'dark:focus:ring-gray-500 dark:focus:ring-offset-neutral-900',
          'disabled:cursor-not-allowed disabled:opacity-50',
          enabled ? 'bg-emerald-500 dark:bg-emerald-600' : 'bg-gray-300 dark:bg-neutral-600',
        ].join(' ')}
      >
        <span
          className={[
            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition',
            enabled ? 'translate-x-4' : 'translate-x-0.5',
          ].join(' ')}
        />
      </button>
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

export default function IntegrationsWorkflowsIndexPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedBusiness, isLoading, availableBusinesses } = useSelectedBusiness();
  const canManage = usePermission('canManageSettings');
  const [tab, setTab] = useState<Tab>('workflows');
  const [workflows, setWorkflows] = useState<WorkflowRow[]>([]);
  const [connectors, setConnectors] = useState<ConnectorRow[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [connectorTypes, setConnectorTypes] = useState<ConnectorTypeRow[]>([]);
  const [connectorDialog, setConnectorDialog] = useState<ConnectorDialogState>(null);
  const [connectorMenuId, setConnectorMenuId] = useState<string | null>(null);
  const [testOkById, setTestOkById] = useState<Record<string, true>>({});
  const menuRef = useRef<HTMLDivElement | null>(null);

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
        else {
          setIsSuperadmin(availableBusinesses.some((x) => x.role === 'superadmin'));
        }
      } catch {
        setIsSuperadmin(availableBusinesses.some((x) => x.role === 'superadmin'));
      }
    };
    if (user) run();
  }, [user, selectedBusiness?.business_id, availableBusinesses]);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoadErr(null);
    try {
      const [w, c, types] = await Promise.all([
        fetchWorkflows(businessId),
        fetchConnectors(businessId),
        fetchConnectorTypes(businessId),
      ]);
      setWorkflows(w);
      setConnectors(c);
      setConnectorTypes(types);
    } catch (e: any) {
      setLoadErr(e?.message || 'Error al cargar');
    }
  }, [businessId]);

  useEffect(() => {
    if (!isLoading && user && canManage && businessId && canSee) {
      load();
    }
  }, [isLoading, user, canManage, businessId, canSee, load]);

  useEffect(() => {
    if (tab !== 'connectors') {
      setConnectorDialog(null);
      setConnectorMenuId(null);
    }
  }, [tab]);

  useEffect(() => {
    if (!connectorMenuId) return;
    const down = (e: MouseEvent) => {
      const el = menuRef.current;
      if (el && !el.contains(e.target as Node)) setConnectorMenuId(null);
    };
    document.addEventListener('mousedown', down);
    return () => document.removeEventListener('mousedown', down);
  }, [connectorMenuId]);

  const onCreateWorkflow = async () => {
    if (!businessId) return;
    setSaving(true);
    try {
      const w = await createWorkflow(businessId, {
        name: 'Nuevo flujo',
        isEnabled: false,
        definition: defaultWorkflowDefinition(),
      });
      router.push(`/settings/integrations-workflows/${w.id}`);
    } catch (e: any) {
      setLoadErr(e?.message || 'No se pudo crear');
    } finally {
      setSaving(false);
    }
  };

  const toggleWorkflow = async (w: WorkflowRow) => {
    if (!businessId) return;
    setSaving(true);
    try {
      await updateWorkflow(businessId, w.id, { isEnabled: !w.isEnabled });
      await load();
    } catch (e: any) {
      setLoadErr(e?.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const removeWorkflow = async (id: string) => {
    if (!businessId || !window.confirm('¿Eliminar este flujo?')) return;
    setSaving(true);
    try {
      await deleteWorkflow(businessId, id);
      await load();
    } catch (e: any) {
      setLoadErr(e?.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const toggleConnector = async (c: ConnectorRow) => {
    if (!businessId) return;
    setSaving(true);
    try {
      await updateConnector(businessId, c.id, { isEnabled: !c.isEnabled });
      await load();
    } catch (e: any) {
      setLoadErr(e?.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const removeConnector = async (id: string) => {
    if (!businessId || !window.confirm('¿Eliminar este conector?')) return;
    setSaving(true);
    try {
      await deleteConnector(businessId, id);
      await load();
    } catch (e: any) {
      setLoadErr(e?.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const getConnectorTypeLabel = (id: string) =>
    connectorTypes.find((t) => t.id === id)?.label ?? id;

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

  if (!selectedBusiness && !availableBusinesses.some((b) => b.role === 'superadmin')) {
    return (
      <LocalLayout>
        <div className="p-6 max-w-lg">
          <p className="text-sm text-gray-600 dark:text-gray-300">Selecciona una sucursal en la barra superior.</p>
        </div>
      </LocalLayout>
    );
  }

  if (selectedBusiness && !canSee) {
    return (
      <LocalLayout>
        <div className="p-6 max-w-lg">
          <p className="text-sm text-gray-600 dark:text-gray-300">No tienes permiso para automatización en esta sucursal.</p>
        </div>
      </LocalLayout>
    );
  }

  if (!businessId) {
    return (
      <LocalLayout>
        <div className="p-6 max-w-lg">
          <p className="text-sm text-gray-600 dark:text-gray-300">Selecciona una sucursal en la barra superior.</p>
        </div>
      </LocalLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Automatización - AGORA Local</title>
      </Head>
      <LocalLayout>
        <div className="w-full min-w-0 p-6">
          <div className="mb-6">
            <h1 className="text-xl font-normal text-gray-900 dark:text-gray-100 mb-2">Configuración</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Gestiona la configuración de tu tienda y personal</p>
          </div>
          <div className="flex gap-6">
            <SettingsSidebar currentPath={router.pathname} />
            <div className="flex-1 min-w-0 w-full">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Automatización</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Flujos y conectores de esta sucursal. Sin webhooks externos; ejecución manual o programación interna
              (futura).
            </p>

            {loadErr && (
              <div className="mt-4 p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-sm text-red-800 dark:text-red-200">
                {loadErr}
              </div>
            )}

            <div className="mt-6 flex gap-2 border-b border-gray-200 dark:border-neutral-700">
              {(['workflows', 'connectors'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`px-3 py-2 text-sm border-b-2 -mb-px ${
                    tab === t
                      ? 'border-black dark:border-white text-gray-900 dark:text-white'
                      : 'border-transparent text-gray-500'
                  }`}
                >
                  {t === 'workflows' ? 'Flujos' : 'Conectores'}
                </button>
              ))}
            </div>

            {tab === 'workflows' && (
              <div className="mt-6">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">Flujos</h2>
                  <button
                    type="button"
                    onClick={onCreateWorkflow}
                    disabled={saving}
                    className="px-4 py-2 rounded-md bg-black text-white text-sm hover:bg-gray-800 disabled:opacity-50"
                  >
                    Nuevo flujo
                  </button>
                </div>
                <ul className="divide-y divide-gray-200 dark:divide-neutral-700 rounded-lg border border-gray-200 dark:border-neutral-700">
                  {workflows.length === 0 && (
                    <li className="p-4 text-sm text-gray-500">No hay flujos. Crea uno o ejecuta el seed de demo en BD.</li>
                  )}
                  {workflows.map((w) => (
                    <li key={w.id} className="p-4 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{w.name}</div>
                        <div className="text-xs text-gray-500">v{w.version}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ActiveToggle
                          enabled={w.isEnabled}
                          onToggle={() => toggleWorkflow(w)}
                          disabled={saving}
                        />
                        <button
                          type="button"
                          onClick={() => router.push(`/settings/integrations-workflows/${w.id}`)}
                          className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-neutral-600"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => removeWorkflow(w.id)}
                          className="px-3 py-1.5 text-sm text-red-600"
                        >
                          Eliminar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {tab === 'connectors' && (
                <div className="mt-6">
                  <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">Conectores</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-2xl">
                    Orígenes de datos para flujos (SQL, APIs, etc.). La contraseña se cifra en el servidor; no se expone
                    por API. Haz clic en una fila o en «Gestionar» para editar o probar la conexión.
                  </p>

                  <ul className="mt-4 space-y-3">
                    {connectors.length === 0 && (
                      <li className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-6 text-sm text-gray-500 dark:border-neutral-700 dark:bg-neutral-800/30 dark:text-gray-400">
                        Aún no hay conectores. Usa &quot;Nuevo conector&quot; para añadir uno.
                      </li>
                    )}
                    {connectors.map((c) => {
                      const typeId = c.connectorTypeId;
                      const isMssql = typeId === 'mssql';
                      const typeLabel = getConnectorTypeLabel(typeId);
                      const showVerified = isMssql && c.hasPassword && testOkById[c.id];
                      return (
                        <li
                          key={c.id}
                          className="group relative flex flex-wrap items-stretch justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300 hover:shadow dark:border-neutral-700 dark:bg-neutral-900/40 dark:hover:border-neutral-600"
                        >
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => setConnectorDialog({ mode: 'edit', row: c })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setConnectorDialog({ mode: 'edit', row: c });
                              }
                            }}
                            className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 text-left"
                          >
                            <span
                              className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-100 bg-gray-50 text-gray-700 dark:border-neutral-600 dark:bg-neutral-800 dark:text-gray-200"
                              title={typeLabel}
                            >
                              {isMssql ? (
                                <IconMssql className="h-5 w-5" />
                              ) : (
                                <IconHttpRest className="h-5 w-5" />
                              )}
                            </span>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-gray-900 dark:text-gray-100">{c.name}</span>
                                {!c.hasPassword && isMssql && (
                                  <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-100">
                                    Falta credencial
                                  </span>
                                )}
                                {showVerified && (
                                  <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-100">
                                    Conexión comprobada
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-600 dark:border-neutral-600 dark:bg-neutral-800 dark:text-gray-300">
                                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  Esta sucursal
                                </span>
                              </div>
                              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                {typeLabel}
                                {isMssql && (
                                  <>
                                    {' '}
                                    · Última actualización {formatShortDate(c.updatedAt)} · Creado{' '}
                                    {formatShortDate(c.createdAt)}
                                  </>
                                )}
                              </p>
                              {isMssql && (
                                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-500">
                                  Servidor: {(c.config?.server as string) || '—'}
                                  {c.hasPassword ? ' · Credencial almacenada' : ' · Sin credencial'}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <ActiveToggle
                              enabled={c.isEnabled}
                              onToggle={() => toggleConnector(c)}
                              disabled={saving}
                            />
                            <div
                              className="relative"
                              ref={connectorMenuId === c.id ? menuRef : undefined}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setConnectorMenuId((x) => (x === c.id ? null : c.id))
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-neutral-600 dark:hover:bg-neutral-800"
                                aria-label="Más acciones"
                              >
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                                </svg>
                              </button>
                              {connectorMenuId === c.id && (
                                <div className="absolute right-0 z-20 mt-1 min-w-[10rem] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg dark:border-neutral-600 dark:bg-neutral-900">
                                  <button
                                    type="button"
                                    className="block w-full px-3 py-2 text-left text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-neutral-800"
                                    onClick={() => {
                                      setConnectorMenuId(null);
                                      setConnectorDialog({ mode: 'edit', row: c });
                                    }}
                                  >
                                    Gestionar
                                  </button>
                                  <button
                                    type="button"
                                    className="block w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    onClick={() => {
                                      setConnectorMenuId(null);
                                      removeConnector(c.id);
                                    }}
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setConnectorDialog({ mode: 'create' })}
                      disabled={saving}
                      className="px-4 py-2 rounded-md bg-black text-white text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 dark:hover:text-black disabled:opacity-50"
                    >
                      Nuevo conector
                    </button>
                  </div>
                </div>
            )}
            </div>
          </div>
        </div>
        {businessId && (
          <ConnectorManageDialog
            open={!!connectorDialog}
            onClose={() => setConnectorDialog(null)}
            businessId={businessId}
            mode={connectorDialog?.mode === 'edit' ? 'edit' : 'create'}
            connector={connectorDialog?.mode === 'edit' ? connectorDialog.row : null}
            connectorTypes={connectorTypes}
            onSaved={() => {
              setConnectorDialog(null);
              load();
            }}
            onDeleted={() => {
              setConnectorDialog(null);
              load();
            }}
            onTestSuccess={(id) => setTestOkById((m) => ({ ...m, [id]: true }))}
          />
        )}
      </LocalLayout>
    </>
  );
}
