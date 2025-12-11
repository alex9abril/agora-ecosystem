import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SettingsService } from './settings.service';

export interface PaymentProviderCredentials {
  enabled: boolean;
  domain?: string;
  loginEndpoint?: string;
  ordersEndpoint?: string;
  authEmail?: string;
  authPassword?: string;
  accessToken?: string;
  publicKey?: string;
  secretKey?: string;
  publishableKey?: string;
  webhookSecret?: string;
  endpoint: string;
  mode: 'dev' | 'prod';
}

export interface KarlopayCredentials extends PaymentProviderCredentials {}

export interface MercadoPagoCredentials extends PaymentProviderCredentials {
  accessToken: string;
  publicKey: string;
}

export interface StripeCredentials extends PaymentProviderCredentials {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
}

@Injectable()
export class IntegrationsService {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * Obtener el modo actual (dev o prod)
   */
  async getMode(): Promise<'dev' | 'prod'> {
    try {
      const devModeSetting = await this.settingsService.findByKey('integrations.dev_mode');
      return devModeSetting.value === true ? 'dev' : 'prod';
    } catch (error) {
      // Si no existe la configuración, por defecto es dev
      return 'dev';
    }
  }

  /**
   * Obtener credenciales de Karlopay según el modo activo
   */
  async getKarlopayCredentials(): Promise<KarlopayCredentials> {
    const mode = await this.getMode();
    const enabled = await this.getSettingValue('integrations.payments.karlopay.enabled', false);

    if (!enabled) {
      throw new NotFoundException('Karlopay no está habilitado');
    }

    const prefix = mode === 'dev' ? 'dev' : 'prod';
    
    return {
      enabled: true,
      domain: await this.getSettingValue(`integrations.payments.karlopay.${prefix}.domain`, ''),
      loginEndpoint: await this.getSettingValue(`integrations.payments.karlopay.${prefix}.login_endpoint`, ''),
      ordersEndpoint: await this.getSettingValue(`integrations.payments.karlopay.${prefix}.orders_endpoint`, ''),
      authEmail: await this.getSettingValue(`integrations.payments.karlopay.${prefix}.auth_email`, ''),
      authPassword: await this.getSettingValue(`integrations.payments.karlopay.${prefix}.auth_password`, ''),
      endpoint: await this.getSettingValue(`integrations.payments.karlopay.${prefix}.domain`, ''),
      mode,
    };
  }

  /**
   * Obtener credenciales de Mercado Pago según el modo activo
   */
  async getMercadoPagoCredentials(): Promise<MercadoPagoCredentials> {
    const mode = await this.getMode();
    const enabled = await this.getSettingValue('integrations.payments.mercadopago.enabled', false);

    if (!enabled) {
      throw new NotFoundException('Mercado Pago no está habilitado');
    }

    const prefix = mode === 'dev' ? 'dev' : 'prod';
    
    return {
      enabled: true,
      accessToken: await this.getSettingValue(`integrations.payments.mercadopago.${prefix}.access_token`, ''),
      publicKey: await this.getSettingValue(`integrations.payments.mercadopago.${prefix}.public_key`, ''),
      endpoint: await this.getSettingValue(`integrations.payments.mercadopago.${prefix}.endpoint`, ''),
      mode,
    };
  }

  /**
   * Obtener credenciales de Stripe según el modo activo
   */
  async getStripeCredentials(): Promise<StripeCredentials> {
    const mode = await this.getMode();
    const enabled = await this.getSettingValue('integrations.payments.stripe.enabled', false);

    if (!enabled) {
      throw new NotFoundException('Stripe no está habilitado');
    }

    const prefix = mode === 'dev' ? 'dev' : 'prod';
    
    return {
      enabled: true,
      secretKey: await this.getSettingValue(`integrations.payments.stripe.${prefix}.secret_key`, ''),
      publishableKey: await this.getSettingValue(`integrations.payments.stripe.${prefix}.publishable_key`, ''),
      webhookSecret: await this.getSettingValue(`integrations.payments.stripe.${prefix}.webhook_secret`, ''),
      endpoint: await this.getSettingValue(`integrations.payments.stripe.${prefix}.endpoint`, ''),
      mode,
    };
  }

  /**
   * Obtener todas las credenciales de métodos de pago activos
   */
  async getAllPaymentCredentials(): Promise<{
    mode: 'dev' | 'prod';
    karlopay?: KarlopayCredentials;
    mercadopago?: MercadoPagoCredentials;
    stripe?: StripeCredentials;
  }> {
    const mode = await this.getMode();
    const result: any = { mode };

    try {
      result.karlopay = await this.getKarlopayCredentials();
    } catch (error) {
      // Ignorar si no está habilitado
    }

    try {
      result.mercadopago = await this.getMercadoPagoCredentials();
    } catch (error) {
      // Ignorar si no está habilitado
    }

    try {
      result.stripe = await this.getStripeCredentials();
    } catch (error) {
      // Ignorar si no está habilitado
    }

    return result;
  }

  /**
   * Helper para obtener valor de configuración con valor por defecto
   */
  private async getSettingValue(key: string, defaultValue: any = ''): Promise<any> {
    try {
      const setting = await this.settingsService.findByKey(key);
      return setting.value || defaultValue;
    } catch (error) {
      return defaultValue;
    }
  }
}

