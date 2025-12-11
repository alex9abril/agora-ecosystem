import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { SettingsService, UpdateSettingDto } from './settings.service';
import { IntegrationsService } from './integrations.service';
import { BulkUpdateSettingsDto } from './dto/update-setting.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
@UseGuards(SupabaseAuthGuard)
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todas las configuraciones agrupadas por categoría' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean, description: 'Incluir configuraciones inactivas' })
  @ApiResponse({ status: 200, description: 'Configuraciones obtenidas exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async findAll(@Query('includeInactive') includeInactive?: string) {
    const include = includeInactive === 'true';
    return this.settingsService.findAll(include);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Obtener lista de categorías disponibles' })
  @ApiResponse({ status: 200, description: 'Categorías obtenidas exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async getCategories() {
    return this.settingsService.getCategories();
  }

  @Get('category/:category')
  @ApiOperation({ summary: 'Obtener configuraciones por categoría' })
  @ApiParam({ name: 'category', description: 'Categoría de configuraciones', example: 'taxes' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Configuraciones obtenidas exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async findByCategory(
    @Param('category') category: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const include = includeInactive === 'true';
    return this.settingsService.findByCategory(category, include);
  }

  @Get('taxes')
  @ApiOperation({ summary: 'Obtener configuración de impuestos' })
  @ApiResponse({ status: 200, description: 'Configuración de impuestos obtenida exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async getTaxSettings() {
    return this.settingsService.getTaxSettings();
  }

  @Get(':key')
  @ApiOperation({ summary: 'Obtener una configuración por clave' })
  @ApiParam({ name: 'key', description: 'Clave de la configuración', example: 'taxes.included_in_price' })
  @ApiResponse({ status: 200, description: 'Configuración obtenida exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Configuración no encontrada' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async findByKey(@Param('key') key: string) {
    return this.settingsService.findByKey(key);
  }

  @Put(':key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar una configuración por clave' })
  @ApiParam({ name: 'key', description: 'Clave de la configuración', example: 'taxes.included_in_price' })
  @ApiResponse({ status: 200, description: 'Configuración actualizada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Configuración no encontrada' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async updateByKey(
    @Param('key') key: string,
    @Body() updateDto: UpdateSettingDto,
  ) {
    return this.settingsService.updateByKey(key, updateDto);
  }

  @Post('bulk-update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar múltiples configuraciones' })
  @ApiResponse({ status: 200, description: 'Configuraciones actualizadas exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async bulkUpdate(@Body() bulkUpdateDto: BulkUpdateSettingsDto) {
    return this.settingsService.bulkUpdate(bulkUpdateDto.updates);
  }

  // ============================================================================
  // ENDPOINTS DE INTEGRACIONES
  // ============================================================================

  @Get('integrations/mode')
  @ApiOperation({ summary: 'Obtener el modo actual de integraciones (dev/prod)' })
  @ApiResponse({ status: 200, description: 'Modo obtenido exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getIntegrationMode() {
    const mode = await this.integrationsService.getMode();
    return { mode };
  }

  @Get('integrations/payments/all')
  @ApiOperation({ summary: 'Obtener todas las credenciales de métodos de pago activos' })
  @ApiResponse({ status: 200, description: 'Credenciales obtenidas exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getAllPaymentCredentials() {
    return this.integrationsService.getAllPaymentCredentials();
  }

  @Get('integrations/payments/karlopay')
  @ApiOperation({ summary: 'Obtener credenciales de Karlopay según el modo activo' })
  @ApiResponse({ status: 200, description: 'Credenciales obtenidas exitosamente' })
  @ApiResponse({ status: 404, description: 'Karlopay no está habilitado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getKarlopayCredentials() {
    return this.integrationsService.getKarlopayCredentials();
  }

  @Get('integrations/payments/mercadopago')
  @ApiOperation({ summary: 'Obtener credenciales de Mercado Pago según el modo activo' })
  @ApiResponse({ status: 200, description: 'Credenciales obtenidas exitosamente' })
  @ApiResponse({ status: 404, description: 'Mercado Pago no está habilitado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getMercadoPagoCredentials() {
    return this.integrationsService.getMercadoPagoCredentials();
  }

  @Get('integrations/payments/stripe')
  @ApiOperation({ summary: 'Obtener credenciales de Stripe según el modo activo' })
  @ApiResponse({ status: 200, description: 'Credenciales obtenidas exitosamente' })
  @ApiResponse({ status: 404, description: 'Stripe no está habilitado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getStripeCredentials() {
    return this.integrationsService.getStripeCredentials();
  }
}

