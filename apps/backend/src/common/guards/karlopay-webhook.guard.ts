import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class KarlopayWebhookGuard implements CanActivate {
  private readonly logger = new Logger(KarlopayWebhookGuard.name);
  private readonly rateLimitMap = new Map<string, { count: number; resetAt: number }>();
  private readonly RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minuto
  private readonly RATE_LIMIT_MAX_REQUESTS = 100; // Máximo 100 requests por minuto por IP

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const clientIp = this.extractClientIp(request);

    // Log del intento de acceso
    this.logger.debug(`🔒 Validando webhook de KarloPay desde IP: ${clientIp}`);

    // 1. Validar IP Whitelist
    const allowedIps = await this.getAllowedIps();
    if (allowedIps.length > 0 && !allowedIps.includes(clientIp)) {
      this.logger.warn(`❌ IP no autorizada intentando acceder al webhook: ${clientIp}`);
      await this.logUnauthorizedAccess(clientIp, 'IP_NOT_ALLOWED');
      throw new UnauthorizedException('IP no autorizada para acceder al webhook');
    }

    // 2. Rate Limiting
    if (!this.checkRateLimit(clientIp)) {
      this.logger.warn(`⚠️ Rate limit excedido para IP: ${clientIp}`);
      await this.logUnauthorizedAccess(clientIp, 'RATE_LIMIT_EXCEEDED');
      throw new UnauthorizedException('Demasiadas solicitudes. Intenta más tarde.');
    }

    // 3. Validar Webhook Secret (si está configurado)
    const webhookSecret = await this.getWebhookSecret();
    if (webhookSecret) {
      const isValid = await this.validateWebhookSignature(request, webhookSecret);
      if (!isValid) {
        this.logger.warn(`❌ Firma de webhook inválida desde IP: ${clientIp}`);
        await this.logUnauthorizedAccess(clientIp, 'INVALID_SIGNATURE');
        throw new UnauthorizedException('Firma de webhook inválida');
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
   * Obtiene el webhook secret desde configuración
   */
  private async getWebhookSecret(): Promise<string | null> {
    try {
      // Primero intentar desde variables de entorno
      const envSecret = process.env.KARLOPAY_WEBHOOK_SECRET;
      if (envSecret) {
        return envSecret;
      }

      // Si no hay en env, intentar desde settings (si está implementado)
      // Por ahora retornamos null si no hay configuración (no valida firma)
      return null;
    } catch (error) {
      this.logger.warn('Error obteniendo webhook secret, omitiendo validación de firma:', error);
      return null;
    }
  }

  /**
   * Valida la firma del webhook
   * Nota: La implementación depende de cómo KarloPay firme los webhooks
   * Por ahora, si hay un secret configurado, validamos un header X-Signature o similar
   */
  private async validateWebhookSignature(
    request: Request,
    secret: string
  ): Promise<boolean> {
    try {
      // Intentar obtener la firma desde headers comunes
      const signature = 
        (request.headers['x-karlopay-signature'] as string) ||
        (request.headers['x-signature'] as string) ||
        (request.headers['signature'] as string);

      if (!signature) {
        this.logger.warn('No se encontró header de firma en el webhook');
        return false;
      }

      // Obtener el body como string para calcular el hash
      // Nota: Si necesitas el raw body (sin parsear), necesitarías configurar rawBody: true en main.ts
      // Por ahora usamos el body parseado
      const body = JSON.stringify(request.body);
      
      // Calcular HMAC SHA256 (método común para firmar webhooks)
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');

      // Normalizar firmas (pueden venir en diferentes formatos)
      const normalizedSignature = signature.toLowerCase().trim();
      const normalizedExpected = expectedSignature.toLowerCase().trim();

      // Comparar firmas de forma segura (timing-safe)
      // Si las firmas tienen diferente longitud, timingSafeEqual lanzará error
      if (normalizedSignature.length !== normalizedExpected.length) {
        return false;
      }

      const isValid = crypto.timingSafeEqual(
        Buffer.from(normalizedSignature),
        Buffer.from(normalizedExpected)
      );

      return isValid;
    } catch (error) {
      this.logger.error('Error validando firma del webhook:', error);
      return false;
    }
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
   * Registra intentos de acceso no autorizados
   */
  private async logUnauthorizedAccess(ip: string, reason: string): Promise<void> {
    try {
      // Limpiar rate limit expirado antes de registrar
      this.cleanupRateLimit();

      // Intentar registrar en integration_logs si está disponible
      // Por ahora solo logueamos en consola
      this.logger.warn(`🚫 Acceso no autorizado al webhook - IP: ${ip}, Razón: ${reason}`);
    } catch (error) {
      // No fallar si no se puede registrar el log
      this.logger.error('Error registrando acceso no autorizado:', error);
    }
  }
}

