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

    // Ignorar errores de Socket.IO si no está configurado (404, 401, 403)
    // Algo (navegador, extensión o cliente) intenta conectar a /socket.io/ pero el backend no tiene Socket.IO.
    const path = request.url ?? request.originalUrl ?? request.path ?? '';
    const isSocketIo = typeof path === 'string' && path.includes('/socket.io/');
    if (isSocketIo && [HttpStatus.NOT_FOUND, HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN].includes(status)) {
      return response.status(status).json({
        success: false,
        statusCode: status,
        message: 'Not Found',
      });
    }

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

    let messageStr: string;
    let details: Record<string, unknown> | undefined;
    if (typeof message === 'string') {
      messageStr = message;
    } else if (message && typeof message === 'object' && 'message' in (message as object)) {
      const obj = message as Record<string, unknown>;
      const m = obj.message;
      if (Array.isArray(m)) messageStr = String(m[0] ?? m);
      else if (m !== undefined && m !== null) messageStr = String(m);
      else messageStr = 'Solicitud inválida';
      const { message: _m, error: _err, statusCode: _st, ...rest } = obj;
      if (Object.keys(rest).length > 0) details = rest;
    } else {
      messageStr = typeof message === 'object' && message !== null ? JSON.stringify(message) : String(message);
    }

    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: messageStr,
      ...(details ? { details } : {}),
    };

    response.status(status).json(errorResponse);
  }
}

