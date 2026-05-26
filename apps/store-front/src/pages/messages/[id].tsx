import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import StoreLayout from '@/components/layout/StoreLayout';
import AccountSidebar from '@/components/AccountSidebar';
import ContextualLink from '@/components/ContextualLink';
import { messagesService, type InboxMessage } from '@/lib/messages';
import { useMessagesNotifications } from '@/contexts/MessagesContext';
import { useAuth } from '@/contexts/AuthContext';

function Logo() {
  return (
    <img
      src="https://agoramp.mx/_next/static/media/agora_logo_white.7075c997.png"
      alt="AGORA"
      className="h-8 w-auto mx-auto"
    />
  );
}

export default function MessageDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const messageId = typeof id === 'string' ? id : '';

  const { isAuthenticated, loading: authLoading } = useAuth();
  const { refreshUnread, markReadLocal } = useMessagesNotifications();

  const [message, setMessage] = useState<InboxMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    const load = async () => {
      if (!isAuthenticated || !messageId) return;
      setLoading(true);
      setError(null);
      try {
        // Backend enforces a max limit (100) for inbox pagination.
        const res = await messagesService.inbox({ limit: 100, offset: 0 });
        const found = (res.items || []).find((m) => m.id === messageId) || null;
        setMessage(found);

        if (found && !found.read_at) {
          try {
            const marked = await messagesService.markRead(found.id);
            setMessage((prev) => (prev ? { ...prev, read_at: marked.read_at } : prev));
            markReadLocal();
            refreshUnread();
          } catch {
            // ignore
          }
        }
      } catch (err: any) {
        setError(err?.message || 'No se pudo cargar el mensaje');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAuthenticated, messageId, refreshUnread, markReadLocal]);

  const header = useMemo(() => {
    if (loading) return 'Cargando...';
    if (message) return message.subject;
    return 'Mensaje';
  }, [loading, message]);

  return (
    <StoreLayout>
      <Head>
        <title>{header} | AGORA</title>
      </Head>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          <AccountSidebar activeTab="messages" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="min-w-0">
                <ContextualLink href="/messages" className="text-sm text-gray-600 hover:text-gray-900">
                  ← Volver a mensajes
                </ContextualLink>
                <h1 className="mt-2 text-2xl font-bold text-gray-900 truncate">{header}</h1>
              </div>
              {message?.read_at ? (
                <span className="text-xs text-gray-500 whitespace-nowrap">Leído</span>
              ) : null}
            </div>

            {error && (
              <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            {loading ? (
              <div className="text-sm text-gray-500">Cargando...</div>
            ) : !message ? (
              <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
                Mensaje no encontrado.
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden border border-gray-200 bg-[#333]">
                <div className="px-4 py-10 text-center">
                  <Logo />
                  <p className="mt-2 text-xs text-white/80">
                    La mejor solución de comercio en línea para la industria automotriz
                  </p>
                </div>

                <div className="px-4 pb-10">
                  <div className="max-w-2xl mx-auto -mt-8">
                    <div className="bg-white rounded-2xl shadow-lg px-6 py-8 text-center">
                      <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow">
                        <span className="text-2xl text-white font-bold" aria-hidden>
                          ✉
                        </span>
                      </div>

                      <h2 className="text-2xl font-extrabold text-gray-900">{message.subject}</h2>
                      <p className="mt-2 text-sm text-gray-600">
                        Has recibido un mensaje de <span className="font-semibold">{message.business_name || 'Sucursal'}</span>.
                      </p>

                      <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-left">
                        <div className="text-xs font-semibold tracking-wider text-gray-500 uppercase mb-2">Mensaje</div>
                        <div className="text-sm text-gray-800" dangerouslySetInnerHTML={{ __html: message.body_html }} />
                      </div>

                      <p className="mt-6 text-xs text-gray-400">
                        Este mensaje fue enviado a {message.to_email}. Si tienes alguna duda, responde a este correo.
                      </p>
                    </div>

                    <p className="mt-4 text-center text-xs text-white/50">© 2026 AGORA. Todos los derechos reservados.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </StoreLayout>
  );
}
