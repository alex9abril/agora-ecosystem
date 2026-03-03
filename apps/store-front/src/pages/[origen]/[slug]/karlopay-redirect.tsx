/**
 * Página de redirección después del pago con Karlopay (con contexto de tienda)
 * Esta página recibe al usuario después de completar el pago en Karlopay
 * Soporta rutas como: /grupo/{slug}/karlopay-redirect o /sucursal/{slug}/karlopay-redirect
 */

import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import StoreLayout from '@/components/layout/StoreLayout';
import { useStoreContext } from '@/contexts/StoreContext';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { apiRequest } from '@/lib/api';

export default function KarlopayRedirectPage() {
  const router = useRouter();
  const { session_id, id, status, error } = router.query;
  const { getContextualUrl } = useStoreContext();
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'error' | 'pending'>('pending');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [redirected, setRedirected] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState<string>('');
  const confirmRequestedRef = useRef(false);

  useEffect(() => {
    // Esperar a que el router esté listo
    if (!router.isReady) return;

    // Verificar si hay parámetros de sesión
    if (session_id || id) {
      if (confirmRequestedRef.current) {
        return;
      }
      confirmRequestedRef.current = true;
      const payload = {
        session_id: session_id || null,
        id: id || null,
        status: status || null,
        error: error || null,
      };

      console.log('[KarlopayRedirect] Parámetros recibidos:', payload);

      apiRequest('/payments/karlopay/confirm-redirect', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
        .then((response: any) => {
          const responseStatus = response?.status || 'ok';
          setConfirmMessage(response?.message || 'Confirmación procesada');

          // ok o pending: mostramos "Pedido realizado con éxito" (no implica pago confirmado, solo pedido registrado)
          if (responseStatus === 'ok' || responseStatus === 'pending') {
            setPaymentStatus('success');
          } else {
            setPaymentStatus('error');
            setErrorMessage(response?.message || 'No se pudo confirmar el pago');
          }
        })
        .catch((err: any) => {
          setConfirmMessage(err?.message || 'Error al confirmar el pago');
          setPaymentStatus('error');
          setErrorMessage(err?.message || 'No se pudo confirmar el pago');
        });

      setLoading(false);

      setLoading(false);
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
  }, [session_id, id, status, error, router.isReady, router, getContextualUrl]);

  useEffect(() => {
    if (paymentStatus !== 'success' || redirected) return;

    const timeoutId = setTimeout(() => {
      setRedirected(true);
      const ordersUrl = getContextualUrl('/orders');
      router.replace(ordersUrl).catch((err) => {
        console.error('Error redirigiendo a /orders:', err);
        window.location.href = ordersUrl;
      });
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [paymentStatus, redirected, getContextualUrl, router]);

  const handleGoToOrders = () => {
    setRedirected(true);
    const ordersUrl = getContextualUrl('/orders');
    router.replace(ordersUrl).catch((err) => {
      console.error('Error redirigiendo:', err);
      window.location.href = ordersUrl;
    });
  };

  const handleRetryCheckout = () => {
    const checkoutUrl = getContextualUrl('/checkout');
    router.replace(checkoutUrl).catch(() => {
      window.location.href = checkoutUrl;
    });
  };

  const handleGoToCart = () => {
    const cartUrl = getContextualUrl('/cart');
    router.replace(cartUrl).catch(() => {
      window.location.href = cartUrl;
    });
  };

  return (
    <>
      <Head>
        <title>Pedido realizado - Agora</title>
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
              <h1 className="text-3xl font-bold text-gray-900 mb-3">Pedido realizado con éxito</h1>
              <p className="text-lg text-gray-600 mb-4">
                Tu pedido fue registrado correctamente. El pago se validará con el proveedor; puedes revisar el estado en Mis pedidos.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Redirigiendo a tus pedidos en unos segundos...
              </p>
              <button
                onClick={handleGoToOrders}
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
                  onClick={handleRetryCheckout}
                  className="block w-full px-6 py-3 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors font-medium"
                >
                  Intentar Nuevamente
                </button>
                <button
                  onClick={handleGoToCart}
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


