/**
 * Página de retorno después del pago - standalone, fuera de iframe
 * Consulta el estado real del pago en backend (no confiar solo en query params)
 * [AGORA EMBED]
 */

import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { apiRequest } from '@/lib/api';
import Link from 'next/link';

type PaymentStatus = 'success' | 'pending' | 'failed' | 'cancelled' | 'unknown' | 'loading';

interface PaymentStatusResponse {
  status: string;
  orderId?: string;
  orderGroupId?: string;
  paymentAmount?: number;
  completedAt?: string;
  error?: string;
}

export default function PaymentReturnPage() {
  const router = useRouter();
  const { orderGroupId, orderId, status: queryStatus } = router.query;
  const [status, setStatus] = useState<PaymentStatus>('loading');
  const [details, setDetails] = useState<PaymentStatusResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!router.isReady) return;

    const ref = (orderGroupId || orderId) as string | undefined;
    if (!ref) {
      setStatus('unknown');
      setErrorMessage('No se recibió referencia del pago.');
      return;
    }

    // Consultar estado real en backend
    apiRequest<PaymentStatusResponse>(`/payments/karlopay/status/${ref}`, { method: 'GET' })
      .then((data) => {
        setDetails(data);
        const backendStatus = (data?.status || '').toLowerCase();
        if (backendStatus === 'completed' || backendStatus === 'paid' || backendStatus === 'success') {
          setStatus('success');
        } else if (backendStatus === 'pending') {
          setStatus('pending');
        } else if (backendStatus === 'failed' || backendStatus === 'error' || backendStatus === 'cancelled') {
          setStatus(backendStatus === 'cancelled' ? 'cancelled' : 'failed');
          setErrorMessage(data?.error || 'El pago no pudo completarse.');
        } else {
          // Fallback a query params si backend no tiene info
          const qs = (queryStatus as string)?.toLowerCase();
          if (qs === 'ok' || qs === 'success') setStatus('success');
          else if (qs === 'pending') setStatus('pending');
          else if (qs === 'error' || qs === 'failed') setStatus('failed');
          else setStatus('unknown');
        }
      })
      .catch((err: any) => {
        console.error('[PaymentReturn] Error consultando estado:', err);
        setStatus('unknown');
        setErrorMessage(err?.message || 'No se pudo verificar el estado del pago.');
        // Fallback a query params
        const qs = (queryStatus as string)?.toLowerCase();
        if (qs === 'ok' || qs === 'success') setStatus('success');
        else if (qs === 'pending') setStatus('pending');
      });
  }, [router.isReady, orderGroupId, orderId, queryStatus]);

  return (
    <>
      <Head>
        <title>Resultado del pago - Agora</title>
      </Head>
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-neutral-900 px-4">
        {status === 'loading' && (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-toyota-red mb-4" />
            <h1 className="text-xl font-medium text-gray-900 dark:text-gray-100">
              Verificando estado del pago...
            </h1>
          </div>
        )}

        {status === 'success' && (
          <div className="max-w-md w-full bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-12 h-12 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              ¡Pago completado!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Tu pedido fue registrado correctamente. Puedes revisar el estado en Mis pedidos.
            </p>
            <Link
              href="/orders"
              className="inline-block px-6 py-3 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors font-medium"
            >
              Ver Mis Pedidos
            </Link>
          </div>
        )}

        {status === 'pending' && (
          <div className="max-w-md w-full bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-12 h-12 text-yellow-600 dark:text-yellow-400 animate-pulse"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Pago pendiente
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Tu pago está siendo procesado. Te notificaremos cuando se confirme.
            </p>
            <Link
              href="/orders"
              className="inline-block px-6 py-3 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors font-medium"
            >
              Ver Mis Pedidos
            </Link>
          </div>
        )}

        {(status === 'failed' || status === 'cancelled' || status === 'unknown') && (
          <div className="max-w-md w-full bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-12 h-12 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {status === 'cancelled' ? 'Pago cancelado' : 'Error en el pago'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {errorMessage || 'Hubo un problema al procesar tu pago. Por favor intenta de nuevo.'}
            </p>
            <div className="space-y-3">
              <Link
                href="/checkout"
                className="block w-full px-6 py-3 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors font-medium text-center"
              >
                Intentar nuevamente
              </Link>
              <Link
                href="/cart"
                className="block w-full px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-center"
              >
                Volver al carrito
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
