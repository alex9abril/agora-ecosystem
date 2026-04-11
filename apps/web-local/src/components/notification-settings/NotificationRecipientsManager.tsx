'use client';

import { useState, useEffect, useRef } from 'react';
import { businessService } from '@/lib/business';
import type { NotificationRecipient } from '@/lib/business';

export interface NotificationRecipientsManagerProps {
  mode: 'branch' | 'group';
  id: string;
  contextName: string;
}

export default function NotificationRecipientsManager({ mode, id, contextName }: NotificationRecipientsManagerProps) {
  const [recipients, setRecipients] = useState<NotificationRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [emailError, setEmailError] = useState('');
  const emailRef = useRef<HTMLInputElement>(null);

  const clearFeedback = () => {
    setError(null);
    setSuccess(null);
  };

  const loadRecipients = async () => {
    setLoading(true);
    clearFeedback();
    try {
      const data =
        mode === 'branch'
          ? await businessService.getNotificationRecipients(id)
          : await businessService.getGroupNotificationRecipients(id);
      setRecipients(data);
    } catch {
      setError('No se pudieron cargar los correos de supervisores.');
      setRecipients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecipients();
  }, [mode, id]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 3000);
    return () => clearTimeout(t);
  }, [success]);

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setEmailError('Ingresa un correo electrónico.');
      emailRef.current?.focus();
      return;
    }
    if (!isValidEmail(trimmed)) {
      setEmailError('El formato del correo no es válido.');
      emailRef.current?.focus();
      return;
    }
    if (recipients.some((r) => r.email === trimmed)) {
      setEmailError('Este correo ya está registrado.');
      emailRef.current?.focus();
      return;
    }

    setEmailError('');
    setAdding(true);
    clearFeedback();
    try {
      const added =
        mode === 'branch'
          ? await businessService.addNotificationRecipient(id, { email: trimmed, name: name.trim() || undefined })
          : await businessService.addGroupNotificationRecipient(id, { email: trimmed, name: name.trim() || undefined });
      setRecipients((prev) => [...prev, added]);
      setEmail('');
      setName('');
      setSuccess('Correo agregado correctamente.');
      emailRef.current?.focus();
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'No se pudo agregar el correo.';
      setError(message);
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (recipientId: string) => {
    setRemovingId(recipientId);
    clearFeedback();
    try {
      if (mode === 'branch') {
        await businessService.removeNotificationRecipient(id, recipientId);
      } else {
        await businessService.removeGroupNotificationRecipient(id, recipientId);
      }
      setRecipients((prev) => prev.filter((r) => r.id !== recipientId));
      setSuccess('Correo eliminado.');
    } catch {
      setError('No se pudo eliminar el correo.');
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 text-sm text-gray-500 dark:text-neutral-400">
        Cargando correos de supervisores...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Correos de supervisores
        </h4>
        <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">
          Estos correos recibirán notificaciones de compras, nuevos clientes y cambios de estatus de pedidos en <strong>{contextName}</strong>.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-2.5">
          <p className="text-xs text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-4 py-2.5">
          <p className="text-xs text-green-800 dark:text-green-200">{success}</p>
        </div>
      )}

      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 min-w-0">
          <input
            ref={emailRef}
            type="email"
            placeholder="correo@ejemplo.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError('');
            }}
            disabled={adding}
            className={`w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 disabled:opacity-50 ${
              emailError
                ? 'border-red-300 dark:border-red-700 focus:ring-red-500'
                : 'border-gray-300 dark:border-neutral-600 focus:ring-black dark:focus:ring-neutral-400'
            }`}
          />
          {emailError && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{emailError}</p>
          )}
        </div>
        <input
          type="text"
          placeholder="Nombre (opcional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={adding}
          className="sm:w-40 rounded-lg border border-gray-300 dark:border-neutral-600 px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-neutral-400 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={adding}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-black dark:bg-white text-white dark:text-black px-4 py-2 text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2 disabled:opacity-50 transition-colors shrink-0"
        >
          {adding ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          )}
          Agregar
        </button>
      </form>

      {recipients.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-neutral-600 py-6 text-center">
          <svg className="mx-auto h-8 w-8 text-gray-300 dark:text-neutral-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
          <p className="mt-2 text-sm text-gray-500 dark:text-neutral-400">
            No hay correos registrados
          </p>
          <p className="text-xs text-gray-400 dark:text-neutral-500 mt-0.5">
            Agrega el primer correo de supervisor arriba.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-neutral-700 rounded-lg border border-gray-200 dark:border-neutral-700 overflow-hidden">
          {recipients.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-neutral-800/50 group"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                  {r.email}
                </p>
                {r.name && (
                  <p className="text-xs text-gray-500 dark:text-neutral-400 truncate">
                    {r.name}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRemove(r.id)}
                disabled={removingId === r.id}
                title="Eliminar correo"
                className="shrink-0 p-1.5 rounded-md text-gray-400 dark:text-neutral-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
              >
                {removingId === r.id ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
