import { Injectable, Logger } from '@nestjs/common';
import { dbPool } from '../../config/database.config';

export type IntegrationLogStatus = 'success' | 'failed' | 'skipped';

export type IntegrationLogPayload = {
  integration: string;
  eventType: string;
  channel?: string | null;
  status: IntegrationLogStatus;
  businessId?: string | null;
  userId?: string | null;
  orderId?: string | null;
  message?: string | null;
  errorMessage?: string | null;
  requestPayload?: Record<string, any> | null;
  responsePayload?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
};

@Injectable()
export class IntegrationLogsService {
  private readonly logger = new Logger(IntegrationLogsService.name);

  async log(payload: IntegrationLogPayload): Promise<void> {
    if (!dbPool) {
      return;
    }

    try {
      this.logger.debug(
        `[IntegrationLogs] Guardando log: ${payload.integration}:${payload.eventType} (${payload.status})`,
      );
      await dbPool.query(
        `INSERT INTO communication.integration_logs (
           integration,
           event_type,
           channel,
           status,
           business_id,
           user_id,
           order_id,
           message,
           error_message,
           request_payload,
           response_payload,
           metadata
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12::jsonb)`,
        [
          payload.integration,
          payload.eventType,
          payload.channel || null,
          payload.status,
          payload.businessId || null,
          payload.userId || null,
          payload.orderId || null,
          payload.message || null,
          payload.errorMessage || null,
          payload.requestPayload ? JSON.stringify(payload.requestPayload) : null,
          payload.responsePayload ? JSON.stringify(payload.responsePayload) : null,
          payload.metadata ? JSON.stringify(payload.metadata) : null,
        ],
      );
      this.logger.debug(
        `[IntegrationLogs] Log guardado: ${payload.integration}:${payload.eventType} (${payload.status})`,
      );
    } catch (error: any) {
      this.logger.error('Error registrando integration log:', error?.message || error);
    }
  }
}
