import { useEffect, useMemo, useState, type FormEvent } from 'react';

type Props = {
  isOpen: boolean;
  defaultToEmail?: string;
  onClose: () => void;
  onSend: (payload: { to_email: string; subject: string; body: string }) => Promise<void> | void;
};

export default function ComposeMessageModal({ isOpen, defaultToEmail, onClose, onSend }: Props) {
  const [toEmail, setToEmail] = useState(defaultToEmail || '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setToEmail(defaultToEmail || '');
    setSubject('');
    setBody('');
    setSending(false);
    setError(null);
  }, [isOpen, defaultToEmail]);

  const canSend = useMemo(() => {
    const e = toEmail.trim();
    return e.length > 3 && subject.trim().length > 0 && body.trim().length > 0 && !sending;
  }, [toEmail, subject, body, sending]);

  if (!isOpen) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!canSend) return;
    setSending(true);
    try {
      await onSend({ to_email: toEmail.trim(), subject: subject.trim(), body });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'No se pudo enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 dark:bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compose-title"
      onClick={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-xl rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 shadow-xl p-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 id="compose-title" className="text-base font-medium text-gray-900 dark:text-gray-100">
              Nuevo mensaje
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Envía un correo personalizado al cliente usando el template <span className="font-mono">custom_message</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
          >
            Cerrar
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <label className="block text-xs text-gray-500 mb-0.5">Para</label>
        <input
          className="w-full rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1.5 text-sm mb-3"
          value={toEmail}
          onChange={(e) => setToEmail(e.target.value)}
          placeholder="cliente@correo.com"
        />

        <label className="block text-xs text-gray-500 mb-0.5">Asunto</label>
        <input
          className="w-full rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1.5 text-sm mb-3"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Escribe el asunto"
        />

        <label className="block text-xs text-gray-500 mb-0.5">Mensaje</label>
        <textarea
          className="w-full min-h-[160px] rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-2 text-sm mb-4"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Escribe tu mensaje (se respetan saltos de línea)"
        />

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded border border-gray-300 dark:border-neutral-600 text-sm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!canSend}
            className={`px-3 py-2 rounded text-sm text-white ${
              canSend ? 'bg-black hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-100' : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {sending ? 'Enviando…' : 'Enviar'}
          </button>
        </div>
      </form>
    </div>
  );
}

