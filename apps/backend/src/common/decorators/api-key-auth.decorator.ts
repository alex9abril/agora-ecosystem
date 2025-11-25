import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { ApiKeysGuard } from '../guards/api-keys.guard';
import { ApiSecurity } from '@nestjs/swagger';

/**
 * Decorador para marcar endpoints que requieren autenticación por API Key
 * 
 * @example
 * @ApiKeyAuth()
 * @Get('data')
 * getData() {
 *   return { data: 'protected' };
 * }
 */
export const API_KEY_AUTH_KEY = 'apiKeyAuth';

export const ApiKeyAuth = () => {
  return applyDecorators(
    UseGuards(ApiKeysGuard),
    ApiSecurity('ApiKey'),
    SetMetadata(API_KEY_AUTH_KEY, true),
  );
};

