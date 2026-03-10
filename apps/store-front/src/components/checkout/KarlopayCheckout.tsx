/**
 * KarlopayCheckout - Contenedor que decide entre redirect y embedded según configuración de sucursal.
 * - redirect: redirige a Karlopay (hosted externo)
 * - embedded: intenta cargar widget; si Karlopay no ofrece SDK, hace fallback a redirect.
 * PCI-safe: nunca capturamos PAN/CVV; solo usamos SDK/widget oficial del proveedor.
 */

import React, { useEffect, useRef, useState } from 'react';
import { apiRequest } from '@/lib/api';

export type KarlopayMode = 'redirect' | 'embedded';

export interface KarlopayCheckoutProps {
  mode: KarlopayMode;
  paymentUrl: string;
  orderGroupId: string;
  numberOfOrder: string;
  businessId?: string;
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

export function KarlopayCheckout({
  mode,
  paymentUrl,
  orderGroupId,
  numberOfOrder,
  businessId,
  onSuccess,
  onError,
}: KarlopayCheckoutProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'redirecting' | 'embedded' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const initAttemptedRef = useRef(false);

  const ensureHttps = (url: string) => {
    if (!url) return url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  };

  const doRedirect = (url: string) => {
    const finalUrl = ensureHttps(url);
    setStatus('redirecting');
    window.location.href = finalUrl;
  };

  useEffect(() => {
    if (initAttemptedRef.current) return;
    initAttemptedRef.current = true;

    if (mode === 'redirect') {
      doRedirect(paymentUrl);
      return;
    }

    // mode === 'embedded': intentar init, fallback a redirect
    setStatus('loading');
    apiRequest<{
      success: boolean;
      fallbackToRedirect?: boolean;
      redirectUrl?: string;
      embeddedConfig?: Record<string, unknown>;
      error?: string;
    }>('/payments/karlopay/embedded/init', {
      method: 'POST',
      body: JSON.stringify({
        orderGroupId,
        numberOfOrder,
        businessId: businessId || undefined,
      }),
    })
      .then((res) => {
        if (res.success && res.embeddedConfig) {
          // TODO: KarlopayEmbeddedProviderAdapter - cuando Karlopay exponga SDK oficial:
          // Cargar script, montar widget en contenedor, escuchar eventos.
          // Por ahora no hay SDK, nunca llegamos aquí.
          setStatus('embedded');
          onSuccess?.();
          return;
        }
        if (res.fallbackToRedirect && (res.redirectUrl || paymentUrl)) {
          // Pausa breve para que el usuario vea el overlay antes de redirigir
          setStatus('redirecting');
          setTimeout(() => {
            doRedirect(res.redirectUrl || paymentUrl);
          }, 1500);
          return;
        }
        setStatus('error');
        setErrorMessage(res.error || 'No se pudo inicializar el pago');
        onError?.(res.error || 'Error');
      })
      .catch((err: any) => {
        setStatus('error');
        const msg = err?.message || 'Error al conectar con el servidor de pagos';
        setErrorMessage(msg);
        onError?.(msg);
        // Fallback: redirigir si tenemos URL
        if (paymentUrl) {
          doRedirect(paymentUrl);
        }
      });
  }, [mode, paymentUrl, orderGroupId, numberOfOrder, businessId, onSuccess, onError]);

  if (status === 'redirecting' || status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-toyota-red mb-4" />
        <p className="text-gray-600 text-center">
          {status === 'redirecting' ? 'Redirigiendo a la pasarela de pago...' : 'Iniciando pago seguro...'}
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-800 text-sm">{errorMessage}</p>
        {paymentUrl && (
          <button
            type="button"
            onClick={() => doRedirect(paymentUrl)}
            className="mt-3 px-4 py-2 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors text-sm font-medium"
          >
            Pagar en ventana externa
          </button>
        )}
      </div>
    );
  }

  // embedded: contenedor para widget (cuando Karlopay lo provea)
  if (status === 'embedded') {
    return (
      <div
        id="karlopay-embedded-container"
        className="min-h-[200px] rounded-lg border border-gray-200 bg-gray-50 p-4"
        data-order-group-id={orderGroupId}
        data-number-of-order={numberOfOrder}
      >
        {/* TODO: Karlopay SDK montará aquí hosted fields/iframe cuando esté disponible */}
        <p className="text-gray-500 text-sm text-center py-8">
          Widget de pago embebido (no disponible aún)
        </p>
      </div>
    );
  }

  return null;
}
