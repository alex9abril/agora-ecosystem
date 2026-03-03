import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import AdminLayout from '@/components/layout/AdminLayout';
import {
  webhookSecretsService,
  type WebhookSecretListItem,
  type WebhookSecretCreated,
} from '@/lib/settings';

export default function WebhookSecretsPage() {
  const router = useRouter();
  const [list, setList] = useState<WebhookSecretListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<'form' | 'success'>('form');
  const [form, setForm] = useState({ name: '', noExpira: true, expiresAt: '' });
  const [submitting, setSubmitting] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<WebhookSecretCreated | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [visibleKeyId, setVisibleKeyId] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('Copiado al portapapeles');
  const [secretsCreatedThisSession, setSecretsCreatedThisSession] = useState<Record<string, string>>({});
  const menuAnchorRef = useRef<HTMLButtonElement | null>(null);
  const snackbarTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadList = async () => {
    setLoading(true);
    try {
      const data = await webhookSecretsService.list();
      setList(data);
    } catch (e) {
      console.error('Error cargando claves:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
  }, []);

  const openCreateModal = () => {
    setForm({ name: '', noExpira: true, expiresAt: '' });
    setModalStep('form');
    setCreatedSecret(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setCreatedSecret(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      const res = await webhookSecretsService.create({
        name: form.name.trim(),
        no_expira: form.noExpira,
        expires_at: form.noExpira ? null : (form.expiresAt || null),
      });
      setCreatedSecret(res);
      setModalStep('success');
      setSecretsCreatedThisSession((prev) => ({ ...prev, [res.id]: res.secret }));
      await loadList();
    } catch (err) {
      console.error('Error creando clave:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const openMenu = (id: string, button: HTMLButtonElement) => {
    menuAnchorRef.current = button;
    setMenuOpenId(menuOpenId === id ? null : id);
  };

  const closeMenu = () => {
    setMenuOpenId(null);
    menuAnchorRef.current = null;
  };

  const handleRevoke = async (id: string) => {
    closeMenu();
    setRevokingId(id);
    try {
      await webhookSecretsService.patch(id, { is_active: false });
      await loadList();
    } catch (err) {
      console.error('Error revocando:', err);
    } finally {
      setRevokingId(null);
    }
  };

  const showSnackbar = (message: string) => {
    if (snackbarTimeoutRef.current) clearTimeout(snackbarTimeoutRef.current);
    setSnackbarMessage(message);
    setSnackbarOpen(true);
    snackbarTimeoutRef.current = setTimeout(() => {
      setSnackbarOpen(false);
      snackbarTimeoutRef.current = null;
    }, 3000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showSnackbar('Copiado al portapapeles');
  };

  useEffect(() => {
    return () => {
      if (snackbarTimeoutRef.current) clearTimeout(snackbarTimeoutRef.current);
    };
  }, []);

  return (
    <>
      <Head>
        <title>Claves de webhook - AGORA Admin</title>
      </Head>

      <AdminLayout>
        <div className="flex h-full bg-gray-50">
          <div className="flex-1 min-w-0 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-6 py-8">
              <button
                onClick={() => router.push('/settings')}
                className="text-sm text-gray-600 hover:text-gray-900 mb-4 flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Volver a Configuración
              </button>

              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Claves de webhook</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Cada petición al webhook debe enviar una de estas claves (header o firma). Sin clave válida el webhook será rechazado.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Nueva clave
                </button>
              </div>

              <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Conectar webhook en Karlopay</p>
                <p className="text-sm text-gray-600 mb-1">
                  <strong>URL del webhook:</strong> <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 text-gray-800">{'{{base_url}}/api/payments/karlopay/webhook/payment'}</code> (reemplaza {'{{base_url}}'} por la URL base de tu API).
                </p>
                <p className="text-sm text-gray-600">
                  En cada petición Karlopay debe enviar la clave en el header <code className="bg-white px-1 py-0.5 rounded border border-gray-200 text-gray-800">X-Webhook-Secret</code> (o <code className="bg-white px-1 py-0.5 rounded border border-gray-200 text-gray-800">Authorization: Bearer &lt;clave&gt;</code>). Usa una de las claves activas de la tabla.
                </p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {loading ? (
                  <div className="py-12 text-center text-sm text-gray-500">Cargando...</div>
                ) : list.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-sm text-gray-500">No hay claves creadas.</p>
                    <button
                      type="button"
                      onClick={openCreateModal}
                      className="mt-3 text-sm font-medium text-gray-900 hover:underline"
                    >
                      Crear la primera clave
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clave (secret)</th>
                          <th className="px-4 py-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {list.map((row) => (
                          <tr key={row.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">{row.name}</div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {row.expires_at
                                  ? `Caduca ${new Date(row.expires_at).toLocaleString()}`
                                  : 'No caduca'}
                                {!row.is_active && ' · Revocada'}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center px-3 py-1.5 rounded border border-gray-200 bg-gray-50 text-sm font-mono text-gray-600 min-w-[200px] break-all">
                                  {visibleKeyId === row.id && (row.secret ?? secretsCreatedThisSession[row.id])
                                    ? (row.secret ?? secretsCreatedThisSession[row.id])
                                    : visibleKeyId === row.id
                                      ? (row.secret_prefix || 'ago_secret_••••••••••••')
                                      : (row.secret_prefix || 'ago_secret_••••••••••••') + '••••••••••••••••••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setVisibleKeyId(visibleKeyId === row.id ? null : row.id)}
                                  className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                                  title={
                                    (row.secret ?? secretsCreatedThisSession[row.id])
                                      ? (visibleKeyId === row.id ? 'Ocultar clave completa' : 'Mostrar clave completa')
                                      : (visibleKeyId === row.id ? 'Ocultar prefijo' : 'Mostrar prefijo')
                                  }
                                  aria-label={visibleKeyId === row.id ? 'Ocultar' : 'Mostrar'}
                                >
                                  {visibleKeyId === row.id ? (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const fullSecret = row.secret ?? secretsCreatedThisSession[row.id];
                                    if (fullSecret) {
                                      copyToClipboard(fullSecret);
                                      return;
                                    }
                                    try {
                                      const { secret } = await webhookSecretsService.getSecret(row.id);
                                      copyToClipboard(secret);
                                      setList((prev) =>
                                        prev.map((r) => (r.id === row.id ? { ...r, secret } : r))
                                      );
                                    } catch {
                                      setSnackbarMessage('No se pudo obtener la clave completa');
                                      setSnackbarOpen(true);
                                      if (snackbarTimeoutRef.current) clearTimeout(snackbarTimeoutRef.current);
                                      snackbarTimeoutRef.current = setTimeout(() => {
                                        setSnackbarOpen(false);
                                        snackbarTimeoutRef.current = null;
                                      }, 4000);
                                    }
                                  }}
                                  className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                                  title="Copiar clave completa"
                                  aria-label="Copiar"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h2m8 0h2a2 2 0 012 2v2m-3 7h2a2 2 0 002-2v-2m-3 7h2m-3 7H6m12 0a2 2 0 01-2 2H9a2 2 0 01-2-2v-2" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {row.is_active && (
                                <button
                                  type="button"
                                  onClick={(e) => openMenu(row.id, e.currentTarget)}
                                  className="p-1 rounded hover:bg-gray-100 text-gray-500"
                                  aria-label="Más opciones"
                                  aria-expanded={menuOpenId === row.id}
                                >
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                  </svg>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Menú de acciones (portal para que no lo recorte overflow de la tabla) */}
        {typeof document !== 'undefined' &&
          menuOpenId &&
          menuAnchorRef.current &&
          createPortal(
            <>
              <div
                className="fixed inset-0 z-40"
                aria-hidden
                onClick={closeMenu}
              />
              <div
                className="fixed z-50 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 py-1"
                style={(() => {
                  const rect = menuAnchorRef.current!.getBoundingClientRect();
                  return {
                    top: rect.bottom + 4,
                    right: window.innerWidth - rect.right,
                    left: 'auto',
                  };
                })()}
              >
                <button
                  type="button"
                  onClick={() => menuOpenId && handleRevoke(menuOpenId)}
                  disabled={revokingId === menuOpenId}
                  className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  {revokingId === menuOpenId ? 'Revocando...' : 'Revocar'}
                </button>
              </div>
            </>,
            document.body
          )}

        {/* Snackbar: copiado al portapapeles */}
        {snackbarOpen && (
          <div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-4 py-3 rounded-lg bg-gray-900 text-white text-sm font-medium shadow-lg max-w-md"
            role="status"
            aria-live="polite"
          >
            {snackbarMessage === 'Copiado al portapapeles' ? (
              <svg className="w-5 h-5 flex-shrink-0 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : null}
            <span>{snackbarMessage}</span>
          </div>
        )}

        {/* Modal: Crear nueva clave (estilo Supabase) */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto" aria-modal aria-labelledby="modal-title">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={modalStep === 'form' ? closeModal : undefined} />
              <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                  aria-label="Cerrar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {modalStep === 'form' ? (
                  <>
                    <h2 id="modal-title" className="text-lg font-semibold text-gray-900 pr-8">
                      Crear nueva clave de webhook
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      La clave se usará para validar la firma HMAC del webhook de Karlopay.
                    </p>

                    <form onSubmit={handleCreate} className="mt-6 space-y-4">
                      <div>
                        <label htmlFor="key-name" className="block text-sm font-medium text-gray-700">
                          Nombre
                        </label>
                        <input
                          id="key-name"
                          type="text"
                          value={form.name}
                          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                          placeholder="Ej: karlopay_produccion"
                          maxLength={255}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                          required
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Un nombre corto con letras minúsculas, números o guión bajo.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          id="no-expira"
                          type="checkbox"
                          checked={form.noExpira}
                          onChange={(e) => setForm((f) => ({ ...f, noExpira: e.target.checked }))}
                          className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                        />
                        <label htmlFor="no-expira" className="text-sm text-gray-700">No caduca</label>
                      </div>
                      {!form.noExpira && (
                        <div>
                          <label htmlFor="expires-at" className="block text-sm font-medium text-gray-700">
                            Fecha de expiración
                          </label>
                          <input
                            id="expires-at"
                            type="datetime-local"
                            value={form.expiresAt}
                            onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          />
                        </div>
                      )}

                      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                        <p className="text-sm font-medium text-amber-900 flex items-center gap-2">
                          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          Protege tu clave
                        </p>
                        <ul className="mt-2 text-sm text-amber-800 list-disc list-inside space-y-1">
                          <li>Mantén esta clave en secreto.</li>
                          <li>No la uses en frontend ni en apps públicas.</li>
                          <li>No la subas a repositorios ni la compartas.</li>
                          <li>Configúrala en el panel de Karlopay como secret del webhook.</li>
                          <li>Si se filtra, crea una nueva clave y revoca esta.</li>
                        </ul>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={closeModal}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50"
                        >
                          {submitting ? 'Creando...' : 'Crear clave'}
                        </button>
                      </div>
                    </form>
                  </>
                ) : (
                  <div>
                    <h2 id="modal-title" className="text-lg font-semibold text-gray-900">
                      Clave creada
                    </h2>
                    <p className="mt-1 text-sm text-amber-700 font-medium">
                      Copia este valor; no se volverá a mostrar.
                    </p>
                    {createdSecret && !createdSecret.secret.startsWith('ago_secret_') && (
                      <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                        El valor no tiene el formato esperado (ago_secret_...). Reinicia el backend y vuelve a crear la clave.
                      </p>
                    )}
                    {createdSecret && (
                      <div className="mt-4 flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={createdSecret.secret}
                          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-mono bg-gray-50"
                        />
                        <button
                          type="button"
                          onClick={() => copyToClipboard(createdSecret.secret)}
                          className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800"
                        >
                          Copiar
                        </button>
                      </div>
                    )}
                    <p className="mt-3 text-xs text-gray-500">
                      Configúrala en Karlopay como secret del webhook.
                    </p>
                    <div className="mt-6 flex justify-end">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  );
}
