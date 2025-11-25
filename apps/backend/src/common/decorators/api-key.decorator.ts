import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorador para obtener la información de la API key del request
 * 
 * @example
 * @ApiKeyAuth()
 * @Get('data')
 * getData(@ApiKey() apiKey: ApiKeyInfo) {
 *   return { app: apiKey.applicationName };
 * }
 */
export interface ApiKeyInfo {
  id: string;
  applicationId: string;
  applicationName: string;
  appType: string;
  scopes: string[];
}

export const ApiKey = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ApiKeyInfo => {
    const request = ctx.switchToHttp().getRequest();
    return request.apiKey;
  },
);

