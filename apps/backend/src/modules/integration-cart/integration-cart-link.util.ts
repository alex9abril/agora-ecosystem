import * as crypto from 'crypto';

export const INTEGRATION_CART_LINK_TOKEN_V = 1 as const;

export interface IntegrationCartLinkPayload {
  v: typeof INTEGRATION_CART_LINK_TOKEN_V;
  cartId: string;
  exp: number;
}

export function signIntegrationCartLinkToken(payload: IntegrationCartLinkPayload, secret: string): string {
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

/**
 * Valida firma y expiración del token. No comprueba si el carrito sigue existiendo en BD.
 */
export function verifyIntegrationCartLinkToken(
  token: string,
  secret: string,
): IntegrationCartLinkPayload | null {
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!payloadB64 || !sig) return null;
  const expected = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const raw = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw) as IntegrationCartLinkPayload;
    if (
      parsed.v !== INTEGRATION_CART_LINK_TOKEN_V ||
      typeof parsed.cartId !== 'string' ||
      typeof parsed.exp !== 'number'
    ) {
      return null;
    }
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}
