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
      console.log('[EmailService.getEmailTemplate] Buscando template:', { triggerType, businessId: businessId ?? null, businessGroupId: businessGroupId ?? null });

      const query = `
        SELECT * FROM communication.get_email_template($1, $2, $3)
      `;

      const result = await dbPool.query(query, [
        triggerType,
        businessId || null,
        businessGroupId || null,
      ]);

      if (result.rows.length === 0) {
        console.warn('[EmailService.getEmailTemplate] No se encontró template para trigger_type:', triggerType);
        this.logger.warn(`No se encontró template para trigger_type: ${triggerType}`);
        return null;
      }

      const row = result.rows[0];
      const level = (row as { level?: string }).level ?? 'unknown';
      console.log('[EmailService.getEmailTemplate] Template encontrado:', { triggerType, level, subjectLength: (row.subject || '').length, htmlLength: (row.template_html || '').length });
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
      console.warn('[EmailService.sendEmail] Transporter no inicializado (SMTP no configurado). No se envía correo desde nuestro aplicativo. trigger=', triggerType);
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
        console.warn('[EmailService.sendEmail] No se enviará correo desde nuestro aplicativo: template no encontrado para', triggerType);
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
      let html = this.replaceVariables(template.template_html, variables);
      const subject = this.replaceVariables(template.subject, variables);

      // Fallback: si el template no tenía {{delivery_detail_section}} pero se proporcionó contenido,
      // inyectarlo antes del botón de acción (primer <a href= que contenga el order_url ya resuelto)
      const deliveryContent = variables.delivery_detail_section;
      if (
        deliveryContent &&
        !template.template_html.includes('{{delivery_detail_section}}')
      ) {
        const btnMatch = html.match(/<div[^>]*text-align:\s*center[^>]*>\s*<a\s+href=/i);
        if (btnMatch && btnMatch.index !== undefined) {
          html = html.slice(0, btnMatch.index) + deliveryContent + html.slice(btnMatch.index);
        } else {
          const closingBody = html.lastIndexOf('</body>');
          if (closingBody !== -1) {
            html = html.slice(0, closingBody) + deliveryContent + html.slice(closingBody);
          }
        }
      }

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

      console.log('[EmailService.sendEmail] Correo enviado desde nuestro aplicativo:', { to, triggerType, messageId: info.messageId });
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
      console.error('[EmailService.sendEmail] Error enviando correo desde nuestro aplicativo:', { to, triggerType, error: error?.message ?? String(error) });
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
   * Envía correo de cambio de estado de pedido.
   * Las plantillas en BD usan previous_status, current_status y user_name; se mantienen old_status/new_status por compatibilidad.
   */
  async sendOrderStatusChangeEmail(
    userEmail: string,
    orderNumber: string,
    oldStatus: string,
    newStatus: string,
    previousStatusLabel: string,
    currentStatusLabel: string,
    userName: string,
    statusMessage: string,
    orderUrl?: string,
    businessId?: string,
    businessGroupId?: string,
    context?: { userId?: string; orderId?: string },
    deliveryDetailHtml?: string,
  ): Promise<IntegrationLogStatus> {
    return this.sendEmail(
      userEmail,
      EmailTriggerType.ORDER_STATUS_CHANGE,
      {
        order_number: orderNumber,
        user_name: userName,
        previous_status: previousStatusLabel,
        current_status: currentStatusLabel,
        old_status: oldStatus,
        new_status: newStatus,
        status_message: statusMessage,
        order_url: orderUrl || `${process.env.FRONTEND_URL || 'https://agoramp.mx'}/orders/${orderNumber}`,
        delivery_detail_section: deliveryDetailHtml || '',
      },
      businessId,
      businessGroupId,
      context
    );
  }

  /**
   * Envía notificación genérica a un supervisor/destinatario configurado.
   * Las variables genéricas permiten adaptar el template a cualquier evento.
   */
  async sendSupervisorNotificationEmail(
    recipientEmail: string,
    businessName: string,
    eventTitle: string,
    eventDescription: string,
    detailSectionHtml: string,
    actionUrl: string,
    businessId?: string,
    businessGroupId?: string,
    context?: { userId?: string; orderId?: string }
  ): Promise<IntegrationLogStatus> {
    return this.sendEmail(
      recipientEmail,
      EmailTriggerType.SUPERVISOR_NOTIFICATION,
      {
        business_name: businessName,
        event_title: eventTitle,
        event_description: eventDescription,
        detail_section: detailSectionHtml,
        action_url: actionUrl,
      },
      businessId,
      businessGroupId,
      context
    );
  }

  /**
   * Envía correo de confirmación de email con el link generado por Supabase.
   * Se usa como alternativa confiable cuando admin.createUser no dispara el correo de Supabase.
   */
  async sendEmailConfirmation(
    userEmail: string,
    userName: string,
    confirmationLink: string,
    context?: { userId?: string },
  ): Promise<IntegrationLogStatus> {
    if (!this.transporter) {
      console.warn('[EmailService.sendEmailConfirmation] Transporter no inicializado. No se envía correo de confirmación.');
      return 'skipped';
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #333333;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #333333;">
<tr>
<td align="center" style="padding: 40px 20px 60px 20px;">
  <img src="https://agoramp.mx/_next/static/media/agora_logo_white.7075c997.png" alt="AGORA" style="max-width: 180px; height: auto;" />
</td>
</tr>
<tr>
<td align="center" style="padding: 0 20px;">
<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 16px;">
<tr>
<td style="padding: 50px 40px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <div style="display: inline-block; width: 80px; height: 80px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 50%; line-height: 80px; font-size: 36px;">✉️</div>
  </div>
  <h1 style="text-align: center; font-size: 26px; font-weight: 700; color: #111827; margin: 0 0 16px 0;">Confirma tu correo electrónico</h1>
  <p style="text-align: center; font-size: 16px; color: #4b5563; margin: 0 0 10px 0; line-height: 1.6;">Hola ${userName},</p>
  <p style="text-align: center; font-size: 16px; color: #4b5563; margin: 0 0 30px 0; line-height: 1.6;">Gracias por registrarte en AGORA. Para activar tu cuenta, confirma tu dirección de correo electrónico haciendo clic en el botón.</p>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
  <tr>
  <td align="center" style="padding: 10px 0 30px 0;">
    <a href="${confirmationLink}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; font-family: Arial, sans-serif;">Confirmar mi correo</a>
  </td>
  </tr>
  </table>
  <p style="text-align: center; font-size: 13px; color: #9ca3af; margin: 0 0 10px 0;">Si no creaste esta cuenta, puedes ignorar este mensaje.</p>
  <p style="text-align: center; font-size: 13px; color: #9ca3af; margin: 0;">Este enlace expira en 24 horas.</p>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td align="center" style="padding: 20px;">
  <p style="font-size: 12px; color: #9ca3af; margin: 0;">© ${new Date().getFullYear()} AGORA. Todos los derechos reservados.</p>
</td>
</tr>
</table>
</body>
</html>`;

    try {
      const mailOptions = {
        from: `"AGORA" <${process.env.SMTP_USER || 'contacto@agoramp.mx'}>`,
        to: userEmail,
        subject: 'Confirma tu correo electrónico — AGORA',
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('[EmailService.sendEmailConfirmation] Correo de confirmación enviado:', { to: userEmail, messageId: info.messageId });

      await this.integrationLogs.log({
        integration: 'email',
        eventType: 'email_confirmation',
        channel: 'email',
        status: 'success',
        userId: context?.userId,
        message: 'Correo de confirmación enviado',
        requestPayload: { to: userEmail },
      });

      return 'success';
    } catch (error: any) {
      console.error('[EmailService.sendEmailConfirmation] Error enviando correo de confirmación:', error?.message);

      await this.integrationLogs.log({
        integration: 'email',
        eventType: 'email_confirmation',
        channel: 'email',
        status: 'failed',
        userId: context?.userId,
        message: error?.message || 'Error desconocido',
        requestPayload: { to: userEmail },
      });

      return 'failed';
    }
  }
}

