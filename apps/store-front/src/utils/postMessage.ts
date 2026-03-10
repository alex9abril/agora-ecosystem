/**
 * Mensajería segura entre iframe (tienda) y ventana padre
 * [AGORA EMBED] - Contrato de mensajes
 */

const LOG_PREFIX = '[AGORA EMBED]';

// =============================================================================
// TIPOS DE MENSAJES (contrato iframe <-> parent)
// =============================================================================

export const AGORA_MESSAGE_TYPES = {
  /** Pedir al parent que abra checkout en top window */
  OPEN_TOP_CHECKOUT: 'AGORA_OPEN_TOP_CHECKOUT',
  /** Resize del iframe (futuro) */
  RESIZE_IFRAME: 'AGORA_RESIZE_IFRAME',
  /** Ping para verificar comunicación */
  PING: 'AGORA_PING',
  /** Respuesta al ping */
  PONG: 'AGORA_PONG',
} as const;

export type AgoraMessageType = (typeof AGORA_MESSAGE_TYPES)[keyof typeof AGORA_MESSAGE_TYPES];

// =============================================================================
// PAYLOADS
// =============================================================================

export interface AgoraOpenTopCheckoutPayload {
  url: string;
  source: 'agora-store';
  sessionId: string;
  timestamp?: number;
}

export interface AgoraResizeIframePayload {
  height: number;
  width?: number;
}

export interface AgoraMessageBase {
  type: AgoraMessageType;
  payload?: Record<string, unknown>;
}

export interface AgoraOpenTopCheckoutMessage extends AgoraMessageBase {
  type: 'AGORA_OPEN_TOP_CHECKOUT';
  payload: AgoraOpenTopCheckoutPayload;
}

export type AgoraMessage = AgoraOpenTopCheckoutMessage | AgoraMessageBase;

// =============================================================================
// CONFIGURACIÓN
// =============================================================================

/** Orígenes permitidos para enviar postMessage al parent */
export const DEFAULT_ALLOWED_PARENT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'https://agoramp.mx',
  'https://www.agoramp.mx',
  'https://staging.agoramp.mx',
  'https://store.agoramp.mx',
  'https://staging-store.agoramp.mx',
];

/** Hosts permitidos para URLs de redirección (checkout standalone) */
export const DEFAULT_ALLOWED_REDIRECT_HOSTS = [
  'localhost',
  '127.0.0.1',
  'agoramp.mx',
  'www.agoramp.mx',
  'staging.agoramp.mx',
  'store.agoramp.mx',
  'staging-store.agoramp.mx',
];

/**
 * Valida que una URL sea segura y pertenezca a hosts permitidos
 */
export function isUrlAllowed(
  url: string,
  allowedHosts: string[] = DEFAULT_ALLOWED_REDIRECT_HOSTS
): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return allowedHosts.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

/**
 * Envía postMessage al parent de forma segura.
 * @param message Mensaje a enviar
 * @param targetOrigin Origen del parent. Si no se pasa, se infiere de document.referrer
 * @param allowedOrigins Si se pasa targetOrigin, se valida contra esta lista (opcional)
 */
export function safePostMessage(
  message: AgoraMessage,
  targetOrigin?: string,
  allowedOrigins?: string[]
): void {
  if (typeof window === 'undefined') return;
  if (window.self === window.top) {
    console.warn(`${LOG_PREFIX} safePostMessage: no hay parent (no estamos en iframe)`);
    return;
  }

  let finalOrigin: string;
  if (targetOrigin) {
    finalOrigin = targetOrigin;
    if (allowedOrigins?.length && !allowedOrigins.includes(targetOrigin)) {
      console.warn(`${LOG_PREFIX} targetOrigin no está en whitelist:`, targetOrigin);
    }
  } else if (document.referrer) {
    try {
      finalOrigin = new URL(document.referrer).origin;
    } catch {
      finalOrigin = '*';
      console.warn(`${LOG_PREFIX} No se pudo parsear referrer, usando '*'`);
    }
  } else {
    finalOrigin = '*';
    console.warn(`${LOG_PREFIX} Sin referrer, usando targetOrigin '*' - configurar en producción`);
  }

  try {
    window.parent.postMessage(message, finalOrigin);
    console.debug(`${LOG_PREFIX} postMessage enviado:`, message.type);
  } catch (err) {
    console.error(`${LOG_PREFIX} Error enviando postMessage:`, err);
    throw err;
  }
}

/**
 * Envía mensaje AGORA_OPEN_TOP_CHECKOUT al parent
 */
export function postOpenTopCheckout(
  checkoutUrl: string,
  sessionId: string,
  targetOrigin?: string
): void {
  if (!isUrlAllowed(checkoutUrl)) {
    console.error(`${LOG_PREFIX} URL de checkout no permitida:`, checkoutUrl);
    throw new Error('URL de checkout no está en la lista de hosts permitidos');
  }

  safePostMessage(
    {
      type: AGORA_MESSAGE_TYPES.OPEN_TOP_CHECKOUT,
      payload: {
        url: checkoutUrl,
        source: 'agora-store',
        sessionId,
        timestamp: Date.now(),
      },
    } as AgoraOpenTopCheckoutMessage,
    targetOrigin
  );
}
