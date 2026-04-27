import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { SKIP_INTEGRATION_CART_WEBHOOK_KEY } from '../decorators/skip-integration-cart-webhook.decorator';
import * as crypto from 'crypto';
import { WebhookSecretsService } from '../../settings/webhook-secrets.service';
import { dbPool } from '../../../config/database.config';
import { IntegrationCartExecutionLogService } from '../integration-cart-execution-log.service';
import { sanitizeBody, sanitizeQuery, bitacoraRequestMetadata } from '../integration-cart-bitacora.util';

const PROVIDER = 'integration_cart';

function normalizeStoredSecret(s: string): string {
  return s.replace(/\r/g, '').trim();
}

/** Evita fallos por comillas en Postman, \\r del portapapeles o espacios. */
function normalizeProvidedKey(raw: string): string {
  let k = raw.replace(/\r/g, '').trim();
  if (
    (k.startsWith('"') && k.endsWith('"') && k.length >= 2) ||
    (k.startsWith("'") && k.endsWith("'") && k.length >= 2)
  ) {
    k = k.slice(1, -1).trim();
  }
  return k;
}

@Injectable()
export class IntegrationCartWebhookGuard implements CanActivate {
  private readonly logger = new Logger(IntegrationCartWebhookGuard.name);

  constructor(
    private readonly webhookSecretsService: WebhookSecretsService,
    private readonly reflector: Reflector,
    private readonly integrationCartExecutionLog: IntegrationCartExecutionLogService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_INTEGRATION_CART_WEBHOOK_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) {
      return true;
    }

    const started = Date.now();
    const request = context.switchToHttp().getRequest<Request>();
    const pickFirst = (v: string | string[] | undefined): string =>
      typeof v === 'string' ? v : Array.isArray(v) && v[0] ? String(v[0]) : '';

    const authHeader = request.headers.authorization;
    const bearerMatch =
      typeof authHeader === 'string' ? /^Bearer\s+/i.exec(authHeader) : null;
    const fromBearer = bearerMatch ? authHeader!.slice(bearerMatch[0].length) : '';

    const rawKey = pickFirst(request.headers['x-webhook-secret']) || fromBearer;

    const keyFromHeader = normalizeProvidedKey(String(rawKey || ''));
    const fromDb = await this.webhookSecretsService.getActiveSecrets(PROVIDER);
    const envSecret = normalizeStoredSecret(process.env.INTEGRATION_CART_WEBHOOK_SECRET || '');
    const activeSecrets = [...fromDb.map(normalizeStoredSecret), envSecret].filter(
      (s) => s && s.length > 0,
    );

    if (activeSecrets.length === 0) {
      this.logger.warn(
        'integration_cart: 0 secretos activos (BD + env). Revise provider, is_active, expires_at y DATABASE_URL.',
      );
      if (!dbPool) {
        const msg =
          'Carrito de integración: DATABASE_URL no está configurada; el backend no puede leer core.webhook_secrets. Defina DATABASE_URL o use INTEGRATION_CART_WEBHOOK_SECRET en .env';
        await this.logGuardRejection(request, started, msg);
        throw new UnauthorizedException(msg);
      }
      const msg =
        'Carrito de integración: no hay claves activas. En Supabase, tabla core.webhook_secrets: provider = integration_cart (sin espacios extra), is_active = true, expires_at vacío o futuro, y columna secret con el mismo valor que envías en X-Webhook-Secret. Alternativa: variable INTEGRATION_CART_WEBHOOK_SECRET en el servidor.';
      await this.logGuardRejection(request, started, msg);
      throw new UnauthorizedException(msg);
    }

    if (!keyFromHeader) {
      const msg = 'Se requiere X-Webhook-Secret o Authorization: Bearer con una clave válida';
      await this.logGuardRejection(request, started, msg);
      throw new UnauthorizedException(msg);
    }

    const bufA = Buffer.from(keyFromHeader, 'utf8');
    for (const secret of activeSecrets) {
      const s = secret ?? '';
      if (!s) continue;
      const bufB = Buffer.from(s, 'utf8');
      if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
        return true;
      }
    }

    this.logger.warn(
      `integration_cart: clave inválida (longitud enviada: ${keyFromHeader.length}; secretos activos a comparar: ${activeSecrets.length})`,
    );
    const msg =
      'Clave de integración inválida: debe coincidir exactamente con un secreto activo (provider integration_cart en core.webhook_secrets o INTEGRATION_CART_WEBHOOK_SECRET). En Postman no pongas comillas en la variable; use X-Webhook-Secret o Authorization: Bearer <clave>';
    await this.logGuardRejection(request, started, msg);
    throw new UnauthorizedException(msg);
  }

  private async logGuardRejection(request: Request, started: number, errorMessage: string): Promise<void> {
    const pathParams =
      request.params && Object.keys(request.params).length > 0 ? { ...request.params } : null;
    const queryParams =
      request.query && Object.keys(request.query).length > 0
        ? sanitizeQuery(request.query as Record<string, unknown>)
        : null;
    const bodyParams = sanitizeBody(request.body);
    const cartId =
      typeof request.params?.cartId === 'string' && /^[0-9a-f-]{36}$/i.test(request.params.cartId)
        ? request.params.cartId
        : null;
    const storeId =
      bodyParams?.storeId && typeof bodyParams.storeId === 'string' && /^[0-9a-f-]{36}$/i.test(bodyParams.storeId)
        ? (bodyParams.storeId as string)
        : null;

    await this.integrationCartExecutionLog.record({
      httpMethod: request.method,
      path: (request.originalUrl || request.url || '').split('?')[0],
      routePath: (request as Request & { route?: { path?: string } }).route?.path ?? null,
      pathParams,
      queryParams,
      bodyParams,
      statusCode: 401,
      success: false,
      durationMs: Date.now() - started,
      errorName: 'UnauthorizedException',
      errorMessage,
      cartId,
      storeId,
      responseSummary: null,
      metadata: bitacoraRequestMetadata(request, {
        source: 'integration_cart_webhook_guard',
        webhook_key_length: typeof request.headers['x-webhook-secret'] === 'string'
          ? String(request.headers['x-webhook-secret']).length
          : typeof request.headers.authorization === 'string'
            ? Math.max(0, request.headers.authorization.length - 7)
            : 0,
      }),
    });
  }
}
