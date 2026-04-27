import { Injectable, Logger } from '@nestjs/common';
import { dbPool } from '../../config/database.config';

export type IntegrationCartExecutionInsert = {
  httpMethod: string;
  path: string;
  routePath: string | null;
  pathParams: Record<string, unknown> | null;
  queryParams: Record<string, unknown> | null;
  bodyParams: Record<string, unknown> | null;
  statusCode: number;
  success: boolean;
  durationMs: number;
  errorName: string | null;
  errorMessage: string | null;
  cartId: string | null;
  storeId: string | null;
  responseSummary: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
};

@Injectable()
export class IntegrationCartExecutionLogService {
  private readonly logger = new Logger(IntegrationCartExecutionLogService.name);

  async record(row: IntegrationCartExecutionInsert): Promise<void> {
    if (!dbPool) {
      return;
    }
    try {
      await dbPool.query(
        `INSERT INTO bitacora.integration_cart_executions (
          http_method, path, route_path,
          path_params, query_params, body_params,
          status_code, success, duration_ms,
          error_name, error_message,
          cart_id, store_id,
          response_summary, metadata
        ) VALUES (
          $1, $2, $3,
          $4::jsonb, $5::jsonb, $6::jsonb,
          $7, $8, $9,
          $10, $11,
          $12::uuid, $13::uuid,
          $14::jsonb, $15::jsonb
        )`,
        [
          row.httpMethod,
          row.path,
          row.routePath,
          row.pathParams ? JSON.stringify(row.pathParams) : null,
          row.queryParams ? JSON.stringify(row.queryParams) : null,
          row.bodyParams ? JSON.stringify(row.bodyParams) : null,
          row.statusCode,
          row.success,
          row.durationMs,
          row.errorName,
          row.errorMessage,
          row.cartId,
          row.storeId,
          row.responseSummary ? JSON.stringify(row.responseSummary) : null,
          row.metadata ? JSON.stringify(row.metadata) : null,
        ],
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`No se pudo escribir bitácora integration_cart: ${msg}`);
    }
  }
}
