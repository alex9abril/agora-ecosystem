import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { SettingsService, UpdateSettingDto } from './settings.service';
import { IntegrationsService } from './integrations.service';
import { WebhookSecretsService } from './webhook-secrets.service';
import { BulkUpdateSettingsDto } from './dto/update-setting.dto';
import { CreateWebhookSecretDto } from './dto/create-webhook-secret.dto';
import { PatchWebhookSecretDto } from './dto/patch-webhook-secret.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { BrandingImagesService } from '../businesses/branding-images.service';

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
@UseGuards(SupabaseAuthGuard)
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly integrationsService: IntegrationsService,
    private readonly webhookSecretsService: WebhookSecretsService,
    private readonly brandingImagesService: BrandingImagesService,
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

  @Public()
  @Get('branding/global')
  @ApiOperation({ summary: 'Obtener branding de la tienda global (MultiTienda)' })
  @ApiResponse({ status: 200, description: 'Branding obtenido' })
  async getBrandingGlobal() {
    return this.settingsService.getBrandingGlobal();
  }

  @Put('branding/global')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar branding de la tienda global' })
  @ApiResponse({ status: 200, description: 'Branding actualizado' })
  async updateBrandingGlobal(@Body() body: { branding: Record<string, any> }) {
    return this.settingsService.updateBrandingGlobal(body.branding || {});
  }

  @Public()
  @Get('branding/vehicle-brand/:id')
  @ApiOperation({ summary: 'Obtener branding de la tienda por marca (vehicle_brand_id)' })
  @ApiParam({ name: 'id', description: 'ID de la marca de vehículo' })
  @ApiResponse({ status: 200, description: 'Branding obtenido' })
  async getBrandingVehicleBrand(@Param('id') id: string) {
    return this.settingsService.getBrandingVehicleBrand(id);
  }

  @Put('branding/vehicle-brand/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar branding de la tienda por marca' })
  @ApiParam({ name: 'id', description: 'ID de la marca de vehículo' })
  @ApiResponse({ status: 200, description: 'Branding actualizado' })
  async updateBrandingVehicleBrand(
    @Param('id') id: string,
    @Body() body: { branding: Record<string, any> },
  ) {
    return this.settingsService.updateBrandingVehicleBrand(id, body.branding || {});
  }

  @Post('branding/global/upload-logo')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file'))
  async uploadGlobalLogo(@UploadedFile() file: Express.Multer.File) {
    const result = await this.brandingImagesService.uploadImage('global', 'global', 'logo', file);
    const { branding } = await this.settingsService.getBrandingGlobal();
    await this.settingsService.updateBrandingGlobal({ ...branding, logo_url: result.url });
    return result;
  }

  @Post('branding/global/upload-logo-light')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadGlobalLogoLight(@UploadedFile() file: Express.Multer.File) {
    const result = await this.brandingImagesService.uploadImage('global', 'global', 'logo_light', file);
    const { branding } = await this.settingsService.getBrandingGlobal();
    await this.settingsService.updateBrandingGlobal({ ...branding, logo_light_url: result.url });
    return result;
  }

  @Post('branding/global/upload-logo-dark')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadGlobalLogoDark(@UploadedFile() file: Express.Multer.File) {
    const result = await this.brandingImagesService.uploadImage('global', 'global', 'logo_dark', file);
    const { branding } = await this.settingsService.getBrandingGlobal();
    await this.settingsService.updateBrandingGlobal({ ...branding, logo_dark_url: result.url });
    return result;
  }

  @Post('branding/global/upload-favicon')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadGlobalFavicon(@UploadedFile() file: Express.Multer.File) {
    const result = await this.brandingImagesService.uploadImage('global', 'global', 'favicon', file);
    const { branding } = await this.settingsService.getBrandingGlobal();
    await this.settingsService.updateBrandingGlobal({ ...branding, favicon_url: result.url });
    return result;
  }

  @Post('branding/vehicle-brand/:id/upload-logo')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadVehicleBrandLogo(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    const result = await this.brandingImagesService.uploadImage('vehicle_brand', id, 'logo', file);
    const { branding } = await this.settingsService.getBrandingVehicleBrand(id);
    await this.settingsService.updateBrandingVehicleBrand(id, { ...branding, logo_url: result.url });
    return result;
  }

  @Post('branding/vehicle-brand/:id/upload-logo-light')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadVehicleBrandLogoLight(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    const result = await this.brandingImagesService.uploadImage('vehicle_brand', id, 'logo_light', file);
    const { branding } = await this.settingsService.getBrandingVehicleBrand(id);
    await this.settingsService.updateBrandingVehicleBrand(id, { ...branding, logo_light_url: result.url });
    return result;
  }

  @Post('branding/vehicle-brand/:id/upload-logo-dark')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadVehicleBrandLogoDark(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    const result = await this.brandingImagesService.uploadImage('vehicle_brand', id, 'logo_dark', file);
    const { branding } = await this.settingsService.getBrandingVehicleBrand(id);
    await this.settingsService.updateBrandingVehicleBrand(id, { ...branding, logo_dark_url: result.url });
    return result;
  }

  @Post('branding/vehicle-brand/:id/upload-favicon')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadVehicleBrandFavicon(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    const result = await this.brandingImagesService.uploadImage('vehicle_brand', id, 'favicon', file);
    const { branding } = await this.settingsService.getBrandingVehicleBrand(id);
    await this.settingsService.updateBrandingVehicleBrand(id, { ...branding, favicon_url: result.url });
    return result;
  }

  // ============================================================================
  // WEBHOOK SECRETS (claves para validar webhooks, p. ej. Karlopay)
  // ============================================================================

  @Get('webhook-secrets')
  @ApiOperation({ summary: 'Listar claves de webhook (incluye secret para copiar en admin)' })
  @ApiResponse({ status: 200, description: 'Listado de claves' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async listWebhookSecrets() {
    return this.webhookSecretsService.list();
  }

  @Post('webhook-secrets')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear clave de webhook; el secret se devuelve solo en esta respuesta' })
  @ApiResponse({ status: 201, description: 'Clave creada; incluye secret (mostrar una sola vez)' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async createWebhookSecret(@Body() dto: CreateWebhookSecretDto) {
    return this.webhookSecretsService.create(dto);
  }

  @Get('webhook-secrets/:id/secret')
  @ApiOperation({ summary: 'Obtener el valor completo del secret (para copiar en admin)' })
  @ApiParam({ name: 'id', description: 'ID de la clave' })
  @ApiResponse({ status: 200, description: 'Secret completo' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Clave no encontrada' })
  async getWebhookSecretValue(@Param('id') id: string) {
    return this.webhookSecretsService.getSecretById(id);
  }

  @Patch('webhook-secrets/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revocar o editar clave (nombre, expires_at); nunca devuelve secret' })
  @ApiParam({ name: 'id', description: 'ID de la clave' })
  @ApiResponse({ status: 200, description: 'Clave actualizada' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Clave no encontrada' })
  async patchWebhookSecret(@Param('id') id: string, @Body() dto: PatchWebhookSecretDto) {
    return this.webhookSecretsService.patch(id, dto);
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

