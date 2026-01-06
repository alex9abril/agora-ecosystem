import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { User } from '@supabase/supabase-js';
import { BusinessesService } from './businesses.service';
import { ListBusinessesDto } from './dto/list-businesses.dto';
import { UpdateBusinessStatusDto } from './dto/update-business-status.dto';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessAddressDto } from './dto/update-business-address.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { CreateBusinessGroupDto } from './dto/create-business-group.dto';
import { UpdateBusinessGroupDto } from './dto/update-business-group.dto';
import { UpdateBrandingDto } from './dto/branding.dto';
import { BrandingImagesService } from './branding-images.service';

@ApiTags('businesses')
@Controller('businesses')
@UseGuards(SupabaseAuthGuard)
export class BusinessesController {
  constructor(
    private readonly businessesService: BusinessesService,
    private readonly brandingImagesService: BrandingImagesService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Listar todos los negocios con filtros y paginación (Público)' })
  @ApiResponse({ status: 200, description: 'Lista de negocios obtenida exitosamente' })
  @ApiResponse({ status: 400, description: 'Parámetros inválidos' })
  async findAll(@Query() query: ListBusinessesDto) {
    return this.businessesService.findAll(query);
  }

  @Get('test')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Endpoint de prueba para diagnosticar problemas de conexión' })
  @ApiResponse({ status: 200, description: 'Resultado de la prueba' })
  async testConnection(@CurrentUser() user: User) {
    return this.businessesService.testConnection();
  }

  @Get('my-business')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener el negocio del usuario actual' })
  @ApiQuery({ name: 'businessId', required: false, description: 'ID de la tienda específica a obtener (opcional)' })
  @ApiResponse({ status: 200, description: 'Negocio obtenido exitosamente' })
  @ApiResponse({ status: 404, description: 'El usuario no tiene un negocio registrado' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async getMyBusiness(
    @CurrentUser() user: User,
    @Query('businessId') businessId?: string
  ) {
    // Si se proporciona un businessId, obtener esa tienda específica
    if (businessId) {
      const business = await this.businessesService.findByOwnerId(user.id, businessId);
      if (!business) {
        throw new NotFoundException('Tienda no encontrada o no tienes acceso a esta tienda');
      }
      return business;
    }
    
    // Si no se proporciona businessId, usar el comportamiento por defecto
    const business = await this.businessesService.findByOwnerId(user.id);
    if (!business) {
      throw new NotFoundException('No tienes un negocio registrado');
    }
    return business;
  }

  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear un nuevo negocio' })
  @ApiResponse({ status: 201, description: 'Negocio creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o el usuario ya tiene un negocio' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async create(@Body() createDto: CreateBusinessDto, @CurrentUser() user: User) {
    return this.businessesService.create(user.id, createDto);
  }

  @Get('categories')
  @Public()
  @ApiOperation({ summary: 'Obtener catálogo de categorías de negocios (público)' })
  @ApiResponse({ status: 200, description: 'Categorías obtenidas exitosamente' })
  async getCategories() {
    return this.businessesService.getBusinessCategories();
  }

  @Get('active-region')
  @Public()
  @ApiOperation({ summary: 'Obtener la región activa de servicio (público)' })
  @ApiResponse({ status: 200, description: 'Región activa obtenida exitosamente' })
  @ApiResponse({ status: 404, description: 'No hay región activa configurada' })
  async getActiveRegion() {
    try {
      const region = await this.businessesService.getActiveRegion();
      if (!region) {
        throw new NotFoundException({
          message: 'No hay región de servicio activa configurada',
          hint: 'Ejecuta el script database/service_regions.sql para configurar las regiones de cobertura',
        });
      }
      return region;
    } catch (error: any) {
      // Si es un NotFoundException, re-lanzarlo
      if (error instanceof NotFoundException) {
        throw error;
      }
      // Para otros errores, lanzar con más contexto
      throw new ServiceUnavailableException(
        `Error al obtener región activa: ${error.message}. Verifica que el script database/service_regions.sql se haya ejecutado.`
      );
    }
  }

  @Get('validate-location')
  @Public()
  @ApiOperation({ summary: 'Validar si una ubicación está dentro de la región activa (público)' })
  @ApiQuery({ name: 'longitude', type: Number, description: 'Longitud' })
  @ApiQuery({ name: 'latitude', type: Number, description: 'Latitud' })
  @ApiResponse({ status: 200, description: 'Validación realizada exitosamente' })
  async validateLocation(
    @Query('longitude') longitude: string,
    @Query('latitude') latitude: string,
  ) {
    const lon = parseFloat(longitude);
    const lat = parseFloat(latitude);

    if (isNaN(lon) || isNaN(lat)) {
      throw new BadRequestException('Longitud y latitud deben ser números válidos');
    }

    return this.businessesService.validateLocationInRegion(lon, lat);
  }

  @Get('statistics')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener estadísticas de negocios' })
  @ApiResponse({ status: 200, description: 'Estadísticas obtenidas exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async getStatistics(@CurrentUser() user: User) {
    return this.businessesService.getStatistics();
  }

  @Get('nearest')
  @Public()
  @ApiOperation({ summary: 'Obtener negocio más cercano a una ubicación' })
  @ApiQuery({ name: 'latitude', description: 'Latitud', type: Number, required: true })
  @ApiQuery({ name: 'longitude', description: 'Longitud', type: Number, required: true })
  @ApiQuery({ name: 'businessId', description: 'ID del negocio (opcional)', type: String, required: false })
  @ApiResponse({ status: 200, description: 'Negocio más cercano obtenido exitosamente' })
  @ApiResponse({ status: 404, description: 'No se encontró ningún negocio cercano' })
  async findNearest(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
    @Query('businessId') businessId?: string,
  ) {
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      throw new BadRequestException('Latitud y longitud deben ser números válidos');
    }

    return this.businessesService.findNearest(lat, lon, businessId);
  }

  @Get('vehicle-brands/available')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener todas las marcas de vehículos disponibles' })
  @ApiResponse({ status: 200, description: 'Marcas obtenidas exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async getAvailableVehicleBrands() {
    return this.businessesService.getAvailableVehicleBrands();
  }

  // ============================================================================
  // BUSINESS GROUPS (Grupos Empresariales) - Debe ir ANTES de @Get(':id')
  // ============================================================================

  @Get('groups')
  @Public()
  @ApiOperation({ summary: 'Listar grupos empresariales (Público)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Lista de grupos obtenida exitosamente' })
  async getGroups(@Query() query: any) {
    return this.businessesService.getBusinessGroups(query);
  }

  @Get('groups/:id')
  @Public()
  @ApiOperation({ summary: 'Obtener grupo empresarial por ID (Público)' })
  @ApiParam({ name: 'id', description: 'ID del grupo empresarial' })
  @ApiResponse({ status: 200, description: 'Grupo obtenido exitosamente' })
  @ApiResponse({ status: 404, description: 'Grupo no encontrado' })
  async getGroupById(@Param('id') id: string) {
    return this.businessesService.getBusinessGroupById(id);
  }

  @Get('groups/slug/:slug')
  @Public()
  @ApiOperation({ summary: 'Obtener grupo empresarial por slug (Público)' })
  @ApiParam({ name: 'slug', description: 'Slug del grupo empresarial' })
  @ApiResponse({ status: 200, description: 'Grupo obtenido exitosamente' })
  @ApiResponse({ status: 404, description: 'Grupo no encontrado' })
  async getGroupBySlug(@Param('slug') slug: string) {
    return this.businessesService.getBusinessGroupBySlug(slug);
  }

  @Get('branches')
  @Public()
  @ApiOperation({ summary: 'Listar sucursales (branches) (Público)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'groupId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'latitude', required: false, type: Number })
  @ApiQuery({ name: 'longitude', required: false, type: Number })
  @ApiQuery({ name: 'radius', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista de sucursales obtenida exitosamente' })
  async getBranches(@Query() query: any) {
    return this.businessesService.getBranches(query);
  }

  @Get('branches/id/:id')
  @Public()
  @ApiOperation({ summary: 'Obtener sucursal por ID (Público)' })
  @ApiParam({ name: 'id', description: 'ID de la sucursal' })
  @ApiResponse({ status: 200, description: 'Sucursal obtenida exitosamente' })
  @ApiResponse({ status: 404, description: 'Sucursal no encontrada' })
  async getBranchById(@Param('id') id: string) {
    return this.businessesService.getBranchById(id);
  }

  @Get('branches/:slug')
  @Public()
  @ApiOperation({ summary: 'Obtener sucursal por slug (Público)' })
  @ApiParam({ name: 'slug', description: 'Slug de la sucursal' })
  @ApiResponse({ status: 200, description: 'Sucursal obtenida exitosamente' })
  @ApiResponse({ status: 404, description: 'Sucursal no encontrada' })
  async getBranchBySlug(@Param('slug') slug: string) {
    return this.businessesService.getBranchBySlug(slug);
  }

  @Get('branches/by-brand/:brandId')
  @Public()
  @ApiOperation({ summary: 'Obtener sucursales que venden productos de una marca específica (Público)' })
  @ApiParam({ name: 'brandId', description: 'ID de la marca de vehículo' })
  @ApiResponse({ status: 200, description: 'Sucursales obtenidas exitosamente' })
  async getBranchesByBrand(@Param('brandId') brandId: string) {
    return this.businessesService.getBranchesByBrand(brandId);
  }

  @Get('my-business-group')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener el grupo empresarial del usuario actual' })
  @ApiResponse({ status: 200, description: 'Grupo empresarial obtenido exitosamente' })
  @ApiResponse({ status: 404, description: 'No se encontró un grupo empresarial' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getMyBusinessGroup(@CurrentUser() user: User) {
    return this.businessesService.getMyBusinessGroup(user.id);
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener un negocio por ID' })
  @ApiParam({ name: 'id', description: 'ID del negocio', type: String })
  @ApiResponse({ status: 200, description: 'Negocio obtenido exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Negocio no encontrado' })
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.businessesService.findOne(id);
  }

  @Patch(':id/status')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar estado de un negocio (activar/desactivar)' })
  @ApiParam({ name: 'id', description: 'ID del negocio', type: String })
  @ApiResponse({ status: 200, description: 'Estado actualizado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Negocio no encontrado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateBusinessStatusDto,
    @CurrentUser() user: User,
  ) {
    return this.businessesService.updateStatus(id, updateDto);
  }

  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar información de un negocio' })
  @ApiParam({ name: 'id', description: 'ID del negocio', type: String })
  @ApiResponse({ status: 200, description: 'Negocio actualizado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Negocio no encontrado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o sin permisos' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateBusinessDto,
    @CurrentUser() user: User,
  ) {
    return this.businessesService.update(id, user.id, updateDto);
  }

  @Patch(':id/address')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar dirección de un negocio' })
  @ApiParam({ name: 'id', description: 'ID del negocio', type: String })
  @ApiResponse({ status: 200, description: 'Dirección actualizada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Negocio no encontrado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o sin permisos' })
  async updateAddress(
    @Param('id') id: string,
    @Body() updateDto: UpdateBusinessAddressDto,
    @CurrentUser() user: User,
  ) {
    return this.businessesService.updateAddress(id, user.id, updateDto);
  }

  @Get(':id/vehicle-brands')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener las marcas de vehículos asignadas a una sucursal' })
  @ApiParam({ name: 'id', description: 'ID del negocio', type: String })
  @ApiResponse({ status: 200, description: 'Marcas obtenidas exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Negocio no encontrado' })
  async getBusinessVehicleBrands(@Param('id') id: string) {
    return this.businessesService.getBusinessVehicleBrands(id);
  }

  @Post(':id/vehicle-brands/:brandId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Agregar una marca de vehículo a una sucursal' })
  @ApiParam({ name: 'id', description: 'ID del negocio', type: String })
  @ApiParam({ name: 'brandId', description: 'ID de la marca de vehículo', type: String })
  @ApiResponse({ status: 200, description: 'Marca agregada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Negocio o marca no encontrada' })
  @ApiResponse({ status: 400, description: 'La marca ya está asignada o sin permisos' })
  async addVehicleBrand(
    @Param('id') id: string,
    @Param('brandId') brandId: string,
    @CurrentUser() user: User,
  ) {
    return this.businessesService.addVehicleBrandToBusiness(id, brandId, user.id);
  }

  @Delete(':id/vehicle-brands/:brandId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Quitar una marca de vehículo de una sucursal' })
  @ApiParam({ name: 'id', description: 'ID del negocio', type: String })
  @ApiParam({ name: 'brandId', description: 'ID de la marca de vehículo', type: String })
  @ApiResponse({ status: 200, description: 'Marca quitada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Negocio o marca no encontrada' })
  @ApiResponse({ status: 400, description: 'Sin permisos' })
  async removeVehicleBrand(
    @Param('id') id: string,
    @Param('brandId') brandId: string,
    @CurrentUser() user: User,
  ) {
    return this.businessesService.removeVehicleBrandFromBusiness(id, brandId, user.id);
  }

  // ============================================================================
  // BUSINESS GROUPS (Grupos Empresariales) - Resto de endpoints
  // ============================================================================

  @Post('business-groups')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear un nuevo grupo empresarial' })
  @ApiResponse({ status: 201, description: 'Grupo empresarial creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async createBusinessGroup(
    @Body() createDto: CreateBusinessGroupDto,
    @CurrentUser() user: User
  ) {
    return this.businessesService.createBusinessGroup(user.id, createDto);
  }

  @Patch('business-groups/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar un grupo empresarial' })
  @ApiParam({ name: 'id', description: 'ID del grupo empresarial (UUID)' })
  @ApiResponse({ status: 200, description: 'Grupo empresarial actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Grupo empresarial no encontrado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async updateBusinessGroup(
    @Param('id') id: string,
    @Body() updateDto: UpdateBusinessGroupDto,
    @CurrentUser() user: User
  ) {
    return this.businessesService.updateBusinessGroup(id, user.id, updateDto);
  }

  // ============================================================================
  // BRANDING / PERSONALIZACIÓN
  // ============================================================================

  @Get('groups/:id/branding')
  @Public()
  @ApiOperation({ summary: 'Obtener branding de un grupo empresarial' })
  @ApiParam({ name: 'id', description: 'ID del grupo empresarial' })
  @ApiResponse({ status: 200, description: 'Branding obtenido exitosamente' })
  @ApiResponse({ status: 404, description: 'Grupo no encontrado' })
  async getGroupBranding(@Param('id') id: string) {
    return this.businessesService.getGroupBranding(id);
  }

  @Put('groups/:id/branding')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar branding de un grupo empresarial' })
  @ApiParam({ name: 'id', description: 'ID del grupo empresarial' })
  @ApiResponse({ status: 200, description: 'Branding actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Grupo no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async updateGroupBranding(
    @Param('id') id: string,
    @Body() updateDto: UpdateBrandingDto,
    @CurrentUser() user: User
  ) {
    return this.businessesService.updateGroupBranding(id, user.id, updateDto);
  }

  @Get(':id/branding')
  @Public()
  @ApiOperation({ summary: 'Obtener branding completo de una sucursal (incluye herencia del grupo)' })
  @ApiParam({ name: 'id', description: 'ID de la sucursal' })
  @ApiResponse({ status: 200, description: 'Branding obtenido exitosamente' })
  @ApiResponse({ status: 404, description: 'Sucursal no encontrada' })
  async getBusinessBranding(@Param('id') id: string) {
    return this.businessesService.getBusinessBranding(id);
  }

  @Put(':id/branding')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar branding de una sucursal' })
  @ApiParam({ name: 'id', description: 'ID de la sucursal' })
  @ApiResponse({ status: 200, description: 'Branding actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Sucursal no encontrada' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async updateBusinessBranding(
    @Param('id') id: string,
    @Body() updateDto: UpdateBrandingDto,
    @CurrentUser() user: User
  ) {
    return this.businessesService.updateBusinessBranding(id, user.id, updateDto);
  }

  // ============================================================================
  // UPLOAD DE IMÁGENES DE BRANDING
  // ============================================================================

  @Post('groups/:id/branding/upload-logo')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Subir logo principal de un grupo' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'ID del grupo empresarial' })
  @ApiResponse({ status: 201, description: 'Logo subido exitosamente' })
  @ApiResponse({ status: 400, description: 'Archivo inválido' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadGroupLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User
  ) {
    const result = await this.brandingImagesService.uploadImage('group', id, 'logo', file);
    // Actualizar branding con la nueva URL
    await this.businessesService.updateGroupBranding(id, user.id, {
      branding: { logo_url: result.url },
    });
    return result;
  }

  @Post('groups/:id/branding/upload-logo-light')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Subir logo light de un grupo' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'ID del grupo empresarial' })
  @ApiResponse({ status: 201, description: 'Logo subido exitosamente' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadGroupLogoLight(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User
  ) {
    const result = await this.brandingImagesService.uploadImage('group', id, 'logo_light', file);
    await this.businessesService.updateGroupBranding(id, user.id, {
      branding: { logo_light_url: result.url },
    });
    return result;
  }

  @Post('groups/:id/branding/upload-logo-dark')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Subir logo dark de un grupo' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'ID del grupo empresarial' })
  @ApiResponse({ status: 201, description: 'Logo subido exitosamente' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadGroupLogoDark(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User
  ) {
    const result = await this.brandingImagesService.uploadImage('group', id, 'logo_dark', file);
    await this.businessesService.updateGroupBranding(id, user.id, {
      branding: { logo_dark_url: result.url },
    });
    return result;
  }

  @Post('groups/:id/branding/upload-favicon')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Subir favicon de un grupo' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'ID del grupo empresarial' })
  @ApiResponse({ status: 201, description: 'Favicon subido exitosamente' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadGroupFavicon(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User
  ) {
    const result = await this.brandingImagesService.uploadImage('group', id, 'favicon', file);
    await this.businessesService.updateGroupBranding(id, user.id, {
      branding: { favicon_url: result.url },
    });
    return result;
  }

  @Post(':id/branding/upload-logo')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Subir logo principal de una sucursal' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'ID de la sucursal' })
  @ApiResponse({ status: 201, description: 'Logo subido exitosamente' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadBusinessLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User
  ) {
    const result = await this.brandingImagesService.uploadImage('business', id, 'logo', file);
    await this.businessesService.updateBusinessBranding(id, user.id, {
      branding: { logo_url: result.url },
    });
    return result;
  }

  @Post(':id/branding/upload-logo-light')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Subir logo light de una sucursal' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'ID de la sucursal' })
  @ApiResponse({ status: 201, description: 'Logo subido exitosamente' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadBusinessLogoLight(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User
  ) {
    const result = await this.brandingImagesService.uploadImage('business', id, 'logo_light', file);
    await this.businessesService.updateBusinessBranding(id, user.id, {
      branding: { logo_light_url: result.url },
    });
    return result;
  }

  @Post(':id/branding/upload-logo-dark')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Subir logo dark de una sucursal' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'ID de la sucursal' })
  @ApiResponse({ status: 201, description: 'Logo subido exitosamente' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadBusinessLogoDark(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User
  ) {
    const result = await this.brandingImagesService.uploadImage('business', id, 'logo_dark', file);
    await this.businessesService.updateBusinessBranding(id, user.id, {
      branding: { logo_dark_url: result.url },
    });
    return result;
  }

  @Post(':id/branding/upload-favicon')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Subir favicon de una sucursal' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'ID de la sucursal' })
  @ApiResponse({ status: 201, description: 'Favicon subido exitosamente' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadBusinessFavicon(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User
  ) {
    const result = await this.brandingImagesService.uploadImage('business', id, 'favicon', file);
    await this.businessesService.updateBusinessBranding(id, user.id, {
      branding: { favicon_url: result.url },
    });
    return result;
  }
}

