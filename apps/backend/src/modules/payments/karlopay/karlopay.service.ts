import {
  Injectable,
  ServiceUnavailableException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { IntegrationsService, KarlopayCredentials } from '../../settings/integrations.service';
import { EmailService } from '../../email/email.service';
import { supabaseAdmin } from '../../../config/supabase.config';
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
    private readonly emailService: EmailService
  ) {}

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

    const { dbPool } = await import('../../../config/database.config');
    if (!dbPool) {
      throw new Error('Conexión a base de datos no configurada');
    }

    const client = await dbPool.connect();
    
    try {
      await client.query('BEGIN');

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
          `SELECT DISTINCT o.id, o.order_group_id, o.total_amount, o.payment_status, o.payment_method
           FROM orders.orders o
           WHERE o.order_group_id = $1`,
          [orderGroupId]
        );
        this.logger.log(`📦 Encontradas ${ordersResult.rows.length} órdenes por order_group_id: ${orderGroupId}`);
      }
      
      // Si no se encontraron por order_group_id, buscar por numberOfOrder en delivery_notes
      if (!ordersResult || ordersResult.rows.length === 0) {
        ordersResult = await client.query(
          `SELECT DISTINCT o.id, o.order_group_id, o.total_amount, o.payment_status, o.payment_method
           FROM orders.orders o
           WHERE o.delivery_notes LIKE $1`,
          [`%Karlopay Order: ${numberOfOrder}%`]
        );
        this.logger.log(`📦 Encontradas ${ordersResult.rows.length} órdenes por delivery_notes con numberOfOrder: ${numberOfOrder}`);
      }
      
      // Si aún no se encontraron, buscar por external_reference en payment_transactions
      if (!ordersResult || ordersResult.rows.length === 0) {
        ordersResult = await client.query(
          `SELECT DISTINCT o.id, o.order_group_id, o.total_amount, o.payment_status, o.payment_method
           FROM orders.orders o
           INNER JOIN orders.payment_transactions pt ON pt.order_id = o.id
           WHERE pt.external_reference = $1 OR pt.transaction_id = $1`,
          [numberOfOrder]
        );
        this.logger.log(`📦 Encontradas ${ordersResult.rows.length} órdenes por payment_transactions con external_reference: ${numberOfOrder}`);
      }

      if (!ordersResult || ordersResult.rows.length === 0) {
        this.logger.warn(`⚠️ No se encontraron órdenes para numberOfOrder: ${numberOfOrder}, orderGroupId: ${orderGroupId}`);
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
              
              // Enviar correo de confirmación de pedido (no bloquea el flujo si falla)
              this.sendOrderConfirmationEmail(order.id, order.business_id).catch((error) => {
                this.logger.error(`❌ Error enviando correo de confirmación para orden ${order.id} (no crítico):`, error);
              });
            } else {
              this.logger.warn(`⚠️ Orden ${order.id} no marcada como pagada: monto completado (${totalCompleted}) < total orden (${orderTotal})`);
            }
          } else {
            this.logger.log(`⏳ Orden ${order.id} aún tiene transacciones pendientes: ${parseInt(completed)}/${parseInt(total)} completadas`);
          }
        } else {
          this.logger.warn(`⚠️ Pago no completado para orden ${order.id}: paymentStatus = ${paymentStatus}`);
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
   * Enviar correo de confirmación de pedido
   */
  private async sendOrderConfirmationEmail(orderId: string, businessId: string): Promise<void> {
    const { dbPool } = await import('../../../config/database.config');
    if (!dbPool) {
      return;
    }

    try {
      // Obtener datos del pedido
      const orderResult = await dbPool.query(
        `SELECT 
          o.id,
          o.client_id,
          o.total_amount,
          o.payment_method,
          o.created_at,
          o.business_id,
          b.business_group_id
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
      const userEmail = await this.getUserEmail(order.client_id);

      if (!userEmail) {
        this.logger.warn(`⚠️ No se pudo obtener email del usuario ${order.client_id} para enviar correo de confirmación`);
        return;
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
      const orderTotal = `$${parseFloat(order.total_amount).toFixed(2)}`;
      const paymentMethod = order.payment_method || 'No especificado';
      const orderUrl = `${process.env.FRONTEND_URL || 'https://agoramp.mx'}/orders/${order.id}`;

      // Enviar correo
      await this.emailService.sendOrderConfirmationEmail(
        userEmail,
        orderNumber,
        orderDate,
        orderTotal,
        paymentMethod,
        orderUrl,
        order.business_id,
        order.business_group_id
      );
    } catch (error: any) {
      this.logger.error(`❌ Error en sendOrderConfirmationEmail para orden ${orderId}:`, error);
      // No lanzar error para no interrumpir el flujo
    }
  }
}

