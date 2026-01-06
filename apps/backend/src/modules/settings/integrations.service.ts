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

export interface KarlopayCredentials extends PaymentProviderCredentials {
  domain: string;
  loginEndpoint: string;
  ordersEndpoint: string;
  authEmail: string;
  authPassword: string;
  redirectUrl: string; // URL base con placeholders: {tienda} y {session_id}
}

/**
 * Opciones para construir la URL de redirección de Karlopay
 */
export interface KarlopayRedirectUrlOptions {
  sessionId: string;
  storePath?: string; // Ej: '/grupo/toyota-group' o '/tienda/sucursal-centro'
}

export interface MercadoPagoCredentials extends PaymentProviderCredentials {
  accessToken: string;
  publicKey: string;
}

export interface StripeCredentials extends PaymentProviderCredentials {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
}

export interface SkydropxCredentials {
  enabled: boolean;
  endpoint: string; // Endpoint base para operaciones generales
  quotationsEndpoint: string; // Endpoint específico para cotizaciones
  apiKey: string; // Desde variables de entorno
  apiSecret: string; // Desde variables de entorno
  mode: 'dev' | 'prod';
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
      redirectUrl: await this.getSettingValue(`integrations.payments.karlopay.${prefix}.redirect_url`, ''),
      endpoint: await this.getSettingValue(`integrations.payments.karlopay.${prefix}.domain`, ''),
      mode,
    };
  }

  /**
   * Obtener credenciales de Skydropx según el modo activo
   */
  async getSkydropxCredentials(): Promise<SkydropxCredentials> {
    const mode = await this.getMode();
    const enabled = await this.getSettingValue(
      'integrations.logistics.skydropx.enabled',
      false
    );

    if (!enabled) {
      throw new NotFoundException('Skydropx no está habilitado');
    }

    const prefix = mode === 'dev' ? 'dev' : 'prod';
    const endpoint = await this.getSettingValue(
      `integrations.logistics.skydropx.${prefix}.endpoint`,
      'https://pro.skydropx.com/api/v1'
    );
    const quotationsEndpoint = await this.getSettingValue(
      `integrations.logistics.skydropx.${prefix}.quotations_endpoint`,
      'https://pro.skydropx.com/api/v1'
    );

    // Las credenciales se toman de las variables de entorno
    // Skydropx usa OAuth2, por lo que necesitamos Client ID y Client Secret
    // Por compatibilidad, mantenemos los nombres SKYDROPPX_API_KEY y SKYDROPPX_API_SECRET
    // pero estos deben contener el Client ID y Client Secret respectivamente
    const apiKey = process.env.SKYDROPPX_API_KEY || process.env.SKYDROPPX_CLIENT_ID;
    const apiSecret = process.env.SKYDROPPX_API_SECRET || process.env.SKYDROPPX_CLIENT_SECRET;

    if (!apiKey || !apiSecret) {
      throw new ServiceUnavailableException(
        'Credenciales de Skydropx no configuradas en variables de entorno. ' +
        'Necesitas configurar SKYDROPPX_API_KEY (Client ID) y SKYDROPPX_API_SECRET (Client Secret) ' +
        'o SKYDROPPX_CLIENT_ID y SKYDROPPX_CLIENT_SECRET'
      );
    }

    return {
      enabled: true,
      endpoint,
      quotationsEndpoint,
      apiKey, // Client ID para OAuth2
      apiSecret, // Client Secret para OAuth2
      mode,
    };
  }

  /**
   * Construir la URL de redirección de Karlopay reemplazando placeholders
   * 
   * @param options Opciones para construir la URL
   * @returns URL completa con placeholders reemplazados
   * 
   * @example
   * const url = await integrationsService.buildKarlopayRedirectUrl({
   *   sessionId: 'payses_01JJD1VWT2ESR3101A9Q3TMN5V',
   *   storePath: '/grupo/toyota-group'
   * });
   * // Resultado: 'https://agoramp.com/grupo/toyota-group/karlopay-redirect?session_id=payses_01JJD1VWT2ESR3101A9Q3TMN5V'
   */
  async buildKarlopayRedirectUrl(options: KarlopayRedirectUrlOptions): Promise<string> {
    const credentials = await this.getKarlopayCredentials();
    let redirectUrl = credentials.redirectUrl;

    // Reemplazar {tienda} con la ruta de la tienda/grupo
    if (options.storePath) {
      redirectUrl = redirectUrl.replace('{tienda}', options.storePath);
    } else {
      // Si no se proporciona storePath, usar ruta vacía o ruta por defecto
      redirectUrl = redirectUrl.replace('{tienda}', '');
    }

    // Reemplazar {session_id} con el ID de sesión real
    redirectUrl = redirectUrl.replace('{session_id}', options.sessionId);

    return redirectUrl;
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

