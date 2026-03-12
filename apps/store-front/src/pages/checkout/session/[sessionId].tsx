/**
 * Página standalone de checkout - NO debe ejecutarse dentro de iframe
 * Carga la sesión desde backend y redirige a KarloPay para pago
 * [AGORA EMBED]
 */

import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { apiRequest } from '@/lib/api';
import { isEmbedded, tryBreakoutFromIframe } from '@/utils/embed';

const LOG_PREFIX = '[AGORA EMBED]';

export default function CheckoutSessionPage() {
  const router = useRouter();
  const { sessionId } = router.query;
  const [status, setStatus] = useState<'loading' | 'redirecting' | 'error' | 'breakout'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!router.isReady || !sessionId || typeof sessionId !== 'string') return;

    // Si estamos en iframe, intentar escapar primero
    if (isEmbedded()) {
      const escaped = tryBreakoutFromIframe();
      if (escaped) {
        setStatus('breakout');
        return;
      }
      // No se pudo escapar (cross-origin): mostrar botón para abrir en nueva ventana
      setStatus('error');
      setErrorMessage('Para completar el pago de forma segura, abre esta página en una nueva ventana.');
      return;
    }

    // Estamos en top window: obtener sesión y redirigir
    setStatus('loading');
    apiRequest<{ paymentUrl: string; orderGroupId: string; storeContext?: string | null }>(
      `/orders/checkout-session/${sessionId}`,
      { method: 'GET' }
    )
      .then((session) => {
        if (!session?.paymentUrl) {
          setStatus('error');
          setErrorMessage('Sesión no válida o expirada.');
          return;
        }
        setStatus('redirecting');
        const url = session.paymentUrl.startsWith('http')
          ? session.paymentUrl
          : `https://${session.paymentUrl}`;
        // Usar window.top para asegurar que KarloPay cargue en top window, no en iframe.
        // Evita: "Blocked a frame with origin landing-staging.karlopay.com from accessing cross-origin frame"
        try {
          (window.top ?? window).location.href = url;
        } catch {
          window.location.href = url;
        }
      })
      .catch((err: any) => {
        console.error(`${LOG_PREFIX} Error obteniendo sesión:`, err);
        setStatus('error');
        setErrorMessage(err?.message || 'No se pudo cargar la sesión de pago.');
      });
  }, [router.isReady, sessionId]);

  const handleOpenInNewTab = () => {
    if (typeof sessionId !== 'string') return;
    const url = `${window.location.origin}/checkout/session/${sessionId}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <Head>
        <title>Pago seguro - Agora</title>
      </Head>
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-neutral-900 px-4">
        {status === 'loading' && (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-toyota-red mb-4" />
            <h1 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">
              Cargando pago seguro...
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Te redirigiremos a la pasarela de pago en un momento.
            </p>
          </div>
        )}

        {status === 'redirecting' && (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-toyota-red mb-4" />
            <h1 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">
              Redirigiendo a la pasarela de pago...
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              No cierres esta ventana.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="max-w-md w-full bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Error al cargar el pago
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{errorMessage}</p>
            {typeof sessionId === 'string' && (
              <button
                type="button"
                onClick={handleOpenInNewTab}
                className="px-6 py-3 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors font-medium"
              >
                Abrir pago seguro en nueva ventana
              </button>
            )}
            <a
              href="/"
              className="block mt-4 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Volver al inicio
            </a>
          </div>
        )}

        {status === 'breakout' && (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-toyota-red mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              Redirigiendo para completar el pago...
            </p>
          </div>
        )}
      </div>
    </>
  );
}
