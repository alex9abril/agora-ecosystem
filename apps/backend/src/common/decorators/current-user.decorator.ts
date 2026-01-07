import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@supabase/supabase-js';

/**
 * Decorador para obtener el usuario autenticado actual
 * 
 * @example
 * @Get('profile')
 * getProfile(@CurrentUser() user: User) {
 *   return user;
 * }
 * 
 * @example
 * @Get('profile')
 * getProfile(@CurrentUser('id') userId: string) {
 *   return userId;
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext): User | string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as User | undefined;
    
    if (!user) {
      return undefined;
    }
    
    // Si se especifica un campo, extraerlo del objeto usuario
    if (data && typeof data === 'string') {
      return (user as any)[data];
    }
    
    // Si no se especifica campo, devolver el objeto completo
    return user;
  },
);

