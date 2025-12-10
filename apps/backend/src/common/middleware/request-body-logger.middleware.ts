import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware para loguear el body de los requests antes de la validación
 * Se ejecuta ANTES del ValidationPipe, por lo que puede ayudar a debuggear problemas de validación
 */
@Injectable()
export class RequestBodyLoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Solo loguear requests POST/PATCH que tengan body
    if ((req.method === 'POST' || req.method === 'PATCH') && req.body) {
      console.log('📥 [RequestBodyLoggerMiddleware] Request body ANTES de validación:', {
        method: req.method,
        url: req.url,
        body: JSON.stringify(req.body, null, 2),
        productId: req.body.productId,
        productIdType: typeof req.body.productId,
        productIdLength: req.body.productId?.length,
        productIdValue: req.body.productId ? `"${req.body.productId}"` : 'undefined',
        productIdRaw: req.body.productId,
      });
    }
    next();
  }
}

