import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { supabase } from '../../config/supabase.config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Guard de autenticación usando Supabase
 * 
 * Valida el token JWT de Supabase y adjunta el usuario al request.
 * Los endpoints marcados con @Public() no requieren autenticación.
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Verificar si el endpoint es público
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token de autenticación no proporcionado');
    }

    try {
      // Validar que Supabase esté configurado
      if (!supabase) {
        throw new UnauthorizedException('Servicio de autenticación no configurado. Verifica las variables de entorno.');
      }

      // Validar el token con Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        throw new UnauthorizedException('Token inválido o expirado');
      }

      // Adjuntar el usuario al request para uso en controllers
      request.user = user;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Error al validar autenticación');
    }
  }

  /**
   * Extrae el token del header Authorization
   * Formato esperado: "Bearer <token>"
   */
  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

// Extender el tipo Request para incluir el usuario
declare module 'express' {
  interface Request {
    user?: User;
  }
}

