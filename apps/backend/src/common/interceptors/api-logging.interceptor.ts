import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { ApiKeysService } from '../../modules/api-keys/api-keys.service';

/**
 * Interceptor para registrar todas las peticiones a la API
 * 
 * Registra en la base de datos información sobre cada request:
 * - API Key usada
 * - Endpoint
 * - Método HTTP
 * - Status code
 * - Tiempo de respuesta
 * - IP, User Agent, etc.
 */
@Injectable()
export class ApiLoggingInterceptor implements NestInterceptor {
  constructor(private apiKeysService: ApiKeysService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: (data) => {
          this.logRequest(request, response, Date.now() - startTime, null, data);
        },
        error: (error) => {
          this.logRequest(
            request,
            response,
            Date.now() - startTime,
            error.message || 'Unknown error',
            null,
          );
        },
      }),
    );
  }

  private logRequest(
    request: Request,
    response: Response,
    responseTimeMs: number,
    errorMessage: string | null,
    responseBody: any,
  ) {
    const apiKeyInfo = (request as any).apiKey;

    // No bloquear el request si falla el logging
    this.apiKeysService.logRequest({
      apiKeyId: apiKeyInfo?.id,
      applicationId: apiKeyInfo?.applicationId,
      method: request.method,
      endpoint: request.url.split('?')[0], // Sin query params
      statusCode: response.statusCode,
      responseTimeMs,
      requestSizeBytes: request.headers['content-length']
        ? parseInt(request.headers['content-length'] as string)
        : undefined,
      responseSizeBytes: responseBody
        ? JSON.stringify(responseBody).length
        : undefined,
      ipAddress: (request.ip || request.headers['x-forwarded-for'] || request.connection.remoteAddress) as string,
      userAgent: request.headers['user-agent'],
      requestBody: this.shouldLogBody(request.method) ? request.body : undefined,
      responseBody: this.shouldLogBody(request.method) ? responseBody : undefined,
      errorMessage,
    });
  }

  /**
   * Determina si se debe loggear el body del request/response
   * Por seguridad, no loggear bodies de requests grandes o sensibles
   */
  private shouldLogBody(method: string): boolean {
    // Solo loggear bodies de métodos que no sean sensibles
    return ['GET', 'HEAD'].includes(method);
  }
}

