import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { dbPool } from '../../config/database.config';
import { supabaseAdmin } from '../../config/supabase.config';
import { BusinessUsersService } from '../business-users/business-users.service';
import { EmailService } from '../email/email.service';
import { EmailTriggerType } from '../email-templates/dto/create-email-template.dto';
import { SendCustomEmailDto } from './dto/send-custom-email.dto';
import { ListMessagesDto } from './dto/list-messages.dto';
import { ListInboxDto } from './dto/list-inbox.dto';

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function plainTextToHtml(body: string) {
  const safe = escapeHtml(body);
  return `<div style="white-space: pre-wrap; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #111827;">${safe}</div>`;
}

@Injectable()
export class MessagesService {
  constructor(
    private readonly businessUsersService: BusinessUsersService,
    private readonly emailService: EmailService,
  ) {}

  private async assertCanManageMessages(userId: string, businessId: string) {
    const allowed = await this.businessUsersService.userCanManageOrdersForBusiness(userId, businessId);
    if (!allowed) {
      throw new ForbiddenException('No tienes permisos para enviar/ver mensajes de esta sucursal');
    }
  }

  private async getUserEmail(userId: string): Promise<string | null> {
    if (!supabaseAdmin) {
      return null;
    }
    try {
      const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (error) {
        return null;
      }
      return data?.user?.email || null;
    } catch {
      return null;
    }
  }

  private async resolveRecipient(dto: SendCustomEmailDto): Promise<{ toEmail: string; toUserId: string | null }> {
    if (dto.to_email) {
      const toEmail = dto.to_email.trim();
      let toUserId: string | null = dto.to_user_id || null;
      // Si no se envió user_id explícito, intentar resolverlo por email (para habilitar inbox del cliente).
      if (!toUserId && dbPool) {
        try {
          const r = await dbPool.query<{ id: string }>(
            `SELECT id FROM auth.users WHERE lower(email) = lower($1) LIMIT 1`,
            [toEmail],
          );
          toUserId = r.rows[0]?.id || null;
        } catch {
          // ignore
        }
      }
      return { toEmail, toUserId };
    }
    if (dto.to_user_id) {
      const email = await this.getUserEmail(dto.to_user_id);
      if (!email) throw new BadRequestException('No se pudo resolver el email del usuario destino');
      return { toEmail: email, toUserId: dto.to_user_id };
    }
    if (dto.order_id) {
      if (!dbPool) throw new ServiceUnavailableException('Conexión a base de datos no configurada');
      const r = await dbPool.query<{ client_id: string }>(
        `SELECT client_id FROM orders.orders WHERE id = $1`,
        [dto.order_id],
      );
      const clientId = r.rows[0]?.client_id;
      if (!clientId) throw new NotFoundException('Pedido no encontrado para resolver destinatario');
      const email = await this.getUserEmail(clientId);
      if (!email) throw new BadRequestException('No se pudo resolver el email del cliente del pedido');
      return { toEmail: email, toUserId: clientId };
    }
    throw new BadRequestException('Debes enviar to_email, to_user_id u order_id');
  }

  async sendCustomEmail(currentUserId: string, dto: SendCustomEmailDto) {
    if (!dbPool) throw new ServiceUnavailableException('Conexión a base de datos no configurada');

    await this.assertCanManageMessages(currentUserId, dto.business_id);

    const businessResult = await dbPool.query<{ name: string; business_group_id: string | null }>(
      `SELECT name, business_group_id FROM core.businesses WHERE id = $1`,
      [dto.business_id],
    );
    if (businessResult.rows.length === 0) {
      throw new NotFoundException('Sucursal no encontrada');
    }
    const businessName = businessResult.rows[0]!.name;
    const resolvedGroupId = dto.business_group_id ?? businessResult.rows[0]!.business_group_id ?? null;

    const { toEmail, toUserId } = await this.resolveRecipient(dto);

    const bodyHtml = plainTextToHtml(dto.body);
    const variables = {
      subject: dto.subject,
      message_body: bodyHtml,
      business_name: businessName,
      to_email: toEmail,
    };

    const insert = await dbPool.query<{ id: string }>(
      `INSERT INTO communication.outbound_messages (
        business_id,
        business_group_id,
        created_by_user_id,
        to_user_id,
        to_email,
        subject,
        body_html,
        trigger_type,
        variables,
        status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,'queued')
      RETURNING id`,
      [
        dto.business_id,
        resolvedGroupId,
        currentUserId,
        toUserId,
        toEmail,
        dto.subject,
        bodyHtml,
        'custom_message',
        JSON.stringify(variables),
      ],
    );
    const messageId = insert.rows[0]!.id;

    const status = await this.emailService.sendEmail(
      toEmail,
      EmailTriggerType.CUSTOM_MESSAGE,
      variables,
      dto.business_id,
      resolvedGroupId || undefined,
      { userId: toUserId || undefined },
    );

    const persistedStatus = status === 'success' ? 'sent' : status;
    const markSentAt = persistedStatus === 'sent';

    await dbPool.query(
      `UPDATE communication.outbound_messages
       SET status = $2::varchar,
           sent_at = CASE WHEN $3::boolean THEN CURRENT_TIMESTAMP ELSE sent_at END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [messageId, persistedStatus, markSentAt],
    );

    return {
      id: messageId,
      status: persistedStatus,
      to_email: toEmail,
    };
  }

  async list(currentUserId: string, dto: ListMessagesDto) {
    if (!dbPool) throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    await this.assertCanManageMessages(currentUserId, dto.business_id);

    const limit = dto.limit ?? 20;
    const offset = dto.offset ?? 0;

    const where: string[] = ['business_id = $1'];
    const values: any[] = [dto.business_id];

    if (dto.to_email) {
      values.push(dto.to_email.trim());
      where.push(`to_email = $${values.length}`);
    }
    if (dto.status) {
      values.push(dto.status.trim());
      where.push(`status = $${values.length}`);
    }

    const countResult = await dbPool.query<{ total: string }>(
      `SELECT COUNT(*)::text as total
       FROM communication.outbound_messages
       WHERE ${where.join(' AND ')}`,
      values,
    );
    const total = parseInt(countResult.rows[0]?.total || '0', 10);

    values.push(limit);
    values.push(offset);
    const dataResult = await dbPool.query(
      `SELECT m.id, m.business_id, m.business_group_id, m.created_by_user_id, m.to_user_id, m.to_email,
              m.subject, m.body_html, m.trigger_type, m.status, m.error_message, m.created_at, m.sent_at, m.updated_at,
              b.name as business_name
       FROM communication.outbound_messages m
       LEFT JOIN core.businesses b ON b.id = m.business_id
       WHERE ${where.map((w) => w.replace(/\bbusiness_id\b/g, 'm.business_id')).join(' AND ')}
       ORDER BY m.created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );

    return { total, items: dataResult.rows, limit, offset };
  }

  async getById(currentUserId: string, businessId: string, id: string) {
    if (!dbPool) throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    await this.assertCanManageMessages(currentUserId, businessId);

    const r = await dbPool.query(
      `SELECT id, business_id, business_group_id, created_by_user_id, to_user_id, to_email,
              subject, body_html, trigger_type, variables, status, error_message, created_at, sent_at, updated_at
       FROM communication.outbound_messages
       WHERE id = $1 AND business_id = $2`,
      [id, businessId],
    );
    if (r.rows.length === 0) throw new NotFoundException('Mensaje no encontrado');
    return r.rows[0];
  }

  async listInbox(currentUserId: string, dto: ListInboxDto) {
    if (!dbPool) throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    const limit = dto.limit ?? 20;
    const offset = dto.offset ?? 0;

    const where: string[] = ['m.to_user_id = $1'];
    const values: any[] = [currentUserId];

    if (dto.business_id) {
      values.push(dto.business_id);
      where.push(`m.business_id = $${values.length}`);
    }

    const countResult = await dbPool.query<{ total: string }>(
      `SELECT COUNT(*)::text as total
       FROM communication.outbound_messages m
       WHERE ${where.join(' AND ')}`,
      values,
    );
    const total = parseInt(countResult.rows[0]?.total || '0', 10);

    values.push(limit);
    values.push(offset);
    const dataResult = await dbPool.query(
      `SELECT m.id, m.business_id, m.business_group_id, m.to_user_id, m.to_email,
              m.subject, m.body_html, m.trigger_type, m.status, m.error_message, m.read_at, m.created_at, m.sent_at, m.updated_at,
              b.name as business_name
       FROM communication.outbound_messages m
       LEFT JOIN core.businesses b ON b.id = m.business_id
       WHERE ${where.join(' AND ')}
       ORDER BY m.created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );

    return { total, items: dataResult.rows, limit, offset };
  }

  async unreadCount(currentUserId: string, dto: ListInboxDto) {
    if (!dbPool) throw new ServiceUnavailableException('ConexiÃ³n a base de datos no configurada');

    const where: string[] = ['m.to_user_id = $1', 'm.read_at IS NULL'];
    const values: any[] = [currentUserId];

    if (dto.business_id) {
      values.push(dto.business_id);
      where.push(`m.business_id = $${values.length}`);
    }

    const r = await dbPool.query<{ total: string }>(
      `SELECT COUNT(*)::text as total
       FROM communication.outbound_messages m
       WHERE ${where.join(' AND ')}`,
      values,
    );

    return { unread: parseInt(r.rows[0]?.total || '0', 10) };
  }

  async markInboxRead(currentUserId: string, id: string) {
    if (!dbPool) throw new ServiceUnavailableException('ConexiÃ³n a base de datos no configurada');

    const r = await dbPool.query(
      `UPDATE communication.outbound_messages
       SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND to_user_id = $2
       RETURNING id, read_at`,
      [id, currentUserId],
    );

    if (r.rows.length === 0) {
      throw new NotFoundException('Mensaje no encontrado');
    }

    return r.rows[0];
  }
}
