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
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

