import { Request } from 'express';

const SENSITIVE_KEYS = new Set([
  'card',
  'cardnumber',
  'card_number',
  'cvv',
  'cvc',
  'password',
  'token',
  'authorization',
  'pan',
]);

export function sanitizeKarlopayWebhookBody(body: unknown, maxDepth = 2, depth = 0): Record<string, unknown> | null {
  if (body === null || body === undefined) {
    return null;
  }
  if (typeof body !== 'object' || Array.isArray(body)) {
    return { _type: typeof body };
  }
  if (depth >= maxDepth) {
    return { _truncated: 'max_depth' };
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    const keyLower = k.toLowerCase().replace(/[-_]/g, '');
    if (SENSITIVE_KEYS.has(keyLower) || keyLower.includes('card')) {
      out[k] = '[redacted]';
      continue;
    }
    if (typeof v === 'string') {
      if (k.toLowerCase().includes('email') && v.includes('@')) {
        const [u, d] = v.split('@');
        out[k] = u.length > 1 ? `${u[0]}***@${d}` : `***@${d}`;
      } else {
        out[k] = v.length > 800 ? `${v.slice(0, 800)}…` : v;
      }
    } else if (typeof v === 'number' || typeof v === 'boolean') {
      out[k] = v;
    } else if (v === null) {
      out[k] = null;
    } else if (Array.isArray(v)) {
      out[k] = { length: v.length, preview: v.slice(0, 3) };
    } else if (typeof v === 'object') {
      out[k] = sanitizeKarlopayWebhookBody(v, maxDepth, depth + 1);
    } else {
      out[k] = String(v).slice(0, 200);
    }
  }
  return out;
}

export function karlopayWebhookRequestMetadata(
  request: Request,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  const xf = request.headers['x-forwarded-for'];
  const ip =
    typeof xf === 'string'
      ? xf.split(',')[0].trim()
      : Array.isArray(xf) && xf[0]
        ? String(xf[0]).split(',')[0].trim()
        : (request.headers['cf-connecting-ip'] as string) || request.socket?.remoteAddress || null;

  return {
    ip,
    user_agent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
    forwarded_for: request.headers['x-forwarded-for'] ?? null,
    referer: request.headers.referer ?? null,
    host: request.headers.host ?? null,
    has_x_webhook_secret: !!request.headers['x-webhook-secret'],
    has_x_karlopay_signature: !!(
      request.headers['x-karlopay-signature'] || request.headers['x-signature'] || request.headers['signature']
    ),
    has_authorization_bearer:
      typeof request.headers.authorization === 'string' &&
      request.headers.authorization.toLowerCase().startsWith('bearer '),
    ...extra,
  };
}
