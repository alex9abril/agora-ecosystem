import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
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
} from '@nestjs/swagger';
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

@ApiTags('businesses')
@Controller('businesses')
@UseGuards(SupabaseAuthGuard)
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Listar todos los negocios con filtros y paginación' })
  @ApiResponse({ status: 200, description: 'Lista de negocios obtenida exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 400, description: 'Parámetros inválidos' })
  async findAll(@Query() query: ListBusinessesDto, @CurrentUser() user: User) {
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
}

