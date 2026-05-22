import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import LocalLayout from '@/components/layout/LocalLayout';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import ComposeMessageModal from '@/components/messages/ComposeMessageModal';
import { messagesService, type OutboundMessage } from '@/lib/messages';

function statusBadge(status: string) {
  const s = (status || '').toLowerCase();
  if (s === 'sent' || s === 'success') return 'bg-green-100 text-green-800';
  if (s === 'failed') return 'bg-red-100 text-red-800';
  if (s === 'skipped') return 'bg-amber-100 text-amber-900';
  if (s === 'queued') return 'bg-gray-100 text-gray-700';
  return 'bg-gray-100 text-gray-700';
}

export default function MessagesPage() {
  const { selectedBusiness } = useSelectedBusiness();
  const businessId = selectedBusiness?.business_id;

  const [items, setItems] = useState<OutboundMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const [filterEmail, setFilterEmail] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);

  const canQuery = Boolean(businessId);

  const load = async (newOffset: number) => {
    if (!businessId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await messagesService.list({
        business_id: businessId,
        limit,
        offset: newOffset,
        to_email: filterEmail.trim() ? filterEmail.trim() : undefined,
        status: filterStatus.trim() ? filterStatus.trim() : undefined,
      });
      setItems(res.items || []);
      setTotal(res.total || 0);
      setOffset(newOffset);
    } catch (err: any) {
      setError(err?.message || 'No se pudieron cargar los mensajes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canQuery) return;
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  const pageStart = offset + 1;
  const pageEnd = Math.min(offset + limit, total);
  const hasPrev = offset > 0;
  const hasNext = offset + limit < total;

  const headerText = useMemo(() => {
    if (!total) return 'Mensajes';
    return `Mensajes (${pageStart}-${pageEnd} de ${total})`;
  }, [total, pageStart, pageEnd]);

  return (
    <LocalLayout>
      <Head>
        <title>Mensajes | AGORA</title>
      </Head>

      <div className="p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{headerText}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Historial de correos enviados desde el panel (tabla <span className="font-mono">communication.outbound_messages</span>).
            </p>
          </div>
          <button
            onClick={() => setComposeOpen(true)}
            className="px-3 py-2 rounded bg-black text-white text-sm hover:bg-gray-900 dark:bg-white dark:text-black"
            disabled={!businessId}
          >
            Nuevo mensaje
          </button>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg p-3 mb-4">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="min-w-[240px]">
              <label className="block text-xs text-gray-500 mb-0.5">Email</label>
              <input
                className="w-full rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1.5 text-sm"
                value={filterEmail}
                onChange={(e) => setFilterEmail(e.target.value)}
                placeholder="cliente@correo.com"
              />
            </div>
            <div className="min-w-[200px]">
              <label className="block text-xs text-gray-500 mb-0.5">Estado</label>
              <select
                className="w-full rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1.5 text-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="queued">queued</option>
                <option value="sent">sent</option>
                <option value="failed">failed</option>
                <option value="skipped">skipped</option>
              </select>
            </div>
            <button
              onClick={() => load(0)}
              className="px-3 py-2 rounded border border-gray-300 dark:border-neutral-600 text-sm"
              disabled={!businessId || loading}
            >
              Aplicar
            </button>
            <button
              onClick={() => {
                setFilterEmail('');
                setFilterStatus('');
                if (businessId) load(0);
              }}
              className="px-3 py-2 rounded border border-gray-300 dark:border-neutral-600 text-sm"
              disabled={!businessId || loading}
            >
              Limpiar
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-neutral-800 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="text-left px-3 py-2">Fecha</th>
                  <th className="text-left px-3 py-2">Para</th>
                  <th className="text-left px-3 py-2">Asunto</th>
                  <th className="text-left px-3 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-3 py-3 text-gray-500" colSpan={4}>
                      Cargando…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-gray-500" colSpan={4}>
                      Sin mensajes
                    </td>
                  </tr>
                ) : (
                  items.map((m) => (
                    <tr key={m.id} className="border-t border-gray-100 dark:border-neutral-800">
                      <td className="px-3 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200">
                        {new Date(m.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200">{m.to_email}</td>
                      <td className="px-3 py-2 text-gray-800 dark:text-gray-100">{m.subject}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusBadge(m.status)}`}>
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 dark:border-neutral-800">
            <div className="text-xs text-gray-500">
              {total ? (
                <>
                  {pageStart}-{pageEnd} de {total}
                </>
              ) : (
                '—'
              )}
            </div>
            <div className="flex gap-2">
              <button
                className="px-2 py-1 rounded border border-gray-300 dark:border-neutral-600 text-xs disabled:opacity-50"
                disabled={!hasPrev || loading}
                onClick={() => load(Math.max(0, offset - limit))}
              >
                Anterior
              </button>
              <button
                className="px-2 py-1 rounded border border-gray-300 dark:border-neutral-600 text-xs disabled:opacity-50"
                disabled={!hasNext || loading}
                onClick={() => load(offset + limit)}
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </div>

      <ComposeMessageModal
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSend={async ({ to_email, subject, body }) => {
          if (!businessId) return;
          await messagesService.sendCustomEmail({
            business_id: businessId,
            subject,
            body,
            to_email,
          });
          await load(0);
        }}
      />
    </LocalLayout>
  );
}
