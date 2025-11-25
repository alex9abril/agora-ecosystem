import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiKeysService } from '../../modules/api-keys/api-keys.service';

/**
 * Guard de autenticación por API Key
 * 
 * Valida API Keys para autenticación de aplicaciones.
 * Las API Keys se envían en el header X-API-Key o Authorization: Bearer <key>
 */
@Injectable()
export class ApiKeysGuard implements CanActivate {
  constructor(private apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException('API Key no proporcionada. Usa header X-API-Key o Authorization: Bearer <key>');
    }

    try {
      const keyInfo = await this.apiKeysService.validateApiKey(apiKey);

      if (!keyInfo) {
        throw new UnauthorizedException('API Key inválida, expirada o revocada');
      }

      // Adjuntar información de la API key al request
      request.apiKey = {
        id: keyInfo.keyId,
        applicationId: keyInfo.applicationId,
        applicationName: keyInfo.applicationName,
        appType: keyInfo.appType,
        scopes: keyInfo.scopes,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Error al validar API Key');
    }
  }

  /**
   * Extrae la API Key del request
   * Busca en:
   * 1. Header X-API-Key
   * 2. Header Authorization: Bearer <key>
   */
  private extractApiKey(request: Request): string | undefined {
    // Intentar desde X-API-Key
    const apiKeyHeader = request.headers['x-api-key'] as string;
    if (apiKeyHeader) {
      return apiKeyHeader.trim();
    }

    // Intentar desde Authorization: Bearer
    const authHeader = request.headers.authorization;
    if (authHeader) {
      const [type, token] = authHeader.split(' ');
      if (type === 'Bearer' || type === 'ApiKey') {
        return token?.trim();
      }
    }

    return undefined;
  }
}

// Extender el tipo Request para incluir la información de API key
declare module 'express' {
  interface Request {
    apiKey?: {
      id: string;
      applicationId: string;
      applicationName: string;
      appType: string;
      scopes: string[];
    };
  }
}

