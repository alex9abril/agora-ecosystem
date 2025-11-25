import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ProductTypeFieldConfigService } from './product-type-field-config.service';
import { BulkUpdateFieldConfigDto } from './dto/update-field-config.dto';
import { SupabaseAuthGuard } from '../../../common/guards/supabase-auth.guard';

@ApiTags('Catalog - Product Type Field Config')
@ApiBearerAuth()
@Controller('catalog/product-type-field-config')
@UseGuards(SupabaseAuthGuard)
export class ProductTypeFieldConfigController {
  constructor(
    private readonly productTypeFieldConfigService: ProductTypeFieldConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todas las configuraciones de campos por tipo de producto' })
  @ApiResponse({ status: 200, description: 'Configuraciones obtenidas exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async findAll() {
    return this.productTypeFieldConfigService.findAll();
  }

  @Get('product-types')
  @ApiOperation({ summary: 'Obtener lista de tipos de producto disponibles' })
  @ApiResponse({ status: 200, description: 'Tipos de producto obtenidos exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getProductTypes() {
    return this.productTypeFieldConfigService.getProductTypes();
  }

  @Get('available-fields')
  @ApiOperation({ summary: 'Obtener lista de campos disponibles para configuración' })
  @ApiResponse({ status: 200, description: 'Campos disponibles obtenidos exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getAvailableFields() {
    return this.productTypeFieldConfigService.getAvailableFields();
  }

  @Get(':productType')
  @ApiOperation({ summary: 'Obtener configuración de campos para un tipo de producto específico' })
  @ApiParam({ name: 'productType', description: 'Tipo de producto (food, beverage, medicine, grocery, non_food)' })
  @ApiResponse({ status: 200, description: 'Configuración obtenida exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async findByProductType(@Param('productType') productType: string) {
    return this.productTypeFieldConfigService.findByProductType(productType);
  }

  @Put(':productType')
  @ApiOperation({ summary: 'Actualizar configuración de campos para un tipo de producto (bulk update)' })
  @ApiParam({ name: 'productType', description: 'Tipo de producto (food, beverage, medicine, grocery, non_food)' })
  @ApiResponse({ status: 200, description: 'Configuración actualizada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async bulkUpdate(
    @Param('productType') productType: string,
    @Body() updateDto: BulkUpdateFieldConfigDto,
  ) {
    return this.productTypeFieldConfigService.bulkUpdate(productType, updateDto);
  }
}


