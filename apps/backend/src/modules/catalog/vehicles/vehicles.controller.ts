import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { SupabaseAuthGuard } from '../../../common/guards/supabase-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';

@ApiTags('Catalog - Vehicles')
@ApiBearerAuth()
@Controller('catalog/vehicles')
@UseGuards(SupabaseAuthGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get('brands')
  @Public()
  @ApiOperation({ summary: 'Obtener todas las marcas de vehículos activas' })
  @ApiResponse({ status: 200, description: 'Marcas obtenidas exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async getBrands() {
    return this.vehiclesService.getBrands();
  }

  @Get('brands/:brandId/models')
  @Public()
  @ApiOperation({ summary: 'Obtener modelos por marca' })
  @ApiParam({ name: 'brandId', description: 'ID de la marca' })
  @ApiResponse({ status: 200, description: 'Modelos obtenidos exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async getModelsByBrand(@Param('brandId') brandId: string) {
    return this.vehiclesService.getModelsByBrand(brandId);
  }

  @Get('models/:modelId/years')
  @Public()
  @ApiOperation({ summary: 'Obtener años/generaciones por modelo' })
  @ApiParam({ name: 'modelId', description: 'ID del modelo' })
  @ApiResponse({ status: 200, description: 'Años obtenidos exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async getYearsByModel(@Param('modelId') modelId: string) {
    return this.vehiclesService.getYearsByModel(modelId);
  }

  @Get('years/:yearId/specs')
  @Public()
  @ApiOperation({ summary: 'Obtener especificaciones técnicas por año' })
  @ApiParam({ name: 'yearId', description: 'ID del año/generación' })
  @ApiResponse({ status: 200, description: 'Especificaciones obtenidas exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async getSpecsByYear(@Param('yearId') yearId: string) {
    return this.vehiclesService.getSpecsByYear(yearId);
  }

  @Get('variants/makes')
  @Public()
  @ApiOperation({ summary: 'Marcas distintas para desplegable (vehicle_variants)' })
  @ApiResponse({ status: 200, description: 'Lista de marcas' })
  async getVariantMakes() {
    return this.vehiclesService.getVariantMakes();
  }

  @Get('variants/models')
  @Public()
  @ApiOperation({ summary: 'Modelos distintos por marca' })
  @ApiQuery({ name: 'make', required: true, description: 'Marca' })
  @ApiResponse({ status: 200, description: 'Lista de modelos' })
  async getVariantModels(@Query('make') make: string) {
    return this.vehiclesService.getVariantModels(make || '');
  }

  @Get('variants/years')
  @Public()
  @ApiOperation({ summary: 'Años distintos por marca y modelo' })
  @ApiQuery({ name: 'make', required: true }) @ApiQuery({ name: 'model', required: true })
  @ApiResponse({ status: 200, description: 'Lista de años' })
  async getVariantYears(@Query('make') make: string, @Query('model') model: string) {
    return this.vehiclesService.getVariantYears(make || '', model || '');
  }

  @Get('variants/body-trims')
  @Public()
  @ApiOperation({ summary: 'Body trim distintos por make, model, year' })
  @ApiQuery({ name: 'make', required: true }) @ApiQuery({ name: 'model', required: true }) @ApiQuery({ name: 'year', required: true })
  @ApiResponse({ status: 200, description: 'Lista de body_trim' })
  async getVariantBodyTrims(
    @Query('make') make: string,
    @Query('model') model: string,
    @Query('year') year: string,
  ) {
    const yearNum = year != null && year !== '' ? parseInt(year, 10) : 0;
    return this.vehiclesService.getVariantBodyTrims(make || '', model || '', yearNum);
  }

  @Get('variants/engine-transmissions')
  @Public()
  @ApiOperation({ summary: 'Engine/transmission distintos por make, model, year, body_trim' })
  @ApiQuery({ name: 'make', required: true }) @ApiQuery({ name: 'model', required: true }) @ApiQuery({ name: 'year', required: true })
  @ApiQuery({ name: 'bodyTrim', required: false })
  @ApiResponse({ status: 200, description: 'Lista de engine_transmission' })
  async getVariantEngineTransmissions(
    @Query('make') make: string,
    @Query('model') model: string,
    @Query('year') year: string,
    @Query('bodyTrim') bodyTrim?: string,
  ) {
    const yearNum = year != null && year !== '' ? parseInt(year, 10) : 0;
    return this.vehiclesService.getVariantEngineTransmissions(make || '', model || '', yearNum, bodyTrim ?? null);
  }

  @Get('variants')
  @Public()
  @ApiOperation({ summary: 'Listar/buscar variantes de vehículo (vehicle_variants)' })
  @ApiQuery({ name: 'q', required: false, description: 'Búsqueda en make, model, body_trim, engine_transmission' })
  @ApiQuery({ name: 'make', required: false }) @ApiQuery({ name: 'model', required: false }) @ApiQuery({ name: 'year', required: false })
  @ApiQuery({ name: 'body_trim', required: false }) @ApiQuery({ name: 'engine_transmission', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Variantes obtenidas exitosamente' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async getVariants(
    @Query('q') q?: string,
    @Query('make') make?: string,
    @Query('model') model?: string,
    @Query('year') year?: string,
    @Query('body_trim') body_trim?: string,
    @Query('engine_transmission') engine_transmission?: string,
    @Query('limit') limit?: string,
  ) {
    const yearNum = year != null && year !== '' ? parseInt(year, 10) : undefined;
    const limitNum = limit != null && limit !== '' ? parseInt(limit, 10) : undefined;
    const bodyTrimVal = body_trim !== undefined && body_trim !== '' ? body_trim : undefined;
    const engineVal = engine_transmission !== undefined && engine_transmission !== '' ? engine_transmission : undefined;
    return this.vehiclesService.getVehicleVariants({
      q,
      make,
      model,
      year: yearNum,
      body_trim: bodyTrimVal,
      engine_transmission: engineVal,
      limit: limitNum,
    });
  }

  @Get('products/:productId/compatibility')
  @Public()
  @ApiOperation({ summary: 'Verificar compatibilidad de un producto con un vehículo' })
  @ApiParam({ name: 'productId', description: 'ID del producto' })
  @ApiQuery({ name: 'vehicleVariantId', required: false, description: 'ID de la variante (vehicle_variants)' })
  @ApiQuery({ name: 'brandId', required: false, description: 'ID de la marca (legacy)' })
  @ApiQuery({ name: 'modelId', required: false, description: 'ID del modelo (legacy)' })
  @ApiQuery({ name: 'yearId', required: false, description: 'ID del año (legacy)' })
  @ApiQuery({ name: 'specId', required: false, description: 'ID de la especificación (legacy)' })
  @ApiResponse({ status: 200, description: 'Compatibilidad verificada' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async checkCompatibility(
    @Param('productId') productId: string,
    @Query('vehicleVariantId') vehicleVariantId?: string,
    @Query('brandId') brandId?: string,
    @Query('modelId') modelId?: string,
    @Query('yearId') yearId?: string,
    @Query('specId') specId?: string,
  ) {
    const isCompatible = await this.vehiclesService.checkProductCompatibility(
      productId,
      brandId,
      modelId,
      yearId,
      specId,
      vehicleVariantId
    );
    return { is_compatible: isCompatible };
  }

  @Get('products/:productId/compatibilities')
  @Public()
  @ApiOperation({ summary: 'Obtener todas las compatibilidades de un producto' })
  @ApiParam({ name: 'productId', description: 'ID del producto' })
  @ApiResponse({ status: 200, description: 'Compatibilidades obtenidas exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async getProductCompatibilities(@Param('productId') productId: string) {
    return this.vehiclesService.getProductCompatibilities(productId);
  }

  @Post('products/:productId/compatibility')
  @ApiOperation({ summary: 'Agregar compatibilidad a un producto' })
  @ApiParam({ name: 'productId', description: 'ID del producto' })
  @ApiResponse({ status: 201, description: 'Compatibilidad agregada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async addProductCompatibility(
    @Param('productId') productId: string,
    @CurrentUser() user: any,
    @Body() data: {
      vehicle_brand_id?: string;
      vehicle_model_id?: string;
      vehicle_year_id?: string;
      vehicle_spec_id?: string;
      is_universal?: boolean;
      notes?: string;
    }
  ) {
    return this.vehiclesService.addProductCompatibility(productId, user.id, data);
  }

  @Delete('compatibility/:compatibilityId')
  @ApiOperation({ summary: 'Eliminar compatibilidad de un producto' })
  @ApiParam({ name: 'compatibilityId', description: 'ID de la compatibilidad' })
  @ApiResponse({ status: 200, description: 'Compatibilidad eliminada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async removeProductCompatibility(
    @Param('compatibilityId') compatibilityId: string,
    @CurrentUser() user: any,
  ) {
    await this.vehiclesService.removeProductCompatibility(compatibilityId, user.id);
    return { message: 'Compatibilidad eliminada exitosamente' };
  }
}

