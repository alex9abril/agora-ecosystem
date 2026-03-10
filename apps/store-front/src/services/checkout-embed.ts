/**
 * Servicio de checkout con soporte para contexto embebido (iframe)
 * Maneja la lógica de breakout cuando la tienda está en iframe
 * [AGORA EMBED]
 */

import { isEmbedded, getStoreOrigin } from '@/utils/embed';
import { postOpenTopCheckout, isUrlAllowed } from '@/utils/postMessage';

const LOG_PREFIX = '[AGORA EMBED]';

export interface BeginCheckoutOptions {
  /** URL del checkout standalone (ej: /checkout/session/xxx) */
  checkoutUrl: string;
  /** ID de sesión (order_group_id o token) */
  sessionId: string;
  /** Origen del parent para postMessage (opcional) */
  parentOrigin?: string;
}

export type BeginCheckoutResult =
  | { success: true; method: 'redirect' | 'postMessage' }
  | { success: false; error: string; fallbackUrl?: string };

/** Timeout para esperar respuesta del parent antes de fallback (ms) */
const PARENT_RESPONSE_TIMEOUT = 2000;

/**
 * Inicia el flujo de checkout.
 * - Si NO está embebido: redirige directamente a checkoutUrl
 * - Si está embebido: envía postMessage al parent para que abra en top window
 */
export function beginCheckout(options: BeginCheckoutOptions): BeginCheckoutResult {
  const { checkoutUrl, sessionId, parentOrigin } = options;

  // Construir URL absoluta si es relativa
  const baseUrl = getStoreOrigin();
  const absoluteUrl = checkoutUrl.startsWith('http') ? checkoutUrl : `${baseUrl}${checkoutUrl}`;

  if (!isUrlAllowed(absoluteUrl)) {
    console.error(`${LOG_PREFIX} URL de checkout no permitida:`, absoluteUrl);
    return { success: false, error: 'URL de checkout no válida', fallbackUrl: absoluteUrl };
  }

  if (!isEmbedded()) {
    // No embebido: redirección directa
    try {
      window.location.assign(absoluteUrl);
      return { success: true, method: 'redirect' };
    } catch (err) {
      console.error(`${LOG_PREFIX} Error en redirect:`, err);
      return { success: false, error: 'Error al redirigir', fallbackUrl: absoluteUrl };
    }
  }

  // Embebido: enviar postMessage al parent
  try {
    postOpenTopCheckout(absoluteUrl, sessionId, parentOrigin);
    return { success: true, method: 'postMessage' };
  } catch (err) {
    console.error(`${LOG_PREFIX} Error enviando postMessage:`, err);
    return {
      success: false,
      error: 'No se pudo comunicar con la ventana principal',
      fallbackUrl: absoluteUrl,
    };
  }
}

/**
 * Construye la URL del checkout standalone
 */
export function buildStandaloneCheckoutUrl(sessionId: string): string {
  const base = getStoreOrigin();
  return `${base}/checkout/session/${sessionId}`;
}

/**
 * Construye la URL de retorno de pago
 */
export function buildPaymentReturnUrl(params?: {
  orderGroupId?: string;
  orderId?: string;
  status?: string;
}): string {
  const base = getStoreOrigin();
  const search = new URLSearchParams();
  if (params?.orderGroupId) search.set('orderGroupId', params.orderGroupId);
  if (params?.orderId) search.set('orderId', params.orderId);
  if (params?.status) search.set('status', params.status);
  const qs = search.toString();
  return `${base}/payment/return${qs ? `?${qs}` : ''}`;
}
