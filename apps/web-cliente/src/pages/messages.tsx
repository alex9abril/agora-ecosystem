import Head from 'next/head';
import { useEffect, useState } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import { messagesService, type InboxMessage } from '@/lib/messages';

export default function MessagesPage() {
  const [items, setItems] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await messagesService.inbox({ limit: 50, offset: 0 });
        setItems(res.items || []);
      } catch (err: any) {
        setError(err?.message || 'No se pudieron cargar tus mensajes');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <MobileLayout>
      <Head>
        <title>Mensajes | Localia</title>
      </Head>

      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Mensajes</h1>
        <p className="text-sm text-gray-500 mb-4">Correos enviados por el administrador.</p>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-sm text-gray-500">Cargando…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-gray-500">No tienes mensajes.</div>
        ) : (
          <div className="space-y-3">
            {items.map((m) => (
              <div key={m.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm text-gray-500">
                      {m.business_name || 'Sucursal'} · {new Date(m.created_at).toLocaleString()}
                    </div>
                    <div className="text-base font-semibold text-gray-900 truncate">{m.subject}</div>
                  </div>
                  <div className="text-xs text-gray-400 whitespace-nowrap">{m.status}</div>
                </div>
                <details className="mt-3">
                  <summary className="text-sm text-black cursor-pointer select-none">Ver mensaje</summary>
                  <div
                    className="mt-2 text-sm text-gray-800"
                    dangerouslySetInnerHTML={{ __html: m.body_html }}
                  />
                </details>
              </div>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}

