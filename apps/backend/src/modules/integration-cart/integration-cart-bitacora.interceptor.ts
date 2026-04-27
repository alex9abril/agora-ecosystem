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
  IntegrationCartExecutionLogService,
  IntegrationCartExecutionInsert,
} from './integration-cart-execution-log.service';
import { sanitizeBody, sanitizeQuery, bitacoraRequestMetadata } from './integration-cart-bitacora.util';

function summarizeResponse(data: unknown): Record<string, unknown> | null {
  if (data === null || data === undefined) {
    return null;
  }
  if (typeof data !== 'object' || Array.isArray(data)) {
    return { type: typeof data, preview: String(data).slice(0, 500) };
  }
  const o = data as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(o)) {
    const v = o[k];
    if (k === 'items' && Array.isArray(v)) {
      out.items_count = v.length;
      continue;
    }
    if (k === 'token' || k === 'url' || k === 'checkout_url') {
      out[k] = typeof v === 'string' && v.length > 0 ? '[present]' : v;
      continue;
    }
    if (Array.isArray(v)) {
      out[k] = { length: v.length };
    } else if (typeof v === 'object' && v !== null) {
      out[k] = '[object]';
    } else {
      out[k] = v;
    }
  }
  return out;
}

function pickCartId(params: Record<string, string>, data: unknown): string | null {
  const fromParams = params?.cartId;
  if (fromParams && /^[0-9a-f-]{36}$/i.test(fromParams)) {
    return fromParams;
  }
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const id = (data as Record<string, unknown>).id;
    if (typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)) {
      return id;
    }
    const cartId = (data as Record<string, unknown>).cartId;
    if (typeof cartId === 'string' && /^[0-9a-f-]{36}$/i.test(cartId)) {
      return cartId;
    }
  }
  return null;
}

function pickStoreId(body: Record<string, unknown> | null, data: unknown): string | null {
  if (body?.storeId && typeof body.storeId === 'string' && /^[0-9a-f-]{36}$/i.test(body.storeId)) {
    return body.storeId;
  }
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const sid = (data as Record<string, unknown>).store_id;
    if (typeof sid === 'string' && /^[0-9a-f-]{36}$/i.test(sid)) {
      return sid;
    }
  }
  return null;
}

@Injectable()
export class IntegrationCartBitacoraInterceptor implements NestInterceptor {
  constructor(private readonly executionLog: IntegrationCartExecutionLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const started = Date.now();

    const pathParams =
      request.params && Object.keys(request.params).length > 0 ? { ...request.params } : null;
    const queryParams =
      request.query && Object.keys(request.query).length > 0
        ? sanitizeQuery(request.query as Record<string, unknown>)
        : null;
    const bodyParams = sanitizeBody(request.body);

    const routePath = (request as Request & { route?: { path?: string } }).route?.path ?? null;

    const buildMetadata = (extra?: Record<string, unknown>): Record<string, unknown> =>
      bitacoraRequestMetadata(request, { source: 'integration_cart_controller', ...extra });

    const flush = (
      data: unknown,
      err: Error | null,
    ): void => {
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
            typeof res === 'string' ? res : typeof res === 'object' && res && 'message' in res
              ? String((res as { message?: unknown }).message)
              : err.message;
        } else {
          statusCode = statusCode >= 400 ? statusCode : 500;
          errorName = err.constructor?.name ?? 'Error';
          errorMessage = err.message;
        }
      }

      const cartId = pickCartId(request.params as Record<string, string>, data);
      const storeId = pickStoreId(bodyParams, data);

      const row: IntegrationCartExecutionInsert = {
        httpMethod: request.method,
        path: (request.originalUrl || request.url || '').split('?')[0],
        routePath: routePath,
        pathParams,
        queryParams,
        bodyParams,
        statusCode,
        success,
        durationMs,
        errorName,
        errorMessage,
        cartId,
        storeId,
        responseSummary: success ? summarizeResponse(data) : null,
        metadata: buildMetadata(err ? { exception_stack: err.stack?.slice(0, 1500) } : undefined),
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
