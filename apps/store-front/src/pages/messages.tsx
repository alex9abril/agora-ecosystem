import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import StoreLayout from '@/components/layout/StoreLayout';
import AccountSidebar from '@/components/AccountSidebar';
import ContextualLink from '@/components/ContextualLink';
import { messagesService, type InboxMessage } from '@/lib/messages';
import { useMessagesNotifications } from '@/contexts/MessagesContext';
import { useAuth } from '@/contexts/AuthContext';

export default function MessagesPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { refreshUnread, markReadLocal } = useMessagesNotifications();

  const [items, setItems] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    const load = async () => {
      if (!isAuthenticated) return;
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
  }, [isAuthenticated]);

  const unreadIds = useMemo(() => new Set(items.filter((m) => !m.read_at).map((m) => m.id)), [items]);

  const markRead = async (id: string) => {
    if (!unreadIds.has(id)) return;
    try {
      const res = await messagesService.markRead(id);
      setItems((prev) => prev.map((m) => (m.id === id ? { ...m, read_at: res.read_at } : m)));
      markReadLocal();
      refreshUnread();
    } catch {
      // ignore
    }
  };

  return (
    <StoreLayout>
      <Head>
        <title>Mensajes | AGORA</title>
      </Head>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          <AccountSidebar activeTab="messages" />

          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Mensajes</h1>
            <p className="text-sm text-gray-500 mb-6">Comunicaciones enviadas por la sucursal.</p>

            {error && (
              <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            {loading ? (
              <div className="text-sm text-gray-500">Cargando...</div>
            ) : items.length === 0 ? (
              <div className="text-sm text-gray-500">No tienes mensajes.</div>
            ) : (
              <div className="space-y-3">
                {items.map((m) => {
                  const isUnread = unreadIds.has(m.id);
                  return (
                    <ContextualLink
                      key={m.id}
                      href={`/messages/${m.id}`}
                      className={`block bg-white rounded-lg border p-4 hover:shadow-sm transition-shadow ${
                        isUnread ? 'border-red-200' : 'border-gray-200'
                      }`}
                      onClick={() => {
                        if (isUnread) void markRead(m.id);
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            {isUnread && <span className="w-2 h-2 bg-red-600 rounded-full" aria-label="No leído" />}
                            <span>{m.business_name || 'Sucursal'}</span>
                            <span>·</span>
                            <span>{new Date(m.created_at).toLocaleString()}</span>
                          </div>
                          <div className="text-base font-semibold text-gray-900 truncate">{m.subject}</div>
                        </div>
                        <div className="text-xs text-gray-400 whitespace-nowrap">{isUnread ? 'No leído' : 'Leído'}</div>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        Ver mensaje <span aria-hidden>→</span>
                      </div>
                    </ContextualLink>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </StoreLayout>
  );
}

