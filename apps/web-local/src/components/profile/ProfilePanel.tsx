'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/lib/auth';

function formatConnectionDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function describeUserAgent(ua: string | null): string {
  if (!ua) return 'Navegador';
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edg')) return 'Edge';
  return 'Navegador';
}

interface ProfilePanelProps {
  open: boolean;
  onClose: () => void;
}

export default function ProfilePanel({ open, onClose }: ProfilePanelProps) {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ first_name?: string; last_name?: string; phone?: string } | null>(null);
  const [connections, setConnections] = useState<Array<{
    id: string;
    connected_at: string;
    ip_address: string | null;
    user_agent: string | null;
  }>>([]);
  const [form, setForm] = useState({ first_name: '', last_name: '' });

  useEffect(() => {
    if (!open || !user || !token) return;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        await authService.recordConnection();
        const [me, conns] = await Promise.all([
          authService.getProfile(token),
          authService.getMyConnections(20),
        ]);
        const p = me?.profile ?? {};
        setProfile(p);
        setForm({
          first_name: p.first_name ?? user.first_name ?? '',
          last_name: p.last_name ?? user.last_name ?? '',
        });
        setConnections(Array.isArray(conns) ? conns : []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error al cargar perfil');
        setConnections([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, user?.id, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      await authService.updateProfile({
        first_name: form.first_name || undefined,
        last_name: form.last_name || undefined,
      });
      setSuccess('Datos guardados correctamente');
      setProfile((prev) => ({ ...prev, first_name: form.first_name, last_name: form.last_name }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const onEscape = (ev: KeyboardEvent) => { if (ev.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEscape);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const panel = (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 dark:bg-black/50"
        aria-hidden
        onClick={onClose}
      />
      <div
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-neutral-800 shadow-xl flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="Mi perfil"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-neutral-700">
          <h2 className="text-lg font-normal text-gray-900 dark:text-gray-100">Mi perfil</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-700 dark:text-gray-400"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Gestiona tus datos y consulta tus últimas conexiones
          </p>
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-gray-200 dark:bg-neutral-600 rounded w-3/4" />
              <div className="h-10 bg-gray-200 dark:bg-neutral-600 rounded w-1/2" />
              <div className="h-32 bg-gray-200 dark:bg-neutral-600 rounded" />
            </div>
          ) : (
            <>
              <div className="bg-gray-50 dark:bg-neutral-700/50 rounded-lg border border-gray-200 dark:border-neutral-600 p-4 mb-4">
                <h3 className="text-base font-normal text-gray-900 dark:text-gray-100 mb-3">Mis datos</h3>
                {error && (
                  <div className="mb-3 p-2 rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="mb-3 p-2 rounded-md bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-sm">
                    {success}
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label htmlFor="panel_first_name" className="block text-sm font-normal text-gray-700 dark:text-gray-300 mb-1">
                      Nombre
                    </label>
                    <input
                      id="panel_first_name"
                      type="text"
                      value={form.first_name}
                      onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg focus:ring-gray-900 focus:border-gray-900 dark:bg-neutral-700 dark:text-gray-100 text-sm"
                      placeholder="Tu nombre"
                    />
                  </div>
                  <div>
                    <label htmlFor="panel_last_name" className="block text-sm font-normal text-gray-700 dark:text-gray-300 mb-1">
                      Apellido
                    </label>
                    <input
                      id="panel_last_name"
                      type="text"
                      value={form.last_name}
                      onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg focus:ring-gray-900 focus:border-gray-900 dark:bg-neutral-700 dark:text-gray-100 text-sm"
                      placeholder="Tu apellido"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-normal text-gray-700 dark:text-gray-300 mb-1">
                      Correo electrónico
                    </label>
                    <p className="px-3 py-2 bg-gray-100 dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 rounded-lg text-sm text-gray-600 dark:text-gray-300">
                      {user?.email ?? '—'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">El correo no se puede editar aquí.</p>
                  </div>
                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-normal"
                    >
                      {saving ? 'Guardando…' : 'Guardar'}
                    </button>
                  </div>
                </form>
              </div>
              <div className="bg-gray-50 dark:bg-neutral-700/50 rounded-lg border border-gray-200 dark:border-neutral-600 p-4">
                <h3 className="text-base font-normal text-gray-900 dark:text-gray-100 mb-3">Últimas conexiones</h3>
                {connections.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Aún no hay registros de conexión.</p>
                ) : (
                  <ul className="divide-y divide-gray-200 dark:divide-neutral-600">
                    {connections.map((c) => (
                      <li key={c.id} className="py-2 first:pt-0 last:pb-0">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-sm font-normal text-gray-900 dark:text-gray-100">
                            {formatConnectionDate(c.connected_at)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {describeUserAgent(c.user_agent)}
                            {c.ip_address ? ` · ${c.ip_address}` : ''}
                          </span>
                        </div>
                        {c.user_agent && (
                          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500 truncate max-w-full" title={c.user_agent}>
                            {c.user_agent}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(panel, document.body);
}
