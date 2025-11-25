import { SetMetadata } from '@nestjs/common';

/**
 * Decorador para marcar endpoints como públicos (sin autenticación requerida)
 * 
 * @example
 * @Public()
 * @Get('health')
 * healthCheck() {
 *   return { status: 'ok' };
 * }
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

