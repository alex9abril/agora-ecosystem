import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { User } from '@supabase/supabase-js';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';
import { RequestPasswordResetDto, UpdatePasswordDto } from './dto/reset-password.dto';

/**
 * Controlador de autenticación
 * 
 * Endpoints para autenticación y gestión de sesión
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Endpoint público: Verificar estado del servicio de autenticación
   */
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check del servicio de autenticación' })
  @ApiResponse({ status: 200, description: 'Servicio funcionando correctamente' })
  healthCheck() {
    return {
      service: 'auth',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Endpoint público: Registro de nuevo usuario
   */
  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar un nuevo usuario' })
  @ApiBody({ type: SignUpDto })
  @ApiResponse({
    status: 201,
    description: 'Usuario registrado exitosamente',
    schema: {
      type: 'object',
      properties: {
        user: { type: 'object' },
        session: { type: 'object' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 409, description: 'El email ya está registrado' })
  async signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(signUpDto);
  }

  /**
   * Endpoint público: Iniciar sesión
   */
  @Public()
  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión con email y contraseña' })
  @ApiBody({ type: SignInDto })
  @ApiResponse({
    status: 200,
    description: 'Sesión iniciada exitosamente',
    schema: {
      type: 'object',
      properties: {
        user: { type: 'object' },
        session: { type: 'object' },
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto);
  }

  /**
   * Endpoint público: Solicitar recuperación de contraseña
   */
  @Public()
  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar email de recuperación de contraseña' })
  @ApiBody({ type: RequestPasswordResetDto })
  @ApiResponse({
    status: 200,
    description: 'Email de recuperación enviado (si el email existe)',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        success: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Email inválido' })
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  /**
   * Endpoint público: Actualizar contraseña con token de recuperación
   */
  @Public()
  @Post('password/update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar contraseña usando token de recuperación' })
  @ApiBody({ type: UpdatePasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Contraseña actualizada exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        success: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Token inválido o expirado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async updatePassword(@Body() dto: UpdatePasswordDto) {
    return this.authService.updatePassword(dto.token, dto.newPassword);
  }

  /**
   * Endpoint público: Refrescar token de acceso
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refrescar token de acceso usando refresh token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: { type: 'string', example: 'refresh_token_here' },
      },
      required: ['refreshToken'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Token refrescado exitosamente',
    schema: {
      type: 'object',
      properties: {
        session: { type: 'object' },
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Refresh token inválido o expirado' })
  async refreshToken(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  /**
   * Endpoint protegido: Obtener perfil del usuario autenticado
   * (No necesita @UseGuards porque el guard es global)
   */
  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil del usuario obtenido exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async getProfile(@CurrentUser() user: User) {
    const profile = await this.authService.getUserProfile(user.id);
    return {
      ...user,
      profile,
    };
  }

  /**
   * Endpoint protegido: Verificar si el usuario tiene un rol específico
   * (No necesita @UseGuards porque el guard es global)
   */
  @Get('check-role/:role')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Verificar si el usuario tiene un rol específico' })
  @ApiParam({ name: 'role', description: 'Rol a verificar', example: 'client' })
  @ApiResponse({ status: 200, description: 'Verificación de rol exitosa' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async checkRole(
    @CurrentUser() user: User,
    @Param('role') role: string,
  ) {
    const hasRole = await this.authService.hasRole(user.id, role);
    return {
      userId: user.id,
      role,
      hasRole,
    };
  }

  /**
   * Endpoint protegido: Cerrar sesión
   */
  @Post('signout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Cerrar sesión del usuario actual' })
  @ApiResponse({
    status: 200,
    description: 'Sesión cerrada exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        success: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async signOut(@CurrentUser() user: User) {
    return this.authService.signOut();
  }
}

