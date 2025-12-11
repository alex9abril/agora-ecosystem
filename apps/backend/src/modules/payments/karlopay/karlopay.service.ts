import {
  Injectable,
  ServiceUnavailableException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { IntegrationsService, KarlopayCredentials } from '../../settings/integrations.service';
import axios, { AxiosInstance } from 'axios';
import { CreateKarlopayOrderDto } from './dto/create-karlopay-order.dto';
import { KarlopayPaymentWebhookDto } from './dto/karlopay-payment-webhook.dto';

interface KarlopayLoginResponse {
  token?: string;
  access_token?: string;
  [key: string]: any;
}

export interface KarlopayOrderResponse {
  id: number;
  numberOfOrder: string;
  status: string;
  total: number;
  urlPayment: string;
  redirectUrl?: string;
  [key: string]: any;
}

@Injectable()
export class KarlopayService {
  private readonly logger = new Logger(KarlopayService.name);
  private tokenCache: Map<string, { token: string; expiresAt: number }> = new Map();
  private readonly TOKEN_CACHE_TTL = 50 * 60 * 1000; // 50 minutos (tokens suelen expirar en 1 hora)

  constructor(private readonly integrationsService: IntegrationsService) {}

  /**
   * Obtener credenciales de Karlopay según el modo activo
   */
  private async getCredentials(): Promise<KarlopayCredentials> {
    try {
      return await this.integrationsService.getKarlopayCredentials();
    } catch (error) {
      this.logger.error('Error obteniendo credenciales de Karlopay:', error);
      throw new ServiceUnavailableException('Karlopay no está configurado o habilitado');
    }
  }

  /**
   * Obtener token de autenticación (con caché)
   */
  private async getAuthToken(credentials: KarlopayCredentials): Promise<string> {
    const cacheKey = `${credentials.mode}-${credentials.authEmail}`;
    const cached = this.tokenCache.get(cacheKey);

    // Si hay token en caché y no ha expirado, usarlo
    if (cached && cached.expiresAt > Date.now()) {
      this.logger.debug(`✅ Usando token en caché para ${credentials.mode}`);
      return cached.token;
    }

    // Si no hay token o expiró, obtener uno nuevo
    this.logger.log(`🔐 Obteniendo nuevo token de Karlopay (modo: ${credentials.mode})`);

    try {
      // Usar la URL completa del endpoint si está disponible, sino construirla
      const loginUrl = credentials.loginEndpoint || `${credentials.domain}/api/auth/login`;
      
      this.logger.debug(`🔗 URL de login de Karlopay: ${loginUrl}`);
      this.logger.debug(`📧 Email: ${credentials.authEmail}`);
      this.logger.debug(`🔑 Password: ${credentials.authPassword ? '***' : 'NO CONFIGURADO'}`);

      const axiosInstance = axios.create({
        timeout: 10000,
      });

      const loginResponse = await axiosInstance.post<KarlopayLoginResponse>(
        loginUrl,
        {
          email: credentials.authEmail,
          password: credentials.authPassword,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      // Log la respuesta completa para debugging
      this.logger.debug(`📥 Respuesta de login de Karlopay:`, JSON.stringify(loginResponse.data, null, 2));

      // Intentar obtener el token de diferentes posibles estructuras de respuesta
      // La estructura real de Karlopay es: { session: { access_token: "...", expiresIn: "..." } }
      const token = 
        loginResponse.data?.session?.access_token ||  // Estructura real de Karlopay
        loginResponse.data?.token || 
        loginResponse.data?.access_token || 
        loginResponse.data?.accessToken ||
        loginResponse.data?.data?.token ||
        loginResponse.data?.data?.access_token ||
        (loginResponse.data as any)?.auth?.token;

      if (!token) {
        this.logger.error('❌ No se encontró token en la respuesta de Karlopay. Estructura recibida:', JSON.stringify(loginResponse.data, null, 2));
        throw new BadRequestException('No se recibió token de autenticación de Karlopay. Verifica las credenciales y la estructura de la respuesta.');
      }

      // Guardar en caché
      this.tokenCache.set(cacheKey, {
        token,
        expiresAt: Date.now() + this.TOKEN_CACHE_TTL,
      });

      this.logger.log(`✅ Token obtenido exitosamente (modo: ${credentials.mode})`);
      return token;
    } catch (error: any) {
      // Log detallado del error
      if (error.response) {
        this.logger.error('❌ Error en respuesta de Karlopay:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          url: error.config?.url,
        });
      } else if (error.request) {
        this.logger.error('❌ Error de red al conectar con Karlopay:', {
          message: error.message,
          code: error.code,
          url: error.config?.url,
        });
      } else {
        this.logger.error('❌ Error configurando petición a Karlopay:', error.message);
      }

      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Error desconocido al autenticar con Karlopay';

      throw new ServiceUnavailableException(
        `Error autenticando con Karlopay: ${errorMessage}`
      );
    }
  }

  /**
   * Crear o actualizar orden en Karlopay
   */
  async createOrUpdateOrder(orderDto: CreateKarlopayOrderDto): Promise<KarlopayOrderResponse> {
    const credentials = await this.getCredentials();
    const token = await this.getAuthToken(credentials);

    this.logger.log(`📦 Creando/actualizando orden en Karlopay: ${orderDto.numberOfOrder} (modo: ${credentials.mode})`);

    try {
      // Usar la URL completa del endpoint si está disponible, sino construirla
      const ordersUrl = credentials.ordersEndpoint || `${credentials.domain}/api/orders/create-or-update`;
      
      this.logger.debug(`🔗 URL de órdenes de Karlopay: ${ordersUrl}`);

      const axiosInstance = axios.create({
        timeout: 30000,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const response = await axiosInstance.post<KarlopayOrderResponse>(
        ordersUrl,
        orderDto
      );

      // Asegurar que urlPayment tenga protocolo si es relativa
      let urlPayment = response.data.urlPayment;
      if (urlPayment && !urlPayment.startsWith('http://') && !urlPayment.startsWith('https://')) {
        // Si es relativa, agregar https://
        urlPayment = `https://${urlPayment}`;
        this.logger.debug(`🔗 URL de pago normalizada: ${urlPayment}`);
      }

      this.logger.log(`✅ Orden ${orderDto.numberOfOrder} procesada exitosamente. URL de pago: ${urlPayment}`);

      return {
        ...response.data,
        urlPayment,
      };
    } catch (error: any) {
      this.logger.error('Error creando/actualizando orden en Karlopay:', {
        error: error.response?.data || error.message,
        orderNumber: orderDto.numberOfOrder,
      });

      throw new ServiceUnavailableException(
        `Error procesando orden en Karlopay: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Procesar webhook de confirmación de pago
   */
  async processPaymentWebhook(webhookDto: KarlopayPaymentWebhookDto): Promise<void> {
    this.logger.log(`💰 Procesando webhook de pago de Karlopay para orden: ${webhookDto.numberOfOrder}`);

    // Aquí se procesaría la confirmación de pago
    // Por ejemplo, actualizar el estado del pedido en la base de datos
    // Esto se implementará según la lógica de negocio específica

    this.logger.log(`✅ Webhook procesado exitosamente para orden: ${webhookDto.numberOfOrder}`);
  }

  /**
   * Limpiar caché de tokens (útil para testing o cuando cambian las credenciales)
   */
  clearTokenCache(): void {
    this.tokenCache.clear();
    this.logger.log('🗑️ Caché de tokens de Karlopay limpiado');
  }
}

