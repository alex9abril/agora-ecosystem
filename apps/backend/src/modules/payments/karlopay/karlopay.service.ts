import {
  Injectable,
  ServiceUnavailableException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { IntegrationsService, KarlopayCredentials } from '../../settings/integrations.service';
import { EmailService } from '../../email/email.service';
import { BusinessesService } from '../../businesses/businesses.service';
import { KarbotService } from '../../businesses/karbot.service';
import { IntegrationLogsService } from '../../settings/integration-logs.service';
import { supabaseAdmin } from '../../../config/supabase.config';
import { resolveProductImagePublicUrl } from '../../../utils/storage.utils';
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

  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly emailService: EmailService,
    private readonly businessesService: BusinessesService,
    private readonly karbotService: KarbotService,
    private readonly integrationLogs: IntegrationLogsService,
  ) {}

  /**
   * Obtener credenciales de Karlopay según el modo activo
   * Intenta primero obtener credenciales a nivel branch, si no están disponibles usa las globales
   */
  private async getCredentials(businessId?: string): Promise<KarlopayCredentials> {
    // Si hay businessId, intentar obtener credenciales a nivel branch
    if (businessId) {
      try {
        const branchCredentials = await this.getBranchKarlopayCredentials(businessId);
        if (branchCredentials) {
          this.logger.debug(`✅ Usando credenciales Karlopay a nivel branch para business: ${businessId}`);
          return branchCredentials;
        }
      } catch (error: any) {
        // Si no hay configuración branch o no está habilitada, continuar con globales
        this.logger.debug(`⚠️ No se encontraron credenciales branch para ${businessId}, usando globales: ${error.message}`);
      }
    }

    // Fallback a credenciales globales
    try {
      return await this.integrationsService.getKarlopayCredentials();
    } catch (error) {
      this.logger.error('Error obteniendo credenciales de Karlopay:', error);
      throw new ServiceUnavailableException('Karlopay no está configurado o habilitado');
    }
  }

  /**
   * Obtener credenciales de Karlopay a nivel branch
   */
  private async getBranchKarlopayCredentials(businessId: string): Promise<KarlopayCredentials | null> {
    try {
      const branchSettings = await this.businessesService.getBusinessKarlopaySettings(businessId);
      const karlopaySettings = branchSettings.karlopay;

      // Si no está habilitado, retornar null para usar globales
      if (!karlopaySettings.enabled) {
        return null;
      }

      const mode = karlopaySettings.environment || 'dev';
      const envSettings = mode === 'dev' ? karlopaySettings.dev : karlopaySettings.prod;

      // Validar que tenga los campos mínimos
      if (!envSettings.domain && !envSettings.login_endpoint) {
        this.logger.warn(`Configuración Karlopay branch incompleta para ${businessId}, usando globales`);
        return null;
      }

      return {
        enabled: true,
        domain: envSettings.domain || '',
        loginEndpoint: envSettings.login_endpoint || '',
        ordersEndpoint: envSettings.orders_endpoint || '',
        authEmail: envSettings.auth_email || '',
        authPassword: envSettings.auth_password || '',
        redirectUrl: envSettings.redirect_url || '',
        endpoint: envSettings.domain || '',
        mode,
      };
    } catch (error: any) {
      // Si hay error (ej: sucursal no encontrada), retornar null para usar globales
      this.logger.debug(`Error obteniendo credenciales branch: ${error.message}`);
      return null;
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
  async createOrUpdateOrder(orderDto: CreateKarlopayOrderDto, businessId?: string): Promise<KarlopayOrderResponse> {
    const credentials = await this.getCredentials(businessId);
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

      // Log de parámetros enviados (sin credenciales)
      this.logger.debug('📦 Payload enviado a Karlopay:', {
        businessArea: orderDto.businessArea,
        numberOfOrder: orderDto.numberOfOrder,
        status: orderDto.status,
        total: orderDto.total,
        customer: {
          foreignId: orderDto.customer?.foreignId,
          fullName: orderDto.customer?.fullName,
          phoneNumber: orderDto.customer?.phoneNumber,
          email: orderDto.customer?.email,
        },
        operationsCount: orderDto.operations?.length || 0,
        redirectUrl: orderDto.redirectUrl,
        additional: orderDto.additional,
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
      this.logger.debug(`[Karlopay] businessArea para orden ${orderDto.numberOfOrder}:`, {
        businessArea: orderDto.businessArea,
      });
      await this.integrationLogs.log({
        integration: 'karlopay',
        eventType: 'order_create_or_update',
        channel: 'api',
        status: 'success',
        message: `Orden ${orderDto.numberOfOrder} creada/actualizada`,
        requestPayload: {
          numberOfOrder: orderDto.numberOfOrder,
          total: orderDto.total,
          businessArea: orderDto.businessArea,
        },
        responsePayload: {
          id: response.data.id,
          numberOfOrder: response.data.numberOfOrder,
          status: response.data.status,
        },
      });

      return {
        ...response.data,
        urlPayment,
      };
    } catch (error: any) {
      this.logger.error('Error creando/actualizando orden en Karlopay:', {
        error: error.response?.data || error.message,
        orderNumber: orderDto.numberOfOrder,
      });

      await this.integrationLogs.log({
        integration: 'karlopay',
        eventType: 'order_create_or_update',
        channel: 'api',
        status: 'failed',
        message: 'Error creando/actualizando orden en Karlopay',
        errorMessage: error.response?.data?.message || error.message,
        requestPayload: {
          numberOfOrder: orderDto.numberOfOrder,
          total: orderDto.total,
          businessArea: orderDto.businessArea,
        },
        responsePayload: error.response?.data || null,
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

    const { dbPool } = await import('../../../config/database.config');
    if (!dbPool) {
      throw new Error('Conexión a base de datos no configurada');
    }

    const client = await dbPool.connect();
    
    try {
      await client.query('BEGIN');
      await this.integrationLogs.log({
        integration: 'karlopay',
        eventType: 'webhook_received',
        channel: 'api',
        status: 'success',
        message: `Webhook recibido para ${webhookDto.numberOfOrder}`,
        requestPayload: {
          numberOfOrder: webhookDto.numberOfOrder,
          referenceNumber: webhookDto.referenceNumber,
          paymentInformation: webhookDto.paymentInformation || null,
          additional: webhookDto.additional || null,
        },
      });

      // Buscar órdenes relacionadas con este numberOfOrder
      // El numberOfOrder se guarda en delivery_notes como "Karlopay Order: {numberOfOrder}"
      // O podemos buscar por order_group_id si está en additional.order_group_id
      // También buscar por external_reference en payment_transactions
      const orderGroupId = webhookDto.additional?.order_group_id;
      const numberOfOrder = webhookDto.numberOfOrder;
      
      this.logger.log(`🔍 Buscando órdenes para:`, {
        numberOfOrder,
        orderGroupId,
        additional: webhookDto.additional,
      });
      
      let ordersResult;
      if (orderGroupId) {
        // Buscar por order_group_id
        ordersResult = await client.query(
          `SELECT DISTINCT o.id, o.order_group_id, o.total_amount, o.payment_status, o.payment_method, o.business_id, o.client_id
           FROM orders.orders o
           WHERE o.order_group_id = $1`,
          [orderGroupId]
        );
        this.logger.log(`📦 Encontradas ${ordersResult.rows.length} órdenes por order_group_id: ${orderGroupId}`);
      }
      
      // Si no se encontraron por order_group_id, buscar por numberOfOrder en delivery_notes
      if (!ordersResult || ordersResult.rows.length === 0) {
        ordersResult = await client.query(
          `SELECT DISTINCT o.id, o.order_group_id, o.total_amount, o.payment_status, o.payment_method, o.business_id, o.client_id
           FROM orders.orders o
           WHERE o.delivery_notes LIKE $1`,
          [`%Karlopay Order: ${numberOfOrder}%`]
        );
        this.logger.log(`📦 Encontradas ${ordersResult.rows.length} órdenes por delivery_notes con numberOfOrder: ${numberOfOrder}`);
      }
      
      // Si aún no se encontraron, buscar por external_reference en payment_transactions
      if (!ordersResult || ordersResult.rows.length === 0) {
        ordersResult = await client.query(
          `SELECT DISTINCT o.id, o.order_group_id, o.total_amount, o.payment_status, o.payment_method, o.business_id, o.client_id
           FROM orders.orders o
           INNER JOIN orders.payment_transactions pt ON pt.order_id = o.id
           WHERE pt.external_reference = $1 OR pt.transaction_id = $1`,
          [numberOfOrder]
        );
        this.logger.log(`📦 Encontradas ${ordersResult.rows.length} órdenes por payment_transactions con external_reference: ${numberOfOrder}`);
      }

      if (!ordersResult || ordersResult.rows.length === 0) {
        this.logger.warn(`⚠️ No se encontraron órdenes para numberOfOrder: ${numberOfOrder}, orderGroupId: ${orderGroupId}`);
        await this.integrationLogs.log({
          integration: 'karlopay',
          eventType: 'webhook_orders_not_found',
          channel: 'api',
          status: 'failed',
          message: 'Webhook sin orden asociada',
          requestPayload: {
            numberOfOrder,
            orderGroupId,
          },
        });
        // No hacer rollback, solo loguear el warning para debugging
        await client.query('ROLLBACK');
        return;
      }

      this.logger.log(`📦 Encontradas ${ordersResult.rows.length} órdenes para procesar`);

      // Determinar el estado del pago basado en el webhook
      // Si hay paymentInformation con totalPayment o totalToDepositBusiness, el pago está completado
      // El webhook solo se envía cuando el pago se completa exitosamente
      const hasPaymentInfo = webhookDto.paymentInformation && (
        webhookDto.paymentInformation.totalPayment ||
        webhookDto.paymentInformation.totalToDepositBusiness ||
        webhookDto.paymentInformation.originalAmount
      );
      
      const paymentStatus = hasPaymentInfo ? 'completed' : 'pending';
      
      const paymentAmount = webhookDto.paymentInformation?.totalPayment || 
                           webhookDto.paymentInformation?.totalToDepositBusiness ||
                           webhookDto.paymentInformation?.originalAmount || 
                           0;

      this.logger.log(`💰 Estado de pago determinado:`, {
        paymentStatus,
        paymentAmount,
        hasPaymentInfo,
        totalPayment: webhookDto.paymentInformation?.totalPayment,
        totalToDepositBusiness: webhookDto.paymentInformation?.totalToDepositBusiness,
      });

      // Procesar cada orden encontrada
      for (const order of ordersResult.rows) {
        // Verificar si ya existe una transacción de pago para esta orden con este transaction_id
        const existingTx = await client.query(
          `SELECT id FROM orders.payment_transactions
           WHERE order_id = $1 AND external_reference = $2`,
          [order.id, webhookDto.numberOfOrder]
        );

        if (existingTx.rows.length > 0) {
          // Obtener el estado actual de la transacción
          const currentTxResult = await client.query(
            `SELECT status, payment_data FROM orders.payment_transactions WHERE id = $1`,
            [existingTx.rows[0].id]
          );
          const currentStatus = currentTxResult.rows[0]?.status;
          const currentPaymentData = currentTxResult.rows[0]?.payment_data || {};
          
          // Si la transacción ya está completada, solo actualizar información adicional (no cambiar status)
          // Esto es para pagos con tarjeta que ya se marcaron como completados al crear la orden
          const finalStatus = currentStatus === 'completed' ? 'completed' : paymentStatus;
          const finalCompletedAt = currentStatus === 'completed' 
            ? currentTxResult.rows[0]?.completed_at 
            : (paymentStatus === 'completed' ? new Date() : null);
          
          // Combinar payment_data existente con los nuevos datos del webhook
          const updatedPaymentData = {
            ...(typeof currentPaymentData === 'string' ? JSON.parse(currentPaymentData) : currentPaymentData),
            // Actualizar con datos del webhook (sobrescribir si vienen)
            ...(webhookDto.cardType && { cardType: webhookDto.cardType }),
            ...(webhookDto.cardDC && { cardDC: webhookDto.cardDC }),
            ...(webhookDto.bankName && { bankName: webhookDto.bankName }),
            ...(webhookDto.bankCode && { bankCode: webhookDto.bankCode }),
            ...(webhookDto.referenceNumber && { referenceNumber: webhookDto.referenceNumber }),
            ...(webhookDto.cardHolder && { cardHolder: webhookDto.cardHolder }),
            ...(webhookDto.lastFour && { lastFour: webhookDto.lastFour }),
            ...(webhookDto.paymentMethod && { paymentMethod: webhookDto.paymentMethod }),
            ...(webhookDto.paymentForm && { paymentForm: webhookDto.paymentForm }),
            ...(webhookDto.paymentDate && { paymentDate: webhookDto.paymentDate }),
            ...(webhookDto.postalCode && { postalCode: webhookDto.postalCode }),
            ...(webhookDto.meses !== undefined && { meses: webhookDto.meses }),
            ...(webhookDto.promotion !== undefined && { promotion: webhookDto.promotion }),
            ...(webhookDto.taxData && { taxData: webhookDto.taxData }),
            ...(webhookDto.paymentInformation && { paymentInformation: webhookDto.paymentInformation }),
            webhook_received: true, // Marcar que el webhook fue recibido
            webhook_received_at: new Date().toISOString(),
          };
          
          // Actualizar transacción existente
          await client.query(
            `UPDATE orders.payment_transactions
             SET status = $1,
                 amount = $2,
                 payment_data = $3,
                 completed_at = CASE WHEN $4 IS NOT NULL THEN $4::timestamp ELSE completed_at END,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $5`,
            [
              finalStatus,
              paymentAmount,
              JSON.stringify(updatedPaymentData),
              finalCompletedAt,
              existingTx.rows[0].id,
            ]
          );
          
          if (currentStatus === 'completed') {
            this.logger.log(`✅ Transacción ya estaba completada, solo se actualizó información adicional para orden ${order.id}`);
          } else {
            this.logger.log(`✅ Transacción actualizada de '${currentStatus}' a '${finalStatus}' para orden ${order.id}`);
          }
        } else {
          // Crear nueva transacción
          await client.query(
            `INSERT INTO orders.payment_transactions (
              order_id,
              payment_method,
              transaction_id,
              external_reference,
              amount,
              status,
              payment_data,
              completed_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, CASE WHEN $6 = 'completed' THEN CURRENT_TIMESTAMP ELSE NULL END)`,
            [
              order.id,
              'karlopay',
              webhookDto.referenceNumber || webhookDto.numberOfOrder,
              webhookDto.numberOfOrder,
              paymentAmount,
              paymentStatus,
              JSON.stringify({
                cardType: webhookDto.cardType,
                cardDC: webhookDto.cardDC,
                bankName: webhookDto.bankName,
                bankCode: webhookDto.bankCode,
                referenceNumber: webhookDto.referenceNumber,
                cardHolder: webhookDto.cardHolder,
                lastFour: webhookDto.lastFour,
                paymentMethod: webhookDto.paymentMethod,
                paymentForm: webhookDto.paymentForm,
                paymentDate: webhookDto.paymentDate,
                postalCode: webhookDto.postalCode,
                meses: webhookDto.meses,
                promotion: webhookDto.promotion,
                taxData: webhookDto.taxData,
                paymentInformation: webhookDto.paymentInformation,
              }),
            ]
          );
          this.logger.log(`✅ Nueva transacción creada para orden ${order.id}`);
        }

        // Si el pago está completado, actualizar payment_status de la orden
        if (paymentStatus === 'completed') {
          // Verificar si todas las transacciones de pago están completadas
          const allTransactionsResult = await client.query(
            `SELECT COUNT(*) as total, 
                    COUNT(*) FILTER (WHERE status = 'completed') as completed,
                    SUM(amount) FILTER (WHERE status = 'completed') as total_completed_amount
             FROM orders.payment_transactions
             WHERE order_id = $1`,
            [order.id]
          );

          const { total, completed, total_completed_amount } = allTransactionsResult.rows[0];
          const totalCompleted = parseFloat(total_completed_amount || '0');
          const orderTotal = parseFloat(order.total_amount || '0');
          
          this.logger.log(`🔍 Verificando estado de pago para orden ${order.id}:`, {
            totalTransactions: parseInt(total),
            completedTransactions: parseInt(completed),
            totalCompletedAmount: totalCompleted,
            orderTotal,
            allCompleted: parseInt(completed) === parseInt(total) && parseInt(total) > 0,
          });
          
          // Si todas las transacciones están completadas Y el monto coincide, marcar la orden como pagada
          if (parseInt(total) > 0 && parseInt(completed) === parseInt(total)) {
            // Verificar que el monto total completado sea igual o mayor al total de la orden
            // (puede ser mayor si hay propina o ajustes)
            if (totalCompleted >= orderTotal - 0.01) { // Tolerancia de centavos
              await client.query(
                `UPDATE orders.orders
                 SET payment_status = 'paid',
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1`,
                [order.id]
              );
              this.logger.log(`✅ Orden ${order.id} marcada como pagada (todas las transacciones completadas)`);

              await this.integrationLogs.log({
                integration: 'karlopay',
                eventType: 'payment_confirmed',
                channel: 'api',
                status: 'success',
                businessId: order.business_id,
                userId: order.client_id,
                orderId: order.id,
                message: 'Pago confirmado por webhook de Karlopay',
                metadata: {
                  totalCompleted,
                  orderTotal,
                  paymentStatus,
                },
              });
            } else {
              this.logger.warn(`⚠️ Orden ${order.id} no marcada como pagada: monto completado (${totalCompleted}) < total orden (${orderTotal})`);
              await this.integrationLogs.log({
                integration: 'karlopay',
                eventType: 'payment_not_confirmed',
                channel: 'api',
                status: 'skipped',
                businessId: order.business_id,
                userId: order.client_id,
                orderId: order.id,
                message: 'Monto completado menor al total de la orden',
                metadata: {
                  totalCompleted,
                  orderTotal,
                },
              });
            }
          } else {
            this.logger.log(`⏳ Orden ${order.id} aún tiene transacciones pendientes: ${parseInt(completed)}/${parseInt(total)} completadas`);
            await this.integrationLogs.log({
              integration: 'karlopay',
              eventType: 'payment_not_confirmed',
              channel: 'api',
              status: 'skipped',
              businessId: order.business_id,
              userId: order.client_id,
              orderId: order.id,
              message: 'Transacciones pendientes',
              metadata: {
                totalTransactions: parseInt(total),
                completedTransactions: parseInt(completed),
              },
            });
          }
        } else {
          this.logger.warn(`⚠️ Pago no completado para orden ${order.id}: paymentStatus = ${paymentStatus}`);
          await this.integrationLogs.log({
            integration: 'karlopay',
            eventType: 'payment_not_confirmed',
            channel: 'api',
            status: 'skipped',
            businessId: order.business_id,
            userId: order.client_id,
            orderId: order.id,
            message: 'paymentStatus != completed',
            metadata: { paymentStatus },
          });
        }
      }

      await client.query('COMMIT');
      this.logger.log(`✅ Webhook procesado exitosamente para orden: ${webhookDto.numberOfOrder}`);
    } catch (error: any) {
      await client.query('ROLLBACK');
      this.logger.error(`❌ Error procesando webhook de KarloPay:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Procesar confirmación desde redirect (cuando Karlopay regresa al sitio)
   */
  async processRedirectConfirmation(payload: any): Promise<{ status: string; message: string }> {
    const { dbPool } = await import('../../../config/database.config');
    if (!dbPool) {
      return { status: 'error', message: 'DB no configurada' };
    }

    const sessionId = (payload?.session_id || payload?.sessionId || payload?.id || '').toString();
    if (!sessionId) {
      await this.integrationLogs.log({
        integration: 'karlopay',
        eventType: 'redirect_invalid',
        channel: 'api',
        status: 'failed',
        message: 'session_id requerido',
        requestPayload: payload,
      });
      return { status: 'error', message: 'session_id requerido' };
    }

    const client = await dbPool.connect();

    try {
      await client.query('BEGIN');

      const alreadyReceived = await client.query(
        `SELECT 1
         FROM communication.integration_logs
         WHERE integration = 'karlopay'
           AND event_type = 'redirect_received'
           AND request_payload->>'session_id' = $1
         LIMIT 1`,
        [sessionId],
      );

      if (alreadyReceived.rows.length > 0) {
        await this.integrationLogs.log({
          integration: 'karlopay',
          eventType: 'redirect_duplicate',
          channel: 'api',
          status: 'skipped',
          message: 'Redirect duplicado ignorado',
          requestPayload: { sessionId },
        });
        await client.query('ROLLBACK');
        return { status: 'ok', message: 'Redirect ya procesado' };
      }

      await this.integrationLogs.log({
        integration: 'karlopay',
        eventType: 'redirect_received',
        channel: 'api',
        status: 'success',
        message: `Redirect recibido para ${sessionId}`,
        requestPayload: { ...payload, session_id: sessionId },
      });

      const ordersResult = await client.query(
        `SELECT DISTINCT o.id, o.order_group_id, o.total_amount, o.payment_status, o.payment_method, o.business_id, o.client_id
         FROM orders.orders o
         LEFT JOIN orders.payment_transactions pt ON pt.order_id = o.id
         WHERE o.delivery_notes LIKE $1
            OR pt.external_reference = $2
            OR pt.transaction_id = $2`,
        [`%Karlopay Order: ${sessionId}%`, sessionId],
      );

      if (ordersResult.rows.length === 0) {
        await this.integrationLogs.log({
          integration: 'karlopay',
          eventType: 'redirect_orders_not_found',
          channel: 'api',
          status: 'failed',
          message: 'Redirect sin orden asociada',
          requestPayload: { sessionId },
        });
        await client.query('ROLLBACK');
        return { status: 'not_found', message: 'Orden no encontrada' };
      }

      let confirmedCount = 0;
      let skippedCount = 0;

      for (const order of ordersResult.rows) {
        await this.integrationLogs.log({
          integration: 'karlopay',
          eventType: 'redirect_order_linked',
          channel: 'api',
          status: 'success',
          businessId: order.business_id,
          userId: order.client_id,
          orderId: order.id,
          message: 'Orden vinculada al redirect',
          requestPayload: { sessionId },
        });
        const payments = await client.query(
          `SELECT COUNT(*) as total,
                  COUNT(*) FILTER (WHERE status = 'completed') as completed,
                  SUM(amount) FILTER (WHERE status = 'completed') as total_completed_amount
           FROM orders.payment_transactions
           WHERE order_id = $1`,
          [order.id],
        );

        const { total, completed, total_completed_amount } = payments.rows[0];
        const totalCompleted = parseFloat(total_completed_amount || '0');
        const orderTotal = parseFloat(order.total_amount || '0');

        if (parseInt(total) === 0 || parseInt(completed) !== parseInt(total) || totalCompleted < orderTotal - 0.01) {
          await this.integrationLogs.log({
            integration: 'karlopay',
            eventType: 'redirect_payment_not_confirmed',
            channel: 'api',
            status: 'skipped',
            businessId: order.business_id,
            userId: order.client_id,
            orderId: order.id,
            message: 'Pago no confirmado en redirect',
            metadata: { total, completed, totalCompleted, orderTotal },
          });
          skippedCount += 1;
          continue;
        }

        const alreadySent = await client.query(
          `SELECT 1
           FROM communication.integration_logs
           WHERE order_id = $1
             AND event_type = 'order_confirmation'
             AND status = 'success'
             AND integration IN ('email', 'karbot')
           LIMIT 1`,
          [order.id],
        );

        if (alreadySent.rows.length > 0) {
          await this.integrationLogs.log({
            integration: 'notifications',
            eventType: 'order_confirmation',
            channel: 'email/whatsapp',
            status: 'skipped',
            businessId: order.business_id,
            userId: order.client_id,
            orderId: order.id,
            message: 'Notificaciones ya enviadas previamente',
          });
          skippedCount += 1;
          continue;
        }

        await this.integrationLogs.log({
          integration: 'notifications',
          eventType: 'order_confirmation',
          channel: 'email/whatsapp',
          status: 'success',
          businessId: order.business_id,
          userId: order.client_id,
          orderId: order.id,
          message: 'Disparando notificaciones desde redirect',
        });

        await this.sendOrderConfirmationEmail(order.id, order.business_id);
        confirmedCount += 1;
      }

      await client.query('COMMIT');
      if (confirmedCount > 0) {
        return { status: 'ok', message: 'Notificaciones enviadas' };
      }
      if (skippedCount > 0) {
        return { status: 'pending', message: 'Pago aún no confirmado' };
      }
      return { status: 'pending', message: 'Sin acciones para procesar' };
    } catch (error: any) {
      await client.query('ROLLBACK');
      this.logger.error('❌ Error procesando redirect de Karlopay:', error);
      await this.integrationLogs.log({
        integration: 'karlopay',
        eventType: 'redirect_failed',
        channel: 'api',
        status: 'failed',
        message: 'Error procesando redirect',
        errorMessage: error?.message || String(error),
        requestPayload: payload,
      });
      return { status: 'error', message: error?.message || 'Error procesando redirect' };
    } finally {
      client.release();
    }
  }

  /**
   * Limpiar caché de tokens (útil para testing o cuando cambian las credenciales)
   */
  clearTokenCache(): void {
    this.tokenCache.clear();
    this.logger.log('🗑️ Caché de tokens de Karlopay limpiado');
  }

  /**
   * Obtener email del usuario desde auth.users
   */
  private async getUserEmail(userId: string): Promise<string | null> {
    if (!supabaseAdmin) {
      return null;
    }

    try {
      const { data: authUser, error } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (error || !authUser?.user?.email) {
        this.logger.warn(`⚠️ No se pudo obtener email para usuario ${userId}:`, error?.message);
        return null;
      }
      return authUser.user.email;
    } catch (error: any) {
      this.logger.error(`❌ Error obteniendo email del usuario ${userId}:`, error);
      return null;
    }
  }

  /**
   * Obtener telefono del usuario desde core.user_profiles
   */
  private async getUserPhone(userId: string): Promise<string | null> {
    const { dbPool } = await import('../../../config/database.config');
    if (!dbPool) {
      return null;
    }

    try {
      const result = await dbPool.query(
        `SELECT phone FROM core.user_profiles WHERE id = $1`,
        [userId],
      );
      return result.rows[0]?.phone || null;
    } catch (error: any) {
      this.logger.error(`❌ Error obteniendo telefono del usuario ${userId}:`, error);
      return null;
    }
  }

  /** Formato de moneda con separador de miles (es-MX): 1,234.56 */
  private formatCurrency(amount: number): string {
    return amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /**
   * Construye la URL de "Ver detalle del pedido" conservando el contexto de tienda
   * (sucursal, grupo, marca o global) desde el que se hizo el pedido.
   */
  private buildOrderDetailUrl(
    frontendUrl: string,
    orderId: string,
    storeContext: string | null,
    businessSlug: string | null,
  ): string {
    const base = frontendUrl.replace(/\/$/, '');
    const pathPrefix = (storeContext || '').trim();
    if (pathPrefix && pathPrefix.startsWith('/') && !pathPrefix.includes('//')) {
      const prefix = pathPrefix.replace(/\/$/, '');
      return `${base}${prefix}/orders/${orderId}`;
    }
    if (businessSlug) {
      return `${base}/sucursal/${businessSlug}/orders/${orderId}`;
    }
    return `${base}/orders/${orderId}`;
  }

  /**
   * Construye el HTML del detalle de items del pedido para el correo de confirmación
   */
  private buildOrderItemsDetailHtml(
    items: Array<{ item_name: string; quantity: number; item_subtotal: string; item_price: string; image_url: string | null }>
  ): string {
    const escapeHtml = (s: string) =>
      String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    if (!items || items.length === 0) {
      return '<p style="font-size: 14px; color: #6b7280; margin: 0; font-family: Arial, sans-serif;">No hay items.</p>';
    }

    const rows = items
      .map((item) => {
        const unitPrice = parseFloat(item.item_price || item.item_subtotal || '0');
        const subtotal = parseFloat(item.item_subtotal || '0');
        const imageHtml = item.image_url
          ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.item_name)}" style="width: 56px; height: 56px; object-fit: cover; border-radius: 8px; border: 1px solid #e5e7eb; margin-right: 16px;" />`
          : `<div style="width: 56px; height: 56px; border-radius: 8px; background-color: #f3f4f6; border: 1px solid #e5e7eb; margin-right: 16px;"></div>`;

        return `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">
            <div style="display: flex; align-items: center; gap: 12px;">
              ${imageHtml}
              <div style="padding-left: 4px;">
                <div style="font-size: 14px; color: #111827; font-family: Arial, sans-serif; font-weight: 500;">
                  ${escapeHtml(item.item_name)}
                </div>
                <div style="font-size: 12px; color: #6b7280; font-family: Arial, sans-serif; margin-top: 2px;">
                  ${item.quantity} x $${this.formatCurrency(unitPrice)}
                </div>
              </div>
            </div>
          </td>
          <td style="font-size: 14px; color: #111827; padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-family: Arial, sans-serif;">
            ${item.quantity}
          </td>
          <td style="font-size: 14px; color: #111827; padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: Arial, sans-serif; font-weight: 600;">
            $${this.formatCurrency(subtotal)}
          </td>
        </tr>`;
      })
      .join('');

    return `
    <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif;">
      <thead>
        <tr>
          <th style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500; padding: 10px 12px; text-align: left; border-bottom: 1px solid #e5e7eb;">Producto</th>
          <th style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500; padding: 10px 12px; text-align: center; border-bottom: 1px solid #e5e7eb;">Cant.</th>
          <th style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500; padding: 10px 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">Subtotal</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  /**
   * Enviar correo de confirmación de pedido
   */
  private async sendOrderConfirmationEmail(orderId: string, businessId: string): Promise<void> {
    const { dbPool } = await import('../../../config/database.config');
    if (!dbPool) {
      return;
    }

    try {
      // Obtener datos del pedido (store_context y slug para URL de "Ver detalle")
      const orderResult = await dbPool.query(
        `SELECT 
          o.id,
          o.client_id,
          o.total_amount,
          o.payment_method,
          o.created_at,
          o.business_id,
          o.store_context,
          b.business_group_id,
          b.slug AS business_slug
        FROM orders.orders o
        LEFT JOIN core.businesses b ON o.business_id = b.id
        WHERE o.id = $1`,
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        this.logger.warn(`⚠️ No se encontró pedido ${orderId} para enviar correo`);
        return;
      }

      const order = orderResult.rows[0];

      // Obtener items del pedido para el correo (imagen desde product_images o collections)
      const itemsResult = await dbPool.query(
        `SELECT 
           oi.item_name,
           oi.quantity,
           oi.item_subtotal,
           oi.item_price,
           COALESCE(
             (SELECT pi.file_path
              FROM catalog.product_images pi
              WHERE pi.product_id = oi.product_id AND pi.is_active = TRUE
              ORDER BY pi.is_primary DESC NULLS LAST, pi.display_order ASC
              LIMIT 1),
             c.image_url,
             p.image_url
           ) AS image_url
         FROM orders.order_items oi
         LEFT JOIN catalog.products p ON oi.product_id = p.id
         LEFT JOIN catalog.collections c ON oi.collection_id = c.id
         WHERE oi.order_id = $1
         ORDER BY oi.created_at, oi.id`,
        [orderId]
      );
      const rawItems = itemsResult.rows as Array<{
        item_name: string;
        quantity: number;
        item_subtotal: string;
        item_price: string;
        image_url: string | null;
      }>;
      // Misma lógica que GET /products/:id y GET /products/:id/images (resolveProductImagePublicUrl)
      const bucketProducts = process.env.SUPABASE_STORAGE_BUCKET_PRODUCTS || 'products';
      const items = rawItems.map((row) => {
        const rawImageUrl = row.image_url || '';
        const resolvedImageUrl = resolveProductImagePublicUrl(
          rawImageUrl,
          bucketProducts,
          supabaseAdmin,
        );
        if (process.env.NODE_ENV !== 'production' && (rawImageUrl || resolvedImageUrl)) {
          const isDoubleUrl = resolvedImageUrl?.includes('/object/public/http') ?? false;
          console.debug('[KarloPay.sendOrderConfirmationEmail] imagen ítem:', {
            item_name: row.item_name,
            raw_from_db: rawImageUrl,
            resolved_src: resolvedImageUrl ?? null,
            ...(isDoubleUrl && { warning: 'URL doble detectada en resolved_src' }),
          });
        }
        return { ...row, image_url: resolvedImageUrl };
      });
      const orderItemsDetailHtml = this.buildOrderItemsDetailHtml(items);

      const channels = await this.businessesService.getNotificationChannels(
        order.business_id,
        'order_confirmation',
      );

      if (!channels.emailEnabled && !channels.whatsappEnabled) {
        await this.integrationLogs.log({
          integration: 'notifications',
          eventType: 'order_confirmation',
          channel: 'email/whatsapp',
          status: 'skipped',
          businessId: order.business_id,
          userId: order.client_id,
          orderId: order.id,
          message: 'Notificaciones deshabilitadas para la sucursal',
        });
        return;
      }

      const userEmail = await this.getUserEmail(order.client_id);

      if (channels.emailEnabled && !userEmail) {
        this.logger.warn(`⚠️ No se pudo obtener email del usuario ${order.client_id} para enviar correo de confirmación`);
        await this.integrationLogs.log({
          integration: 'email',
          eventType: 'order_confirmation',
          channel: 'email',
          status: 'skipped',
          businessId: order.business_id,
          userId: order.client_id,
          orderId: order.id,
          message: 'Email no disponible para notificación',
        });
      }

      // Formatear datos
      const orderNumber = order.id.substring(0, 8).toUpperCase();
      const orderDate = new Date(order.created_at).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const orderTotal = `$${this.formatCurrency(parseFloat(order.total_amount))}`;
      const paymentMethod = order.payment_method || 'No especificado';
      const orderUrl = this.buildOrderDetailUrl(
        process.env.FRONTEND_URL || 'https://agoramp.mx',
        order.id,
        order.store_context ?? null,
        order.business_slug ?? null,
      );

      if (channels.emailEnabled && userEmail) {
        const emailStatus = await this.emailService.sendOrderConfirmationEmail(
          userEmail,
          orderNumber,
          orderDate,
          orderTotal,
          paymentMethod,
          orderUrl,
          orderItemsDetailHtml,
          order.business_id,
          order.business_group_id,
          { userId: order.client_id, orderId: order.id }
        );

        await this.integrationLogs.log({
          integration: 'email',
          eventType: 'order_confirmation',
          channel: 'email',
          status: emailStatus,
          businessId: order.business_id,
          userId: order.client_id,
          orderId: order.id,
          message: `Envio de correo de confirmacion: ${emailStatus}`,
        });
      }

      if (channels.whatsappEnabled) {
        const userPhone = await this.getUserPhone(order.client_id);
        if (!userPhone) {
          this.logger.warn(`⚠️ No se pudo obtener telefono del usuario ${order.client_id} para WhatsApp`);
          await this.integrationLogs.log({
            integration: 'karbot',
            eventType: 'order_confirmation',
            channel: 'whatsapp',
            status: 'skipped',
            businessId: order.business_id,
            userId: order.client_id,
            orderId: order.id,
            message: 'Telefono no disponible para WhatsApp',
          });
        } else {
          await this.karbotService.sendWhatsappNotification({
            businessId: order.business_id,
            triggerType: 'order_confirmation',
            to: userPhone,
            userId: order.client_id,
            orderId: order.id,
            data: {
              order_id: order.id,
              order_number: orderNumber,
              order_date: orderDate,
              order_total: orderTotal,
              payment_method: paymentMethod,
              order_url: orderUrl,
            },
          });
        }
      }
    } catch (error: any) {
      this.logger.error(`❌ Error en sendOrderConfirmationEmail para orden ${orderId}:`, error);
      // No lanzar error para no interrumpir el flujo
    }
  }
}

