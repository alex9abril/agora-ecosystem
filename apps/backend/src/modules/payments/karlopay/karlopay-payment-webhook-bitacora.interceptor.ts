import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import {
  KarlopayPaymentWebhookExecutionLogService,
  KarlopayPaymentWebhookExecutionInsert,
} from './karlopay-payment-webhook-execution-log.service';
import { sanitizeKarlopayWebhookBody, karlopayWebhookRequestMetadata } from './karlopay-payment-webhook-bitacora.util';

function pickUuidFromBody(body: Record<string, unknown> | null, keys: string[]): string | null {
  if (!body) return null;
  for (const k of keys) {
    const v = body[k];
    if (typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v)) {
      return v;
    }
  }
  return null;
}

@Injectable()
export class KarlopayPaymentWebhookBitacoraInterceptor implements NestInterceptor {
  constructor(private readonly executionLog: KarlopayPaymentWebhookExecutionLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const started = Date.now();

    const pathParams =
      request.params && Object.keys(request.params).length > 0 ? { ...request.params } : null;
    const queryParams =
      request.query && Object.keys(request.query).length > 0
        ? { ...request.query } as Record<string, unknown>
        : null;
    const bodyParams = sanitizeKarlopayWebhookBody(request.body);
    const routePath = (request as Request & { route?: { path?: string } }).route?.path ?? null;

    const flush = (data: unknown, err: Error | null): void => {
      const durationMs = Date.now() - started;
      let statusCode = response.statusCode;
      let success = true;
      let errorName: string | null = null;
      let errorMessage: string | null = null;

      if (err) {
        success = false;
        if (err instanceof HttpException) {
          statusCode = err.getStatus();
          errorName = err.constructor?.name ?? 'HttpException';
          const res = err.getResponse();
          errorMessage =
            typeof res === 'string'
              ? res
              : typeof res === 'object' && res && 'message' in res
                ? String((res as { message?: unknown }).message)
                : err.message;
        } else {
          statusCode = statusCode >= 400 ? statusCode : 500;
          errorName = err.constructor?.name ?? 'Error';
          errorMessage = err.message;
        }
      }

      const row: KarlopayPaymentWebhookExecutionInsert = {
        httpMethod: request.method,
        path: (request.originalUrl || request.url || '').split('?')[0],
        routePath,
        pathParams,
        queryParams,
        bodyParams,
        statusCode,
        success,
        durationMs,
        errorName,
        errorMessage,
        cartId: pickUuidFromBody(bodyParams, ['cartId', 'cart_id']),
        storeId: pickUuidFromBody(bodyParams, ['storeId', 'store_id']),
        responseSummary: success && data !== undefined ? (typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : { result: data }) : null,
        metadata: karlopayWebhookRequestMetadata(request, {
          source: 'karlopay_payment_webhook_handler',
          ...(err?.stack ? { exception_stack: err.stack.slice(0, 1500) } : {}),
        }),
      };

      void this.executionLog.record(row);
    };

    return next.handle().pipe(
      tap((data) => flush(data, null)),
      catchError((err: Error) => {
        flush(null, err);
        return throwError(() => err);
      }),
    );
  }
}
