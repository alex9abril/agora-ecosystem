/**
 * Chat de asistencia flotante con IA (ventas + pistas de catálogo).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import ContextualLink from '@/components/ContextualLink';
import { useCart } from '@/contexts/CartContext';
import { useStoreContext } from '@/contexts/StoreContext';
import { useSupportChat } from '@/contexts/SupportChatContext';
import { apiRequest, ApiError } from '@/lib/api';

type ChatRole = 'user' | 'assistant';

type ChatLine = { id: string; role: ChatRole; text: string };

type ProductHint = { id: string; name: string; sku: string | null };

type StorefrontChatResponse = {
  reply: string;
  source: 'llm' | 'fallback';
  productHints?: ProductHint[];
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function FloatingSupportChat() {
  const { isOpen, close, toggle } = useSupportChat();
  const { cart } = useCart();
  const { getStoreName, getContextualUrl, contextType, branchId, groupId, brandId } = useStoreContext();

  const [lines, setLines] = useState<ChatLine[]>([]);
  const [draft, setDraft] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastHints, setLastHints] = useState<ProductHint[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<ChatLine[]>([]);

  const storeLabel = useMemo(() => getStoreName(), [getStoreName]);

  const greeting = useMemo(
    () =>
      `¡Hola! Soy tu asistente de ventas de ${storeLabel}. Pregunta por refacciones, compatibilidad o qué producto te conviene; con gusto te oriento.`,
    [storeLabel],
  );

  useEffect(() => {
    if (!isOpen || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [isOpen, lines, error, aiLoading]);

  useEffect(() => {
    if (!isOpen) return;
    setLines((prev) => {
      if (prev.length > 0) return prev;
      return [{ id: uid(), role: 'assistant', text: greeting }];
    });
  }, [isOpen, greeting]);

  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  const runAi = useCallback(
    async (conversation: ChatLine[]) => {
      setAiLoading(true);
      setError(null);
      setLastHints([]);
      try {
        const messages = conversation.map((l) => ({
          role: l.role,
          content: l.text,
        }));
        const payload = {
          messages,
          storeLabel,
          branchId: branchId || undefined,
          groupId: groupId || undefined,
          vehicleBrandId: contextType === 'brand' && brandId ? brandId : undefined,
        };
        const data = await apiRequest<StorefrontChatResponse>('/storefront/chat', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        const reply = (data?.reply || '').trim() || 'No recibí una respuesta. Intenta de nuevo en unos segundos.';
        setLines((prev) => [...prev, { id: uid(), role: 'assistant', text: reply }]);
        setLastHints(Array.isArray(data?.productHints) ? data.productHints : []);
      } catch (e: unknown) {
        const msg =
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : 'No se pudo conectar con el asistente. Revisa tu conexión e intenta otra vez.';
        setError(msg);
      } finally {
        setAiLoading(false);
      }
    },
    [storeLabel, branchId, groupId, brandId, contextType],
  );

  const sendUserMessage = useCallback(() => {
    const t = draft.trim();
    if (!t || aiLoading) return;
    const userLine: ChatLine = { id: uid(), role: 'user', text: t };
    setDraft('');
    setError(null);
    const next = [...linesRef.current, userLine];
    setLines(next);
    void runAi(next);
  }, [draft, aiLoading, runAi]);

  const resetChat = useCallback(() => {
    setLines([{ id: uid(), role: 'assistant', text: greeting }]);
    setError(null);
    setLastHints([]);
    setDraft('');
  }, [greeting]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendUserMessage();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        className="fixed bottom-5 right-5 z-[1400] flex h-14 w-14 items-center justify-center rounded-full bg-black text-white shadow-lg ring-2 ring-white/30 transition hover:bg-gray-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-gray-400"
        aria-label={isOpen ? 'Cerrar asistencia' : 'Abrir asistencia de ventas'}
        aria-expanded={isOpen}
      >
        {isOpen ? <CloseIcon sx={{ fontSize: 28 }} /> : <ChatIcon sx={{ fontSize: 28 }} />}
      </button>

      {isOpen && (
        <div
          className="fixed bottom-[5.25rem] right-5 z-[1400] flex h-[min(85vh,32rem)] w-[min(100vw-2rem,22rem)] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
          role="dialog"
          aria-label="Asistente de ventas"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-900 px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">Ventas y soporte</p>
              <p className="truncate text-[11px] text-gray-300">{storeLabel}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={resetChat}
                className="rounded px-2 py-1 text-[10px] font-medium text-gray-200 hover:bg-white/10"
              >
                Nueva charla
              </button>
              <button
                type="button"
                onClick={close}
                className="rounded p-1 text-gray-300 hover:bg-white/10 hover:text-white"
                aria-label="Cerrar panel"
              >
                <CloseIcon sx={{ fontSize: 22 }} />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2 space-y-2">
            {cart?.items && cart.items.length > 0 && (
              <p className="rounded-md border border-gray-100 bg-gray-50 px-2 py-1 text-[10px] text-gray-600">
                Tienes {cart.items.length} artículo(s) en el carrito. Pregunta si quieres completar la compra.
              </p>
            )}

            {lines.map((line) => (
              <div
                key={line.id}
                className={`flex ${line.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={
                    line.role === 'user'
                      ? 'max-w-[92%] rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs text-white'
                      : 'max-w-[92%] rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs text-gray-900'
                  }
                >
                  <span className="block whitespace-pre-wrap leading-snug">{line.text}</span>
                </div>
              </div>
            ))}

            {aiLoading && (
              <div className="flex justify-start">
                <div className="rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs text-gray-500">Escribiendo…</div>
              </div>
            )}

            {error && (
              <div className="rounded border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] text-red-800">
                {error}
                <button
                  type="button"
                  className="mt-1 block text-[10px] font-semibold text-red-900 underline"
                  onClick={() => setError(null)}
                >
                  Cerrar aviso
                </button>
              </div>
            )}

            {lastHints.length > 0 && (
              <div className="border-t border-gray-100 pt-2">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  En catálogo
                </p>
                <ul className="flex flex-col gap-1">
                  {lastHints.slice(0, 4).map((p) => (
                    <li key={p.id}>
                      <ContextualLink
                        href={getContextualUrl(`/products/${p.id}`)}
                        className="text-[11px] font-medium text-blue-700 hover:underline"
                      >
                        {p.name}
                        {p.sku ? ` · ${p.sku}` : ''}
                      </ContextualLink>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-gray-100 bg-gray-50 p-2 space-y-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              rows={2}
              disabled={aiLoading}
              placeholder="Ej.: pastillas de freno para… (Enter envía)"
              className="w-full resize-none rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 disabled:opacity-50"
            />
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={sendUserMessage}
                disabled={!draft.trim() || aiLoading}
                className="flex-1 rounded-md bg-black px-2 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-40"
              >
                Enviar
              </button>
            </div>
            <ContextualLink
              href={getContextualUrl('/products')}
              className="block text-center text-[10px] text-blue-700 hover:underline"
            >
              Ver catálogo completo
            </ContextualLink>
          </div>
        </div>
      )}
    </>
  );
}
