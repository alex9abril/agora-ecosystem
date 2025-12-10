import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Filtro global para manejar excepciones HTTP
 * 
 * Transforma todas las excepciones en un formato estándar de error
 */
@Catch()
@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Error interno del servidor';

    // Log detallado del error
    console.error('🔴 [EXCEPTION FILTER] ============================================');
    console.error('🔴 [EXCEPTION FILTER] Error capturado por HttpExceptionFilter');
    console.error('🔴 [EXCEPTION FILTER] Path:', request.url);
    console.error('🔴 [EXCEPTION FILTER] Method:', request.method);
    console.error('🔴 [EXCEPTION FILTER] Status:', status);
    console.error('🔴 [EXCEPTION FILTER] Exception type:', exception?.constructor?.name || typeof exception);
    console.error('🔴 [EXCEPTION FILTER] Exception:', exception);
    if (exception instanceof Error) {
      console.error('🔴 [EXCEPTION FILTER] Error message:', exception.message);
      console.error('🔴 [EXCEPTION FILTER] Error stack:', exception.stack);
    }
    if (exception && typeof exception === 'object' && 'code' in exception) {
      console.error('🔴 [EXCEPTION FILTER] Error code:', (exception as any).code);
      console.error('🔴 [EXCEPTION FILTER] Error detail:', (exception as any).detail);
      console.error('🔴 [EXCEPTION FILTER] Error hint:', (exception as any).hint);
    }
    console.error('🔴 [EXCEPTION FILTER] ============================================');

    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: typeof message === 'string' ? message : (message as any).message || message,
    };

    response.status(status).json(errorResponse);
  }
}

