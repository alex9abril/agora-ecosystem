import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';
import { WebhookSecretsService } from '../../settings/webhook-secrets.service';

const PROVIDER = 'integration_cart';

@Injectable()
export class IntegrationCartWebhookGuard implements CanActivate {
  private readonly logger = new Logger(IntegrationCartWebhookGuard.name);

  constructor(private readonly webhookSecretsService: WebhookSecretsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const pickFirst = (v: string | string[] | undefined): string =>
      typeof v === 'string' ? v : Array.isArray(v) && v[0] ? String(v[0]) : '';

    const rawKey =
      pickFirst(request.headers['x-webhook-secret']) ||
      (() => {
        const auth = request.headers.authorization;
        if (auth?.startsWith('Bearer ')) return auth.slice(7);
        return '';
      })();

    const keyFromHeader = rawKey.trim();
    const fromDb = await this.webhookSecretsService.getActiveSecrets(PROVIDER);
    const envSecret = process.env.INTEGRATION_CART_WEBHOOK_SECRET?.trim();
    const activeSecrets = [...fromDb, envSecret].filter((s) => s && String(s).length > 0);

    if (activeSecrets.length === 0) {
      this.logger.warn('integration_cart: no hay secretos configurados (BD provider integration_cart ni INTEGRATION_CART_WEBHOOK_SECRET)');
      throw new UnauthorizedException(
        'Carrito de integración no configurado: defina claves en core.webhook_secrets (provider integration_cart) o INTEGRATION_CART_WEBHOOK_SECRET',
      );
    }

    if (!keyFromHeader) {
      throw new UnauthorizedException(
        'Se requiere X-Webhook-Secret o Authorization: Bearer con una clave válida',
      );
    }

    const bufA = Buffer.from(keyFromHeader, 'utf8');
    for (const secret of activeSecrets) {
      const s = (secret ?? '').trim();
      if (!s) continue;
      const bufB = Buffer.from(s, 'utf8');
      if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
        return true;
      }
    }

    this.logger.warn('integration_cart: clave inválida');
    throw new UnauthorizedException('Clave de integración inválida');
  }
}
