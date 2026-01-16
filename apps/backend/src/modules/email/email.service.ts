import {
  Injectable,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { dbPool } from '../../config/database.config';
import { EmailTriggerType } from '../email-templates/dto/create-email-template.dto';

export interface EmailVariables {
  [key: string]: string | number | undefined;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
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
      this.logger.error(`Error obteniendo template para ${triggerType}:`, error);
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
    businessGroupId?: string
  ): Promise<void> {
    if (!this.transporter) {
      this.logger.warn('⚠️ Transporter no inicializado. No se puede enviar correo.');
      return;
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
        return;
      }

      // Reemplazar variables en el template
      const html = this.replaceVariables(template.template_html, variables);
      const subject = this.replaceVariables(template.subject, variables);

      if (process.env.NODE_ENV !== 'production') {
        this.logger.debug(
          `Contenido generado: subjectLength=${subject.length} htmlLength=${html.length}`
        );
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
    } catch (error: any) {
      this.logger.error(`❌ Error enviando correo a ${to}:`, error);
      // No lanzar error para no interrumpir el flujo principal
      // Solo loguear el error
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
    businessGroupId?: string
  ): Promise<void> {
    await this.sendEmail(
      userEmail,
      EmailTriggerType.USER_REGISTRATION,
      {
        user_name: userName,
        dashboard_url: dashboardUrl || process.env.FRONTEND_URL || 'https://agoramp.mx',
      },
      businessId,
      businessGroupId
    );
  }

  /**
   * Envía correo de confirmación de pedido
   */
  async sendOrderConfirmationEmail(
    userEmail: string,
    orderNumber: string,
    orderDate: string,
    orderTotal: string,
    paymentMethod: string,
    orderUrl?: string,
    businessId?: string,
    businessGroupId?: string
  ): Promise<void> {
    await this.sendEmail(
      userEmail,
      EmailTriggerType.ORDER_CONFIRMATION,
      {
        order_number: orderNumber,
        order_date: orderDate,
        order_total: orderTotal,
        payment_method: paymentMethod,
        order_url: orderUrl || `${process.env.FRONTEND_URL || 'https://agoramp.mx'}/orders/${orderNumber}`,
      },
      businessId,
      businessGroupId
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
    businessGroupId?: string
  ): Promise<void> {
    await this.sendEmail(
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
      businessGroupId
    );
  }
}

