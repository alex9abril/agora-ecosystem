import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';
import { BusinessesService } from './businesses.service';
import { IntegrationLogsService, IntegrationLogStatus } from '../settings/integration-logs.service';

type KarbotWhatsAppPayload = {
  businessId: string;
  triggerType: 'user_registration' | 'order_confirmation' | 'order_status_change';
  to: string;
  data: Record<string, any>;
  userId?: string;
  orderId?: string;
};

@Injectable()
export class KarbotService {
  private readonly logger = new Logger(KarbotService.name);
  private tokenCache: Map<string, { token: string; expiresAt: number }> = new Map();
  private readonly TOKEN_CACHE_TTL = 55 * 60 * 1000;

  constructor(
    private readonly businessesService: BusinessesService,
    private readonly integrationLogs: IntegrationLogsService,
  ) {}

  async sendWhatsappNotification(payload: KarbotWhatsAppPayload): Promise<IntegrationLogStatus> {
    try {
      const { karbot } = await this.businessesService.getBusinessKarbotSettings(payload.businessId);

      const karbotEnabled = !!karbot?.enabled;
      const whatsappEnabled = !!karbot?.whatsapp_enabled;
      const environment = karbot?.environment || 'dev';

      if (!karbotEnabled || !whatsappEnabled) {
        this.logger.debug('[Karbot] Log skipped: karbot/whatsapp deshabilitado');
        await this.integrationLogs.log({
          integration: 'karbot',
          eventType: payload.triggerType,
          channel: 'whatsapp',
          status: 'skipped',
          businessId: payload.businessId,
          userId: payload.userId,
          orderId: payload.orderId,
          message: 'Karbot deshabilitado para WhatsApp',
          requestPayload: {
            to: payload.to,
            karbotEnabled,
            whatsappEnabled,
            environment,
          },
        });
        return 'skipped';
      }

      const envConfig = environment === 'prod' ? karbot.prod : karbot.dev;
      const rawEndpoint = (envConfig?.endpoint || '').trim();
      const endpoint = rawEndpoint
        ? rawEndpoint.startsWith('http://') || rawEndpoint.startsWith('https://')
          ? rawEndpoint
          : `https://${rawEndpoint}`
        : '';

      if (!endpoint) {
        this.logger.warn('Karbot endpoint no configurado, se omite WhatsApp.');
        this.logger.debug('[Karbot] Log skipped: endpoint no configurado');
        await this.integrationLogs.log({
          integration: 'karbot',
          eventType: payload.triggerType,
          channel: 'whatsapp',
          status: 'skipped',
          businessId: payload.businessId,
          userId: payload.userId,
          orderId: payload.orderId,
          message: 'Endpoint Karbot no configurado',
          requestPayload: {
            to: payload.to,
            environment,
            endpoint: rawEndpoint || null,
          },
        });
        return 'skipped';
      }

      const templateId = envConfig?.template_ids?.[payload.triggerType];
      if (!templateId) {
        await this.integrationLogs.log({
          integration: 'karbot',
          eventType: payload.triggerType,
          channel: 'whatsapp',
          status: 'skipped',
          businessId: payload.businessId,
          userId: payload.userId,
          orderId: payload.orderId,
          message: 'TemplateId no configurado para el trigger',
          requestPayload: { trigger_type: payload.triggerType, environment },
        });
        return 'skipped';
      }

      const email = envConfig?.username || '';
      const password = envConfig?.password || '';
      if (!email || !password) {
        await this.integrationLogs.log({
          integration: 'karbot',
          eventType: payload.triggerType,
          channel: 'whatsapp',
          status: 'skipped',
          businessId: payload.businessId,
          userId: payload.userId,
          orderId: payload.orderId,
          message: 'Credenciales Karbot incompletas',
          requestPayload: { environment },
        });
        return 'skipped';
      }

      const authToken = await this.getAuthToken(endpoint, email, password);
      if (!authToken) {
        await this.integrationLogs.log({
          integration: 'karbot',
          eventType: payload.triggerType,
          channel: 'whatsapp',
          status: 'failed',
          businessId: payload.businessId,
          userId: payload.userId,
          orderId: payload.orderId,
          message: 'No se pudo autenticar en Karbot',
          requestPayload: { environment },
        });
        return 'failed';
      }

      const requestBody: Record<string, any> = {
        countryCode: payload.data?.countryCode || '52',
        to: payload.to,
        templateId,
      };
      if (Array.isArray(payload.data?.variables)) {
        requestBody.variables = payload.data.variables;
      }

      const requestConfig: AxiosRequestConfig = {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      };

      const response = await axios.post(`${endpoint.replace(/\/$/, '')}/v1/messages/send-template`, requestBody, requestConfig);

      await this.integrationLogs.log({
        integration: 'karbot',
        eventType: payload.triggerType,
        channel: 'whatsapp',
        status: 'success',
        businessId: payload.businessId,
        userId: payload.userId,
        orderId: payload.orderId,
        message: 'WhatsApp enviado via Karbot',
        requestPayload: {
          to: payload.to,
          trigger_type: payload.triggerType,
          environment,
          endpoint,
          templateId,
        },
        responsePayload: {
          status: response.status,
          data: response.data,
        },
      });
      this.logger.debug('[Karbot] Log success guardado');
      return 'success';
    } catch (error: any) {
      this.logger.error('Error enviando WhatsApp por Karbot:', error?.message || error);
      await this.integrationLogs.log({
        integration: 'karbot',
        eventType: payload.triggerType,
        channel: 'whatsapp',
        status: 'failed',
        businessId: payload.businessId,
        userId: payload.userId,
        orderId: payload.orderId,
        message: 'Error enviando WhatsApp via Karbot',
        errorMessage: error?.message || String(error),
        requestPayload: { to: payload.to, trigger_type: payload.triggerType },
      });
      this.logger.debug('[Karbot] Log failed guardado');
      return 'failed';
    }
  }

  private async getAuthToken(endpoint: string, email: string, password: string): Promise<string | null> {
    const cacheKey = `${endpoint}:${email}`;
    const cached = this.tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.token;
    }

    try {
      const authUrl = `${endpoint.replace(/\/$/, '')}/v1/users/auth/`;
      const response = await axios.post(authUrl, { email, password });
      const token =
        response.data?.token ||
        response.data?.access_token ||
        response.data?.session?.access_token ||
        null;

      if (!token) {
        return null;
      }

      this.tokenCache.set(cacheKey, { token, expiresAt: Date.now() + this.TOKEN_CACHE_TTL });
      return token;
    } catch (error: any) {
      this.logger.error('Error autenticando con Karbot:', error?.message || error);
      return null;
    }
  }
}
