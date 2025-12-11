/**
 * Página de redirección después del pago con Karlopay
 * Esta página recibe al usuario después de completar el pago en Karlopay
 */

import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import StoreLayout from '@/components/layout/StoreLayout';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { apiRequest } from '@/lib/api';

export default function KarlopayRedirectPage() {
  const router = useRouter();
  const { session_id, id, status, error } = router.query;
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'error' | 'pending'>('pending');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [redirected, setRedirected] = useState(false);

  useEffect(() => {
    // Esperar a que el router esté listo
    if (!router.isReady) return;

    // Verificar si hay parámetros de sesión
    if (session_id || id) {
      // Aquí podrías hacer una llamada al backend para verificar el estado del pago
      // Por ahora, asumimos éxito si hay session_id o id
      setPaymentStatus('success');
      setLoading(false);

      // Redirigir a la página de confirmación después de 3 segundos
      // Solo si no hemos redirigido ya
      if (!redirected) {
        const timeoutId = setTimeout(() => {
          setRedirected(true);
          // Usar replace en lugar de push para evitar problemas de navegación
          router.replace('/orders').catch((err) => {
            console.error('Error redirigiendo a /orders:', err);
          });
        }, 3000);

        return () => clearTimeout(timeoutId);
      }
    } else if (error) {
      setPaymentStatus('error');
      setErrorMessage(error as string);
      setLoading(false);
    } else if (router.isReady) {
      // Solo mostrar error si el router está listo y no hay parámetros
      setPaymentStatus('error');
      setErrorMessage('No se recibió información del pago');
      setLoading(false);
    }
  }, [session_id, id, error, router.isReady, router, redirected]);

  return (
    <>
      <Head>
        <title>Procesando Pago - Agora</title>
      </Head>
      <StoreLayout>
        <div className="max-w-2xl mx-auto py-12 px-4">
          {loading ? (
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-toyota-red mb-4"></div>
              <h1 className="text-2xl font-medium text-gray-900 mb-2">Procesando pago...</h1>
              <p className="text-gray-600">Por favor espera mientras confirmamos tu pago.</p>
            </div>
          ) : paymentStatus === 'success' ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-100 mb-6">
                <CheckCircleIcon className="w-16 h-16 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">¡Pago Exitoso!</h1>
              <p className="text-lg text-gray-600 mb-4">
                Tu pago ha sido procesado correctamente.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Serás redirigido a tus pedidos en unos segundos...
              </p>
              <button
                onClick={() => {
                  setRedirected(true);
                  router.replace('/orders').catch((err) => {
                    console.error('Error redirigiendo:', err);
                    window.location.href = '/orders';
                  });
                }}
                className="px-6 py-3 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors font-medium"
              >
                Ver Mis Pedidos
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-100 mb-6">
                <ErrorIcon className="w-16 h-16 text-red-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">Error en el Pago</h1>
              <p className="text-lg text-gray-600 mb-4">
                {errorMessage || 'Hubo un problema al procesar tu pago.'}
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    router.replace('/checkout').catch(() => {
                      window.location.href = '/checkout';
                    });
                  }}
                  className="block w-full px-6 py-3 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors font-medium"
                >
                  Intentar Nuevamente
                </button>
                <button
                  onClick={() => {
                    router.replace('/cart').catch(() => {
                      window.location.href = '/cart';
                    });
                  }}
                  className="block w-full px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Volver al Carrito
                </button>
              </div>
            </div>
          )}
        </div>
      </StoreLayout>
    </>
  );
}

