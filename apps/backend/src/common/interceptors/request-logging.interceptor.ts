import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Interceptor para loguear el body de los requests antes de la validación
 * Útil para debugging de problemas de validación
 */
@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body } = request;

    // Solo loguear requests POST/PATCH que tengan body
    if ((method === 'POST' || method === 'PATCH') && body) {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[RequestLoggingInterceptor] Body recibido:', {
          method,
          url,
          body: JSON.stringify(body, null, 2),
          bodyType: typeof body,
          productId: body.productId,
          productIdType: typeof body.productId,
          productIdLength: body.productId?.length,
          productIdValue: body.productId ? `"${body.productId}"` : 'undefined',
        });
      }
    }

    return next.handle().pipe(
      tap(() => {
        // Log después de procesar (opcional)
      }),
    );
  }
}

