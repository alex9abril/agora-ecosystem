/**
 * Importa carrito de integración cuando la URL trae ?t= (enlace firmado).
 * Autenticado: POST /api/cart/import-integration. Invitado: hidrata guest cart desde GET /integrations/cart/session.
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { cartService } from '@/lib/cart';
import { fetchIntegrationCartSession } from '@/lib/integration-cart-session';

const SESSION_DONE_PREFIX = 'agora_icart_import_done_';

function sessionKey(token: string) {
  return `${SESSION_DONE_PREFIX}${token}`;
}

function parseVariantSelections(raw: unknown): Record<string, string | string[]> | undefined {
  if (raw == null) return undefined;
  if (typeof raw === 'string') {
    try {
      const o = JSON.parse(raw) as Record<string, string | string[]>;
      return Object.keys(o).length ? o : undefined;
    } catch {
      return undefined;
    }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, string | string[]>;
    return Object.keys(o).length ? o : undefined;
  }
  return undefined;
}

export function useIntegrationCartTokenImport() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { refreshCart, clearCart, addItem } = useCart();
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const cartOpRef = useRef({ refreshCart, clearCart, addItem });
  cartOpRef.current = { refreshCart, clearCart, addItem };

  const tParam = router.query.t;
  const token =
    typeof tParam === 'string'
      ? tParam.trim()
      : Array.isArray(tParam)
        ? tParam[0]?.trim() ?? ''
        : '';

  useEffect(() => {
    if (!router.isReady || authLoading) {
      return;
    }

    if (!token) {
      setImporting(false);
      return;
    }

    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(sessionKey(token)) === '1') {
      setImporting(false);
      const q = { ...router.query };
      delete q.t;
      void router.replace({ pathname: router.pathname, query: q }, undefined, { shallow: true });
      return;
    }

    let cancelled = false;

    void (async () => {
      setImporting(true);
      setImportError(null);
      const { refreshCart: rc, clearCart: cc, addItem: ai } = cartOpRef.current;
      try {
        if (isAuthenticated) {
          await cartService.importFromIntegration(token);
          await rc();
        } else {
          await cc();
          const session = await fetchIntegrationCartSession(token);
          const items = session.items ?? [];
          if (!Array.isArray(items) || items.length === 0) {
            throw new Error('El carrito de integración está vacío');
          }
          for (const row of items as Record<string, unknown>[]) {
            const productId = String(row.product_id ?? '');
            const quantity = Number(row.quantity);
            const branchId = row.branch_id != null ? String(row.branch_id) : undefined;
            const specialInstructions =
              row.special_instructions != null ? String(row.special_instructions) : undefined;
            const variantSelections = parseVariantSelections(row.variant_selections);
            if (!productId || !Number.isFinite(quantity) || quantity < 1) {
              throw new Error('Línea de carrito de integración inválida');
            }
            const businessId = branchId;
            await ai(
              productId,
              Math.floor(quantity),
              variantSelections,
              specialInstructions || undefined,
              branchId,
              businessId,
            );
          }
        }
        if (!cancelled && typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(sessionKey(token), '1');
        }
        if (!cancelled) {
          const q = { ...router.query };
          delete q.t;
          await router.replace({ pathname: router.pathname, query: q }, undefined, { shallow: true });
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setImportError(e instanceof Error ? e.message : 'No se pudo importar el carrito');
        }
      } finally {
        if (!cancelled) {
          setImporting(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // router.replace es estable; token evita re-ejecución por el mismo enlace
  }, [router.isReady, router.pathname, authLoading, token, isAuthenticated]);

  return { integrationImporting: importing, integrationImportError: importError };
}
