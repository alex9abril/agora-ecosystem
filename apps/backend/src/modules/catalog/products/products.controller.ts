import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { ListProductsDto } from './dto/list-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SupabaseAuthGuard } from '../../../common/guards/supabase-auth.guard';

@ApiTags('Catalog - Products')
@ApiBearerAuth()
@Controller('catalog/products')
@UseGuards(SupabaseAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('field-config/:productType')
  @ApiOperation({ summary: 'Obtener configuración de campos por tipo de producto' })
  @ApiParam({ name: 'productType', description: 'Tipo de producto (food, beverage, medicine, grocery, non_food)' })
  @ApiResponse({ status: 200, description: 'Configuración de campos obtenida exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async getFieldConfig(@Param('productType') productType: string) {
    return this.productsService.getFieldConfigByProductType(productType);
  }

  @Get()
  @ApiOperation({ summary: 'Listar productos con filtros y paginación' })
  @ApiResponse({ status: 200, description: 'Lista de productos obtenida exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async findAll(@Query() query: ListProductsDto) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de un producto' })
  @ApiParam({ name: 'id', description: 'ID del producto (UUID)' })
  @ApiResponse({ status: 200, description: 'Producto obtenido exitosamente' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo producto' })
  @ApiResponse({ status: 201, description: 'Producto creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un producto' })
  @ApiParam({ name: 'id', description: 'ID del producto (UUID)' })
  @ApiResponse({ status: 200, description: 'Producto actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar lógicamente un producto (desactivar)' })
  @ApiParam({ name: 'id', description: 'ID del producto (UUID)' })
  @ApiResponse({ status: 200, description: 'Producto desactivado exitosamente' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}

