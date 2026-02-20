import {
  Injectable,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { dbPool } from '../../config/database.config';
import { EmailTriggerType } from '../email-templates/dto/create-email-template.dto';
import { IntegrationLogsService, IntegrationLogStatus } from '../settings/integration-logs.service';

export interface EmailVariables {
  [key: string]: string | number | undefined;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly integrationLogs: IntegrationLogsService) {
    this.initializeTransporter();
  }

  /**
   * Inicializa el transporter de nodemailer
   */
  private initializeTransporter() {
    // Configuración del servidor SMTP
    // Por ahora usamos configuración básica, se puede mejorar con variables de entorno
    const smtpConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true para 465, false para otros puertos
      auth: {
        user: process.env.SMTP_USER || 'contacto@agoramp.mx',
        pass: process.env.SMTP_PASSWORD || '',
      },
    };

    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(
        `SMTP config: host=${smtpConfig.host} port=${smtpConfig.port} secure=${smtpConfig.secure} user=${smtpConfig.auth.user} passConfigured=${Boolean(smtpConfig.auth.pass)}`
      );
    }

    // Si no hay contraseña configurada, no inicializar (el servicio no funcionará)
    if (!smtpConfig.auth.pass) {
      this.logger.warn(
        '⚠️ SMTP_PASSWORD no configurado. El servicio de correo no funcionará.'
      );
      return;
    }

    try {
      this.transporter = nodemailer.createTransport(smtpConfig);
      this.logger.log('✅ Transporter de correo inicializado');
    } catch (error: any) {
      this.logger.error('❌ Error inicializando transporter:', error);
    }
  }

  /**
   * Obtiene el template de correo desde la base de datos usando la función de resolución
   */
  private async getEmailTemplate(
    triggerType: EmailTriggerType,
    businessId?: string,
    businessGroupId?: string
  ): Promise<{ template_html: string; subject: string; available_variables: string[] } | null> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      if (process.env.NODE_ENV !== 'production') {
        this.logger.debug(
          `Resolviendo template: triggerType=${triggerType} businessId=${businessId || 'null'} businessGroupId=${businessGroupId || 'null'}`
        );
      }

      const query = `
        SELECT * FROM communication.get_email_template($1, $2, $3)
      `;

      const result = await dbPool.query(query, [
        triggerType,
        businessId || null,
        businessGroupId || null,
      ]);

      if (result.rows.length === 0) {
        this.logger.warn(`No se encontró template para trigger_type: ${triggerType}`);
        return null;
      }

      const row = result.rows[0];
      if (process.env.NODE_ENV !== 'production') {
        this.logger.debug(
          `Template resuelto: triggerType=${triggerType} subjectLength=${(row.subject || '').length} htmlLength=${(row.template_html || '').length}`
        );
      }
      return {
        template_html: row.template_html,
        subject: row.subject || '',
        available_variables: row.available_variables || [],
      };
    } catch (error: any) {
      const params = { triggerType, businessId: businessId ?? null, businessGroupId: businessGroupId ?? null };
      this.logger.error(
        `Error obteniendo template para ${triggerType}. Parámetros de búsqueda: triggerType=${params.triggerType}, businessId=${params.businessId}, businessGroupId=${params.businessGroupId}. ` +
          `Error PostgreSQL: ${error?.message ?? String(error)}${error?.code ? ` (código: ${error.code})` : ''}`,
        error?.stack
      );
      return null;
    }
  }

  /**
   * Genera información de diagnóstico cuando no se encuentra template
   */
  private async getEmailTemplateDebugInfo(
    triggerType: EmailTriggerType,
    businessId?: string,
    businessGroupId?: string
  ): Promise<{
    business_id: string | null;
    business_group_id_param: string | null;
    business_group_id_resolved: string | null;
    business_templates: { total: number; active: number; ids: string[] };
    group_templates: { total: number; active: number; ids: string[] };
    global_templates: { total: number; active: number; ids: string[] };
  } | null> {
    if (!dbPool) {
      return null;
    }

    try {
      let resolvedGroupId: string | null = null;
      if (businessId) {
        const groupResult = await dbPool.query(
          `SELECT business_group_id FROM core.businesses WHERE id = $1`,
          [businessId]
        );
        resolvedGroupId = groupResult.rows[0]?.business_group_id || null;
      } else {
        resolvedGroupId = businessGroupId || null;
      }

      const businessTemplatesResult = businessId
        ? await dbPool.query(
            `SELECT id, is_active FROM core.business_email_templates
             WHERE business_id = $1 AND trigger_type = $2`,
            [businessId, triggerType]
          )
        : { rows: [] as Array<{ id: string; is_active: boolean }> };

      const groupTemplatesResult = resolvedGroupId
        ? await dbPool.query(
            `SELECT id, is_active FROM core.business_group_email_templates
             WHERE business_group_id = $1 AND trigger_type = $2`,
            [resolvedGroupId, triggerType]
          )
        : { rows: [] as Array<{ id: string; is_active: boolean }> };

      const globalTemplatesResult = await dbPool.query(
        `SELECT id, is_active FROM communication.email_templates
         WHERE trigger_type = $1`,
        [triggerType]
      );

      const countActive = (rows: Array<{ is_active: boolean }>) =>
        rows.reduce((acc, row) => acc + (row.is_active ? 1 : 0), 0);

      return {
        business_id: businessId || null,
        business_group_id_param: businessGroupId || null,
        business_group_id_resolved: resolvedGroupId,
        business_templates: {
          total: businessTemplatesResult.rows.length,
          active: countActive(businessTemplatesResult.rows),
          ids: businessTemplatesResult.rows.map(row => row.id),
        },
        group_templates: {
          total: groupTemplatesResult.rows.length,
          active: countActive(groupTemplatesResult.rows),
          ids: groupTemplatesResult.rows.map(row => row.id),
        },
        global_templates: {
          total: globalTemplatesResult.rows.length,
          active: countActive(globalTemplatesResult.rows),
          ids: globalTemplatesResult.rows.map(row => row.id),
        },
      };
    } catch (error: any) {
      this.logger.error(`Error obteniendo debug de template para ${triggerType}:`, error);
      return null;
    }
  }

  /**
   * Reemplaza las variables en el template HTML y subject
   */
  private replaceVariables(
    template: string,
    variables: EmailVariables
  ): string {
    let result = template;

    // Reemplazar variables en formato {{variable_name}}
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, String(value || ''));
    }

    return result;
  }

  /**
   * Envía un correo electrónico
   */
  async sendEmail(
    to: string,
    triggerType: EmailTriggerType,
    variables: EmailVariables,
    businessId?: string,
    businessGroupId?: string,
    context?: { userId?: string; orderId?: string }
  ): Promise<IntegrationLogStatus> {
    if (!this.transporter) {
      this.logger.warn('⚠️ Transporter no inicializado. No se puede enviar correo.');
        this.logger.debug(`[Email] Log skipped: transporter no inicializado (trigger=${triggerType})`);
      await this.integrationLogs.log({
        integration: 'email',
        eventType: triggerType,
        channel: 'email',
        status: 'skipped',
        businessId,
        userId: context?.userId,
        orderId: context?.orderId,
        message: 'Transporter no inicializado',
        requestPayload: { to, variables },
      });
      return 'skipped';
    }

    try {
      if (process.env.NODE_ENV !== 'production') {
        this.logger.debug(
          `Preparando envío: to=${to} triggerType=${triggerType} businessId=${businessId || 'null'} businessGroupId=${businessGroupId || 'null'} variables=${Object.keys(variables).join(',')}`
        );
      }

      // Obtener template desde la base de datos
      const template = await this.getEmailTemplate(
        triggerType,
        businessId,
        businessGroupId
      );

      if (!template) {
        this.logger.warn(
          `No se encontró template para ${triggerType}. No se enviará correo.`
        );
        this.logger.debug(`[Email] Log skipped: template no encontrado (trigger=${triggerType})`);
        const debugInfo = await this.getEmailTemplateDebugInfo(
          triggerType,
          businessId,
          businessGroupId
        );
        await this.integrationLogs.log({
          integration: 'email',
          eventType: triggerType,
          channel: 'email',
          status: 'skipped',
          businessId,
        userId: context?.userId,
        orderId: context?.orderId,
          message: 'Template no encontrado',
          requestPayload: { to, variables },
          metadata: {
            trigger_type: triggerType,
            business_id: businessId || null,
            business_group_id: businessGroupId || null,
            resolver: 'communication.get_email_template(trigger_type, business_id, business_group_id)',
            debug: debugInfo,
          },
        });
        return 'skipped';
      }

      // Reemplazar variables en el template
      const html = this.replaceVariables(template.template_html, variables);
      const subject = this.replaceVariables(template.subject, variables);

      if (process.env.NODE_ENV !== 'production') {
        this.logger.debug(
          `Contenido generado: subjectLength=${subject.length} htmlLength=${html.length}`
        );
        // Log del template completo con datos del pedido (para diagnóstico de correo order_confirmation)
        if (triggerType === 'order_confirmation') {
          console.log('\n' + '='.repeat(80));
          console.log('[Email] TEMPLATE ENVIADO POR CORREO (order_confirmation)');
          console.log('='.repeat(80));
          console.log('Subject:', subject);
          console.log('HTML length:', html.length);
          console.log('--- HTML completo (inicio) ---');
          console.log(html);
          console.log('--- HTML completo (fin) ---');
          console.log('='.repeat(80) + '\n');
        }
      }

      // Configurar el correo
      const mailOptions = {
        from: `"AGORA" <${process.env.SMTP_USER || 'contacto@agoramp.mx'}>`,
        to,
        subject,
        html,
      };

      // Enviar correo
      const info = await this.transporter.sendMail(mailOptions);

      this.logger.log(`✅ Correo enviado exitosamente a ${to} (${triggerType})`);
      this.logger.debug(`Message ID: ${info.messageId}`);

      await this.integrationLogs.log({
        integration: 'email',
        eventType: triggerType,
        channel: 'email',
        status: 'success',
        businessId,
        userId: context?.userId,
        orderId: context?.orderId,
        message: `Correo enviado a ${to}`,
        requestPayload: { to, subject },
        responsePayload: { messageId: info.messageId },
      });
      this.logger.debug(`[Email] Log success guardado (trigger=${triggerType})`);
      return 'success';
    } catch (error: any) {
      this.logger.error(`❌ Error enviando correo a ${to}:`, error);
      await this.integrationLogs.log({
        integration: 'email',
        eventType: triggerType,
        channel: 'email',
        status: 'failed',
        businessId,
        userId: context?.userId,
        orderId: context?.orderId,
        message: `Error enviando correo a ${to}`,
        errorMessage: error?.message || String(error),
        requestPayload: { to, variables },
      });
      this.logger.debug(`[Email] Log failed guardado (trigger=${triggerType})`);
      // No lanzar error para no interrumpir el flujo principal
      // Solo loguear el error
      return 'failed';
    }
  }

  /**
   * Envía correo de bienvenida cuando un usuario se registra
   */
  async sendWelcomeEmail(
    userEmail: string,
    userName: string,
    dashboardUrl?: string,
    businessId?: string,
    businessGroupId?: string,
    context?: { userId?: string }
  ): Promise<IntegrationLogStatus> {
    return this.sendEmail(
      userEmail,
      EmailTriggerType.USER_REGISTRATION,
      {
        user_name: userName,
        dashboard_url: dashboardUrl || process.env.FRONTEND_URL || 'https://agoramp.mx',
      },
      businessId,
      businessGroupId,
      context
    );
  }

  /**
   * Envía correo de confirmación de pedido
   * @param orderItemsDetailHtml - HTML con la tabla/listado de items del pedido (variable {{order_items_detail}})
   */
  async sendOrderConfirmationEmail(
    userEmail: string,
    orderNumber: string,
    orderDate: string,
    orderTotal: string,
    paymentMethod: string,
    orderUrl?: string,
    orderItemsDetailHtml?: string,
    businessId?: string,
    businessGroupId?: string,
    context?: { userId?: string; orderId?: string }
  ): Promise<IntegrationLogStatus> {
    return this.sendEmail(
      userEmail,
      EmailTriggerType.ORDER_CONFIRMATION,
      {
        order_number: orderNumber,
        order_date: orderDate,
        order_total: orderTotal,
        payment_method: paymentMethod,
        order_url: orderUrl || `${process.env.FRONTEND_URL || 'https://agoramp.mx'}/orders/${orderNumber}`,
        order_items_detail: orderItemsDetailHtml ?? '',
      },
      businessId,
      businessGroupId,
      context
    );
  }

  /**
   * Envía correo de cambio de estado de pedido
   */
  async sendOrderStatusChangeEmail(
    userEmail: string,
    orderNumber: string,
    oldStatus: string,
    newStatus: string,
    statusMessage: string,
    orderUrl?: string,
    businessId?: string,
    businessGroupId?: string,
    context?: { userId?: string; orderId?: string }
  ): Promise<IntegrationLogStatus> {
    return this.sendEmail(
      userEmail,
      EmailTriggerType.ORDER_STATUS_CHANGE,
      {
        order_number: orderNumber,
        old_status: oldStatus,
        new_status: newStatus,
        status_message: statusMessage,
        order_url: orderUrl || `${process.env.FRONTEND_URL || 'https://agoramp.mx'}/orders/${orderNumber}`,
      },
      businessId,
      businessGroupId,
      context
    );
  }
}

