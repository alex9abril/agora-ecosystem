/**
 * Aterrizaje desde enlace WhatsApp (query t). Muestra resumen y permite iniciar sesión
 * para importar el carrito al usuario y continuar al checkout.
 */

import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { cartService } from '@/lib/cart';
import {
  fetchIntegrationCartSession,
  IntegrationCartSessionPayload,
} from '@/lib/integration-cart-session';
import { formatPrice } from '@/lib/format';

export default function IntegracionCartLandingPage() {
  const router = useRouter();
  const { t } = router.query;
  const token = typeof t === 'string' ? t : null;

  const { isAuthenticated, loading: authLoading } = useAuth();
  const { refreshCart } = useCart();

  const [session, setSession] = useState<IntegrationCartSessionPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady) return;
    if (!token) {
      setLoadingSession(false);
      setLoadError('Falta el enlace de acceso. Abre el carrito desde el mensaje que te enviamos por WhatsApp.');
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingSession(true);
      setLoadError(null);
      try {
        const data = await fetchIntegrationCartSession(token);
        if (!cancelled) setSession(data);
      } catch (e: unknown) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'No se pudo cargar el carrito. El enlace puede haber expirado.');
        }
      } finally {
        if (!cancelled) setLoadingSession(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router.isReady, token]);

  const loginHref = token
    ? `/auth/login?redirect=${encodeURIComponent(`/carrito/integracion?t=${encodeURIComponent(token)}`)}`
    : '/auth/login';

  const handleContinueCheckout = useCallback(async () => {
    if (!token) return;
    setImportError(null);
    setImporting(true);
    try {
      await cartService.importFromIntegration(token);
      await refreshCart();
      await router.push('/checkout');
    } catch (e: unknown) {
      setImportError(e instanceof Error ? e.message : 'No se pudo importar el carrito');
    } finally {
      setImporting(false);
    }
  }, [token, refreshCart, router]);

  return (
    <>
      <Head>
        <title>Continuar compra | Agora</title>
      </Head>
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-lg px-4 py-10">
          <h1 className="text-xl font-semibold text-gray-900">Tu carrito desde WhatsApp</h1>
          <p className="mt-2 text-sm text-gray-600">
            Revisa los productos que armamos contigo y continúa en el sitio para completar tu compra.
          </p>

          {loadingSession || authLoading ? (
            <p className="mt-8 text-sm text-gray-500">Cargando…</p>
          ) : loadError ? (
            <p className="mt-8 text-sm text-red-600">{loadError}</p>
          ) : session ? (
            <>
              <ul className="mt-6 space-y-3 rounded-lg border border-gray-200 bg-white p-4">
                {session.items?.map((row) => {
                  const name = (row.product_name as string) || 'Producto';
                  const qty = Number(row.quantity) || 1;
                  const sub = row.item_subtotal != null ? String(row.item_subtotal) : '0';
                  return (
                    <li key={String(row.id)} className="flex justify-between gap-2 text-sm">
                      <span className="text-gray-800">
                        {name} × {qty}
                      </span>
                      <span className="shrink-0 text-gray-600">{formatPrice(Number(sub))}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 text-right text-sm font-medium text-gray-900">
                Subtotal: {formatPrice(Number(session.subtotal))}
              </p>

              {!isAuthenticated ? (
                <a
                  href={loginHref}
                  className="mt-8 block w-full rounded-lg py-3 text-center text-sm font-semibold text-white bg-black hover:bg-gray-900"
                >
                  Iniciar sesión para continuar
                </a>
              ) : (
                <>
                  {importError ? (
                    <p className="mt-4 text-sm text-red-600">{importError}</p>
                  ) : null}
                  <button
                    type="button"
                    disabled={importing}
                    onClick={handleContinueCheckout}
                    className="mt-8 w-full rounded-lg py-3 text-sm font-semibold text-white bg-black hover:bg-gray-900 disabled:opacity-60"
                  >
                    {importing ? 'Importando…' : 'Continuar al checkout'}
                  </button>
                </>
              )}
            </>
          ) : null}
        </div>
      </main>
    </>
  );
}
