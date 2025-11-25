import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiKey } from '../../common/decorators/api-key.decorator';
import { ApiKeyAuth } from '../../common/decorators/api-key-auth.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { User } from '@supabase/supabase-js';

/**
 * Controlador para gestión de API Keys
 * 
 * Endpoints para crear y gestionar API Keys para aplicaciones
 */
@ApiTags('api-keys')
@Controller('api-keys')
@UseGuards(SupabaseAuthGuard) // Requiere autenticación de usuario (admin)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  /**
   * Crear una nueva aplicación
   */
  @Post('applications')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear una nueva aplicación' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'App Cliente iOS' },
        description: { type: 'string', example: 'Aplicación móvil para clientes en iOS' },
        appType: { type: 'string', example: 'mobile-client', enum: ['mobile-client', 'mobile-repartidor', 'web-local', 'web-admin', 'external'] },
        platform: { type: 'string', example: 'ios' },
        version: { type: 'string', example: '1.0.0' },
        metadata: { type: 'object' },
      },
      required: ['name', 'appType'],
    },
  })
  @ApiResponse({ status: 201, description: 'Aplicación creada exitosamente' })
  async createApplication(
    @CurrentUser() user: User,
    @Body() data: {
      name: string;
      description?: string;
      appType: string;
      platform?: string;
      version?: string;
      metadata?: Record<string, any>;
    },
  ) {
    return this.apiKeysService.createApplication({
      ...data,
      createdBy: user.id,
    });
  }

  /**
   * Listar todas las aplicaciones
   */
  @Get('applications')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Listar todas las aplicaciones' })
  @ApiResponse({ status: 200, description: 'Lista de aplicaciones' })
  async listApplications() {
    return this.apiKeysService.listApplications();
  }

  /**
   * Crear una nueva API Key
   * ⚠️ La key solo se muestra una vez
   */
  @Post('applications/:applicationId/keys')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear una nueva API Key para una aplicación' })
  @ApiParam({ name: 'applicationId', description: 'ID de la aplicación' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Production Key' },
        description: { type: 'string', example: 'API Key para producción' },
        scopes: { type: 'array', items: { type: 'string' }, example: ['read:orders', 'write:orders'] },
        expiresAt: { type: 'string', format: 'date-time', example: '2025-12-31T23:59:59Z' },
        rateLimitPerMinute: { type: 'number', example: 100 },
        rateLimitPerHour: { type: 'number', example: 1000 },
        rateLimitPerDay: { type: 'number', example: 10000 },
      },
      required: ['name'],
    },
  })
  @ApiResponse({ status: 201, description: 'API Key creada exitosamente' })
  async createApiKey(
    @CurrentUser() user: User,
    @Param('applicationId') applicationId: string,
    @Body() data: {
      name: string;
      description?: string;
      scopes?: string[];
      expiresAt?: string;
      rateLimitPerMinute?: number;
      rateLimitPerHour?: number;
      rateLimitPerDay?: number;
    },
  ) {
    return this.apiKeysService.createApiKey({
      applicationId,
      ...data,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      createdBy: user.id,
    });
  }

  /**
   * Listar API Keys de una aplicación
   */
  @Get('applications/:applicationId/keys')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Listar API Keys de una aplicación' })
  @ApiParam({ name: 'applicationId', description: 'ID de la aplicación' })
  @ApiResponse({ status: 200, description: 'Lista de API Keys' })
  async listApiKeys(@Param('applicationId') applicationId: string) {
    return this.apiKeysService.listApiKeys(applicationId);
  }

  /**
   * Revocar una API Key
   */
  @Put('keys/:keyId/revoke')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Revocar una API Key' })
  @ApiParam({ name: 'keyId', description: 'ID de la API Key' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', example: 'Key comprometida' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'API Key revocada exitosamente' })
  async revokeApiKey(
    @Param('keyId') keyId: string,
    @Body() data: { reason?: string },
  ) {
    await this.apiKeysService.revokeApiKey(keyId, data.reason);
    return { message: 'API Key revocada exitosamente' };
  }

  /**
   * Obtener estadísticas de una aplicación
   */
  @Get('applications/:applicationId/stats')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener estadísticas de uso de una aplicación' })
  @ApiParam({ name: 'applicationId', description: 'ID de la aplicación' })
  @ApiResponse({ status: 200, description: 'Estadísticas de la aplicación' })
  async getApplicationStats(@Param('applicationId') applicationId: string) {
    return this.apiKeysService.getApplicationStats(applicationId);
  }

  /**
   * Endpoint de prueba que requiere API Key
   * (Para verificar que la autenticación funciona)
   */
  @ApiKeyAuth() // Requiere API Key
  @Get('test')
  @ApiOperation({ summary: 'Endpoint de prueba con API Key' })
  @ApiResponse({ status: 200, description: 'Test exitoso' })
  @ApiResponse({ status: 401, description: 'API Key inválida' })
  async testApiKey(@ApiKey() apiKey: any) {
    return {
      message: 'API Key válida',
      application: apiKey?.applicationName || 'Unknown',
      appType: apiKey?.appType || 'Unknown',
    };
  }
}

