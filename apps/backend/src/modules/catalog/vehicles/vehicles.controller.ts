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

@ApiTags('Catalog - Vehicles')
@ApiBearerAuth()
@Controller('catalog/vehicles')
@UseGuards(SupabaseAuthGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get('brands')
  @ApiOperation({ summary: 'Obtener todas las marcas de vehículos activas' })
  @ApiResponse({ status: 200, description: 'Marcas obtenidas exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async getBrands() {
    return this.vehiclesService.getBrands();
  }

  @Get('brands/:brandId/models')
  @ApiOperation({ summary: 'Obtener modelos por marca' })
  @ApiParam({ name: 'brandId', description: 'ID de la marca' })
  @ApiResponse({ status: 200, description: 'Modelos obtenidos exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async getModelsByBrand(@Param('brandId') brandId: string) {
    return this.vehiclesService.getModelsByBrand(brandId);
  }

  @Get('models/:modelId/years')
  @ApiOperation({ summary: 'Obtener años/generaciones por modelo' })
  @ApiParam({ name: 'modelId', description: 'ID del modelo' })
  @ApiResponse({ status: 200, description: 'Años obtenidos exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async getYearsByModel(@Param('modelId') modelId: string) {
    return this.vehiclesService.getYearsByModel(modelId);
  }

  @Get('years/:yearId/specs')
  @ApiOperation({ summary: 'Obtener especificaciones técnicas por año' })
  @ApiParam({ name: 'yearId', description: 'ID del año/generación' })
  @ApiResponse({ status: 200, description: 'Especificaciones obtenidas exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async getSpecsByYear(@Param('yearId') yearId: string) {
    return this.vehiclesService.getSpecsByYear(yearId);
  }

  @Get('products/:productId/compatibility')
  @ApiOperation({ summary: 'Verificar compatibilidad de un producto con un vehículo' })
  @ApiParam({ name: 'productId', description: 'ID del producto' })
  @ApiQuery({ name: 'brandId', required: false, description: 'ID de la marca' })
  @ApiQuery({ name: 'modelId', required: false, description: 'ID del modelo' })
  @ApiQuery({ name: 'yearId', required: false, description: 'ID del año' })
  @ApiQuery({ name: 'specId', required: false, description: 'ID de la especificación' })
  @ApiResponse({ status: 200, description: 'Compatibilidad verificada' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async checkCompatibility(
    @Param('productId') productId: string,
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
      specId
    );
    return { is_compatible: isCompatible };
  }

  @Get('products/:productId/compatibilities')
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

