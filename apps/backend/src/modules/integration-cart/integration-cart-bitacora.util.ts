import { Request } from 'express';

export function maskPhone(phone: string): string {
  const t = phone.trim();
  if (t.length <= 4) return '***';
  return `***${t.slice(-4)}`;
}

export function sanitizeBody(body: unknown): Record<string, unknown> | null {
  if (body === null || body === undefined) {
    return null;
  }
  if (typeof body !== 'object' || Array.isArray(body)) {
    return { _raw: typeof body };
  }
  const o = { ...(body as Record<string, unknown>) };
  if (typeof o.phone === 'string') {
    o.phone = maskPhone(o.phone);
  }
  return o;
}

export function sanitizeQuery(query: Record<string, unknown>): Record<string, unknown> {
  const q = { ...query };
  if (typeof q.t === 'string' && q.t.length > 0) {
    q.t = '[redacted]';
  }
  return q;
}

export function clientIp(req: Request): string | null {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.trim()) {
    return xf.split(',')[0].trim();
  }
  if (Array.isArray(xf) && xf[0]) {
    return xf[0].split(',')[0].trim();
  }
  const cf = req.headers['cf-connecting-ip'];
  if (typeof cf === 'string') {
    return cf;
  }
  return req.socket?.remoteAddress ?? null;
}

export function bitacoraRequestMetadata(
  request: Request,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ip: clientIp(request),
    user_agent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
    forwarded_for: request.headers['x-forwarded-for'] ?? null,
    referer: request.headers.referer ?? null,
    origin: request.headers.origin ?? null,
    host: request.headers.host ?? null,
    has_x_webhook_secret: !!request.headers['x-webhook-secret'],
    has_authorization_bearer:
      typeof request.headers.authorization === 'string' &&
      request.headers.authorization.toLowerCase().startsWith('bearer '),
    ...extra,
  };
}
