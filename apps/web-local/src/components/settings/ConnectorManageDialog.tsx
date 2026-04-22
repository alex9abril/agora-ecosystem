import { useCallback, useEffect, useState } from 'react';
import {
  createConnector,
  deleteConnector,
  testMssqlConnectionForConnector,
  testMssqlConnectionNew,
  type ConnectorTypeRow,
  type ConnectorRow,
  updateConnector,
} from '@/lib/integration-workflows';

function IconMssql({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4 6.5C4 5.12 7.58 4 12 4s8 1.12 8 2.5S16.42 7 12 7 4 7.88 4 6.5zM4 9v3c0 1.1 2.9 2 8 2s8-.9 8-2V9c-1.38 1.1-4.5 1.5-8 1.5-3.5 0-6.62-.4-8-1.5zM4 15v3c0 1.1 2.9 2 8 2s8-.9 8-2v-3c-1.38 1.1-4.5 1.5-8 1.5-3.5 0-6.62-.4-8-1.5z" />
    </svg>
  );
}

function IconHttpRest({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
      />
    </svg>
  );
}

function formatDt(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

type PanelTab = 'connection' | 'sharing' | 'details';

type CreateStep = 'selectType' | 'mssql' | 'http';

export type ConnectorManageDialogProps = {
  open: boolean;
  onClose: () => void;
  businessId: string;
  mode: 'create' | 'edit';
  /** En edición, el conector (lista ya lo tiene). */
  connector: ConnectorRow | null;
  connectorTypes: ConnectorTypeRow[];
  onSaved: () => void;
  onDeleted: () => void;
  /** Tras probar conexión con éxito (sólo aplica a edición con id). */
  onTestSuccess?: (connectorId: string) => void;
};

const inputClass =
  'mt-0.5 w-full rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100';

export default function ConnectorManageDialog({
  open,
  onClose,
  businessId,
  mode,
  connector,
  connectorTypes,
  onSaved,
  onDeleted,
  onTestSuccess,
}: ConnectorManageDialogProps) {
  const mssqlType = connectorTypes.find((t) => t.id === 'mssql');
  const httpType = connectorTypes.find((t) => t.id === 'http_rest');
  const mssqlActive = mssqlType?.implementationStatus === 'active';
  const httpActive = httpType?.implementationStatus === 'active';

  const [createStep, setCreateStep] = useState<CreateStep>('selectType');
  const [panel, setPanel] = useState<PanelTab>('connection');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [testMsg, setTestMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const [name, setName] = useState('');
  const [server, setServer] = useState('');
  const [port, setPort] = useState(1433);
  const [database, setDatabase] = useState('');
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');

  const resetMssqlForm = useCallback((c: ConnectorRow | null) => {
    if (c) {
      setName(c.name);
      setServer((c.config?.server as string) || '');
      setPort(typeof c.config?.port === 'number' ? (c.config.port as number) : 1433);
      setDatabase((c.config?.database as string) || '');
      setUser((c.config?.user as string) || '');
      setPassword('');
    } else {
      setName('');
      setServer('');
      setPort(1433);
      setDatabase('');
      setUser('');
      setPassword('');
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setTestMsg(null);
    setPanel('connection');
    if (mode === 'edit' && connector) {
      setCreateStep('mssql');
      resetMssqlForm(connector);
    } else {
      setCreateStep('selectType');
      resetMssqlForm(null);
    }
  }, [open, mode, connector, resetMssqlForm]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  const handleTest = async () => {
    if (!businessId) return;
    setErr(null);
    setTesting(true);
    setTestMsg(null);
    try {
      if (mode === 'create') {
        if (!password) {
          setTestMsg({ kind: 'err', text: 'Indica la contraseña para probar la conexión.' });
          return;
        }
        const r = await testMssqlConnectionNew(businessId, {
          server,
          port,
          database,
          user,
          password,
          options: { encrypt: true, trustServerCertificate: false },
        });
        if (r.success) {
          setTestMsg({ kind: 'ok', text: 'Conexión correcta.' });
        } else {
          setTestMsg({ kind: 'err', text: (r as { success: false; message: string }).message || 'No se pudo conectar.' });
        }
        return;
      }
      if (!connector) return;
      const r = await testMssqlConnectionForConnector(businessId, connector.id, {
        server: server || undefined,
        port,
        database: database || undefined,
        user: user || undefined,
        password: password || undefined,
        options: { encrypt: true, trustServerCertificate: false },
      });
      if (r.success) {
        setTestMsg({ kind: 'ok', text: 'Conexión correcta con estas credenciales.' });
        onTestSuccess?.(connector.id);
      } else {
        setTestMsg({ kind: 'err', text: (r as { success: false; message: string }).message || 'No se pudo conectar.' });
      }
    } catch (e: unknown) {
      setTestMsg({ kind: 'err', text: (e as Error)?.message || 'Error al probar' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!businessId) return;
    setErr(null);
    setSaving(true);
    try {
      if (mode === 'create' && createStep === 'mssql') {
        if (!mssqlType || !mssqlActive) {
          setErr('MSSQL no está disponible');
          return;
        }
        await createConnector(businessId, {
          name: name || 'MSSQL',
          connectorTypeId: 'mssql',
          isEnabled: true,
          config: {
            server,
            port,
            database,
            user,
            options: { encrypt: true, trustServerCertificate: false },
          },
          password: password || undefined,
        });
        onSaved();
        onClose();
        return;
      }
      if (mode === 'edit' && connector) {
        const body: Parameters<typeof updateConnector>[2] = {
          name: name || connector.name,
          config: {
            server,
            port,
            database,
            user,
            options: { encrypt: true, trustServerCertificate: false },
          },
        };
        if (password) {
          body.password = password;
        }
        await updateConnector(businessId, connector.id, body);
        onSaved();
        onClose();
      }
    } catch (e: unknown) {
      setErr((e as Error)?.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!connector || !businessId) return;
    if (!window.confirm('¿Eliminar este conector? No se podrá deshacer.')) return;
    (async () => {
      setSaving(true);
      setErr(null);
      try {
        await deleteConnector(businessId, connector.id);
        onDeleted();
        onClose();
      } catch (e: unknown) {
        setErr((e as Error)?.message || 'No se pudo eliminar');
      } finally {
        setSaving(false);
      }
    })();
  };

  if (!open) return null;

  const typeLabel = mssqlType?.label ?? 'Microsoft SQL Server';
  const showMssqlForm = mode === 'edit' || (mode === 'create' && createStep === 'mssql');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/60"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex w-full max-w-2xl max-h-[90vh] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-labelledby="connector-dialog-title"
      >
        {showMssqlForm ? (
          <>
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-neutral-700">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-200">
                  <IconMssql className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 id="connector-dialog-title" className="truncate text-base font-medium text-gray-900 dark:text-gray-100">
                    {name || (mode === 'create' ? 'Nuevo conector MSSQL' : connector?.name || 'Conector')}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{typeLabel}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {mode === 'edit' && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={saving}
                    className="rounded p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Eliminar conector"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-800"
                  aria-label="Cerrar"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
              <nav className="shrink-0 border-b border-gray-200 bg-gray-50 px-2 py-2 dark:border-neutral-700 dark:bg-neutral-800/50 sm:w-40 sm:border-b-0 sm:border-r sm:py-3">
                {(['connection', 'sharing', 'details'] as const).map((id) => {
                  const label =
                    id === 'connection' ? 'Conexión' : id === 'sharing' ? 'Compartir' : 'Detalles';
                  const disabled = id === 'sharing';
                  return (
                    <button
                      key={id}
                      type="button"
                      disabled={disabled}
                      onClick={() => !disabled && setPanel(id)}
                      className={[
                        'w-full rounded-md px-2 py-2 text-left text-sm',
                        panel === id
                          ? 'bg-white font-medium text-gray-900 shadow-sm dark:bg-neutral-800 dark:text-white'
                          : 'text-gray-500 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:text-gray-200',
                      ].join(' ')}
                    >
                      {label}
                      {id === 'sharing' && <span className="block text-xs font-normal">Próximamente</span>}
                    </button>
                  );
                })}
              </nav>

              <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4">
                {panel === 'connection' && (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      ¿Dudas con estos campos? Revisa la documentación de integración o contacta a soporte.
                    </p>
                    {testMsg && (
                      <div
                        className={[
                          'flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm',
                          testMsg.kind === 'ok'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-100'
                            : 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-900/20 dark:text-red-100',
                        ].join(' ')}
                        role="status"
                      >
                        <span>{testMsg.text}</span>
                        {testMsg.kind === 'err' && (
                          <button
                            type="button"
                            onClick={handleTest}
                            disabled={testing}
                            className="shrink-0 rounded border border-red-300 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-100 dark:border-red-600 dark:hover:bg-red-900/30"
                          >
                            Reintentar
                          </button>
                        )}
                      </div>
                    )}
                    {err && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
                        {err}
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-gray-500">Nombre</label>
                      <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Servidor / host</label>
                      <input className={inputClass} value={server} onChange={(e) => setServer(e.target.value)} required />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-500">Puerto</label>
                        <input
                          type="number"
                          className={inputClass}
                          value={port}
                          onChange={(e) => setPort(parseInt(e.target.value, 10) || 1433)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Base de datos</label>
                        <input
                          className={inputClass}
                          value={database}
                          onChange={(e) => setDatabase(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Usuario (solo lectura recomendado)</label>
                      <input className={inputClass} value={user} onChange={(e) => setUser(e.target.value)} required />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Contraseña</label>
                      <input
                        type="password"
                        className={inputClass}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        placeholder={mode === 'edit' && connector?.hasPassword ? 'Dejar vacío para no cambiar' : ''}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleTest}
                        disabled={testing}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-neutral-600"
                      >
                        {testing ? 'Probando…' : 'Probar conexión'}
                      </button>
                    </div>
                  </div>
                )}

                {panel === 'details' && connector && (
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-xs text-gray-500">ID</dt>
                      <dd className="font-mono text-xs break-all text-gray-800 dark:text-gray-200">{connector.id}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Creado</dt>
                      <dd className="text-gray-800 dark:text-gray-200">{formatDt(connector.createdAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Última actualización</dt>
                      <dd className="text-gray-800 dark:text-gray-200">{formatDt(connector.updatedAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Credencial</dt>
                      <dd className="text-gray-800 dark:text-gray-200">
                        {connector.hasPassword ? 'Almacenada (cifrada en servidor)' : 'No configurada'}
                      </dd>
                    </div>
                  </dl>
                )}

                {panel === 'details' && mode === 'create' && (
                  <p className="text-sm text-gray-500">Guarda el conector para ver el detalle e historial de IDs.</p>
                )}

                {panel === 'sharing' && <p className="text-sm text-gray-500">No disponible en esta versión.</p>}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-gray-200 px-4 py-3 dark:border-neutral-700">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:underline dark:text-gray-300"
              >
                Cancelar
              </button>
              {createStep === 'mssql' && mode === 'create' && (
                <button
                  type="button"
                  onClick={() => {
                    setCreateStep('selectType');
                    setTestMsg(null);
                    setErr(null);
                  }}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-neutral-600"
                >
                  Atrás
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-black px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:hover:bg-gray-200 dark:hover:text-black"
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </>
        ) : createStep === 'http' ? (
          <div className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">API HTTP (REST)</h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-800"
                aria-label="Cerrar"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Disponible en una versión futura.</p>
            <button
              type="button"
              onClick={() => setCreateStep('selectType')}
              className="mt-4 text-sm text-gray-600 underline dark:text-gray-300"
            >
              Volver
            </button>
          </div>
        ) : (
          <div className="p-6">
            <div className="flex items-center justify-between">
              <h2 id="connector-dialog-title" className="text-base font-medium text-gray-900 dark:text-gray-100">
                Tipo de conector
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-800"
                aria-label="Cerrar"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">El formulario dependerá del tipo que elijas.</p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => mssqlActive && setCreateStep('mssql')}
                disabled={!mssqlActive}
                className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 text-left transition hover:border-gray-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:hover:border-gray-500"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-cyan-50 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-200">
                  <IconMssql className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                    {mssqlType?.label ?? 'Microsoft SQL Server'}
                  </span>
                  <span className="text-xs text-gray-500">Host, puerto, base, usuario, contraseña.</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => httpActive && setCreateStep('http')}
                disabled={!httpActive}
                className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 text-left transition hover:border-gray-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:hover:border-gray-500"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-violet-50 text-violet-800 dark:bg-violet-900/30 dark:text-violet-200">
                  <IconHttpRest className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                    {httpType?.label ?? 'API HTTP (REST)'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {httpActive ? 'Endpoint y autenticación.' : 'Próximamente.'}
                  </span>
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
