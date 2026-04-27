import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';
import { WebhookSecretsService } from '../../modules/settings/webhook-secrets.service';
import { KarlopayPaymentWebhookExecutionLogService } from '../../modules/payments/karlopay/karlopay-payment-webhook-execution-log.service';
import {
  sanitizeKarlopayWebhookBody,
  karlopayWebhookRequestMetadata,
} from '../../modules/payments/karlopay/karlopay-payment-webhook-bitacora.util';

@Injectable()
export class KarlopayWebhookGuard implements CanActivate {
  private readonly logger = new Logger(KarlopayWebhookGuard.name);

  constructor(
    private readonly webhookSecretsService: WebhookSecretsService,
    private readonly karlopayWebhookExecutionLog: KarlopayPaymentWebhookExecutionLogService,
  ) {}
  private readonly rateLimitMap = new Map<string, { count: number; resetAt: number }>();
  private readonly RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minuto
  private readonly RATE_LIMIT_MAX_REQUESTS = 100; // Máximo 100 requests por minuto por IP

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const started = Date.now();
    const request = context.switchToHttp().getRequest<Request>();
    const clientIp = this.extractClientIp(request);

    // Log del intento de acceso
    this.logger.debug(`🔒 Validando webhook de KarloPay desde IP: ${clientIp}`);

    // 1. Validar IP Whitelist
    const allowedIps = await this.getAllowedIps();
    if (allowedIps.length > 0 && !allowedIps.includes(clientIp)) {
      this.logger.warn(`❌ IP no autorizada intentando acceder al webhook: ${clientIp}`);
      const msg = 'IP no autorizada para acceder al webhook';
      await this.logUnauthorizedAccess(request, started, msg, 'IP_NOT_ALLOWED');
      throw new UnauthorizedException(msg);
    }

    // 2. Rate Limiting
    if (!this.checkRateLimit(clientIp)) {
      this.logger.warn(`⚠️ Rate limit excedido para IP: ${clientIp}`);
      const msg = 'Demasiadas solicitudes. Intenta más tarde.';
      await this.logUnauthorizedAccess(request, started, msg, 'RATE_LIMIT_EXCEEDED');
      throw new UnauthorizedException(msg);
    }

    // 3. Validar Webhook Secret: exigir key o firma cuando hay claves activas
    const activeSecrets = await this.getActiveWebhookSecrets();
    if (activeSecrets.length > 0) {
      const isValid = await this.validateWebhookKeyOrSignature(request, activeSecrets);
      if (!isValid) {
        this.logger.warn(`❌ Webhook sin key válida o firma inválida desde IP: ${clientIp}`);
        const msg =
          'Se requiere header X-Webhook-Secret (o Authorization: Bearer <clave>) con una clave de webhook válida, o firma HMAC correcta';
        await this.logUnauthorizedAccess(request, started, msg, 'INVALID_KEY_OR_SIGNATURE');
        throw new UnauthorizedException(msg);
      }
    }

    this.logger.log(`✅ Webhook autorizado desde IP: ${clientIp}`);
    return true;
  }

  /**
   * Extrae la IP real del cliente considerando proxies y load balancers
   */
  private extractClientIp(request: Request): string {
    // Intentar obtener IP desde headers de proxy
    const forwardedFor = request.headers['x-forwarded-for'] as string;
    if (forwardedFor) {
      // X-Forwarded-For puede contener múltiples IPs separadas por coma
      // La primera es generalmente la IP original del cliente
      const ips = forwardedFor.split(',').map(ip => ip.trim());
      return ips[0];
    }

    const realIp = request.headers['x-real-ip'] as string;
    if (realIp) {
      return realIp;
    }

    // Fallback a la IP de la conexión directa
    return request.ip || request.socket.remoteAddress || 'unknown';
  }

  /**
   * Obtiene las IPs permitidas desde configuración
   */
  private async getAllowedIps(): Promise<string[]> {
    try {
      // Primero intentar desde variables de entorno
      const envIps = process.env.KARLOPAY_WEBHOOK_ALLOWED_IPS;
      if (envIps) {
        return envIps.split(',').map(ip => ip.trim()).filter(ip => ip.length > 0);
      }

      // Si no hay en env, intentar desde settings (si está implementado)
      // Por ahora retornamos array vacío si no hay configuración (permite todas las IPs)
      return [];
    } catch (error) {
      this.logger.warn('Error obteniendo IPs permitidas, usando lista vacía:', error);
      return [];
    }
  }

  /**
   * Obtiene todas las claves activas para validar el webhook: BD (karlopay) + env KARLOPAY_WEBHOOK_SECRET.
   */
  private async getActiveWebhookSecrets(): Promise<string[]> {
    try {
      const fromDb = await this.webhookSecretsService.getActiveSecrets('karlopay');
      const envSecret = process.env.KARLOPAY_WEBHOOK_SECRET;
      const combined = [...fromDb];
      if (envSecret && !combined.includes(envSecret)) {
        combined.push(envSecret);
      }
      return combined;
    } catch (error) {
      this.logger.warn('Error obteniendo webhook secrets, omitiendo validación:', error);
      return [];
    }
  }

  /**
   * Valida el webhook: (1) key en header X-Webhook-Secret o Authorization Bearer, o (2) firma HMAC.
   * Acepta cualquiera de las claves activas.
   */
  private async validateWebhookKeyOrSignature(
    request: Request,
    activeSecrets: string[]
  ): Promise<boolean> {
    // 1) Key en header: X-Webhook-Secret o Authorization: Bearer <clave>
    const pickFirst = (v: string | string[] | undefined): string =>
      typeof v === 'string' ? v : Array.isArray(v) && v[0] ? String(v[0]) : '';
    const rawKey =
      pickFirst(request.headers['x-webhook-secret']) ||
      pickFirst(request.headers['x-karlopay-secret']) ||
      (() => {
        const auth = request.headers.authorization;
        if (auth?.startsWith('Bearer ')) return auth.slice(7);
        return '';
      })();
    const keyFromHeader = rawKey.trim();
    if (keyFromHeader) {
      for (const secret of activeSecrets) {
        const s = (secret ?? '').trim();
        if (s.length > 0 && s.length === keyFromHeader.length && crypto.timingSafeEqual(Buffer.from(s, 'utf8'), Buffer.from(keyFromHeader, 'utf8'))) {
          return true;
        }
      }
    }

    // 2) Firma HMAC en header
    const signature =
      (request.headers['x-karlopay-signature'] as string) ||
      (request.headers['x-signature'] as string) ||
      (request.headers['signature'] as string);
    if (signature) {
      const body = JSON.stringify(request.body);
      const normalizedSignature = signature.toLowerCase().trim();
      for (const secret of activeSecrets) {
        const expected = crypto.createHmac('sha256', secret).update(body).digest('hex').toLowerCase();
        if (normalizedSignature.length === expected.length && crypto.timingSafeEqual(Buffer.from(normalizedSignature), Buffer.from(expected))) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Verifica rate limiting por IP
   */
  private checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const record = this.rateLimitMap.get(ip);

    if (!record || now > record.resetAt) {
      // Crear nuevo registro o resetear
      this.rateLimitMap.set(ip, {
        count: 1,
        resetAt: now + this.RATE_LIMIT_WINDOW_MS,
      });
      return true;
    }

    if (record.count >= this.RATE_LIMIT_MAX_REQUESTS) {
      return false;
    }

    // Incrementar contador
    record.count++;
    return true;
  }

  /**
   * Limpia registros de rate limiting expirados (ejecutar periódicamente)
   */
  private cleanupRateLimit(): void {
    const now = Date.now();
    for (const [ip, record] of this.rateLimitMap.entries()) {
      if (now > record.resetAt) {
        this.rateLimitMap.delete(ip);
      }
    }
  }

  /**
   * Registra intentos de acceso no autorizados (consola + bitácora Supabase)
   */
  private async logUnauthorizedAccess(
    request: Request,
    started: number,
    errorMessage: string,
    reasonCode: string,
  ): Promise<void> {
    try {
      this.cleanupRateLimit();
      this.logger.warn(`🚫 Acceso no autorizado al webhook KarloPay — ${reasonCode}`);

      const pathParams =
        request.params && Object.keys(request.params).length > 0 ? { ...request.params } : null;
      const queryParams =
        request.query && Object.keys(request.query).length > 0
          ? ({ ...request.query } as Record<string, unknown>)
          : null;

      await this.karlopayWebhookExecutionLog.record({
        httpMethod: request.method,
        path: (request.originalUrl || request.url || '').split('?')[0],
        routePath: (request as Request & { route?: { path?: string } }).route?.path ?? null,
        pathParams,
        queryParams,
        bodyParams: sanitizeKarlopayWebhookBody(request.body),
        statusCode: 401,
        success: false,
        durationMs: Date.now() - started,
        errorName: 'UnauthorizedException',
        errorMessage,
        cartId: null,
        storeId: null,
        responseSummary: null,
        metadata: karlopayWebhookRequestMetadata(request, {
          source: 'karlopay_webhook_guard',
          rejection_reason: reasonCode,
        }),
      });
    } catch (error) {
      this.logger.error('Error registrando acceso no autorizado:', error);
    }
  }
}

