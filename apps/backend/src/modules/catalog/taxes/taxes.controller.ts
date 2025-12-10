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
  ApiQuery,
} from '@nestjs/swagger';
import { TaxesService } from './taxes.service';
import { CreateTaxTypeDto } from './dto/create-tax-type.dto';
import { UpdateTaxTypeDto } from './dto/update-tax-type.dto';
import { AssignTaxToProductDto } from './dto/assign-tax-to-product.dto';
import { SupabaseAuthGuard } from '../../../common/guards/supabase-auth.guard';
import { Public } from '../../../common/decorators/public.decorator';

@ApiTags('Catalog - Taxes')
@ApiBearerAuth()
@Controller('catalog/taxes')
@UseGuards(SupabaseAuthGuard)
export class TaxesController {
  constructor(private readonly taxesService: TaxesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los tipos de impuestos' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean, description: 'Incluir impuestos inactivos' })
  @ApiResponse({ status: 200, description: 'Lista de tipos de impuestos obtenida exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async findAll(@Query('includeInactive') includeInactive?: string) {
    const include = includeInactive === 'true';
    return this.taxesService.findAll(include);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un tipo de impuesto por ID' })
  @ApiParam({ name: 'id', description: 'ID del tipo de impuesto', type: String })
  @ApiResponse({ status: 200, description: 'Tipo de impuesto obtenido exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Tipo de impuesto no encontrado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async findOne(@Param('id') id: string) {
    return this.taxesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo tipo de impuesto' })
  @ApiResponse({ status: 201, description: 'Tipo de impuesto creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async create(@Body() createTaxTypeDto: CreateTaxTypeDto) {
    return this.taxesService.create(createTaxTypeDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un tipo de impuesto' })
  @ApiParam({ name: 'id', description: 'ID del tipo de impuesto', type: String })
  @ApiResponse({ status: 200, description: 'Tipo de impuesto actualizado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Tipo de impuesto no encontrado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async update(@Param('id') id: string, @Body() updateTaxTypeDto: UpdateTaxTypeDto) {
    return this.taxesService.update(id, updateTaxTypeDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar (desactivar) un tipo de impuesto' })
  @ApiParam({ name: 'id', description: 'ID del tipo de impuesto', type: String })
  @ApiResponse({ status: 200, description: 'Tipo de impuesto eliminado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Tipo de impuesto no encontrado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async remove(@Param('id') id: string) {
    return this.taxesService.remove(id);
  }

  // ============================================================================
  // ENDPOINTS PARA GESTIÓN DE IMPUESTOS EN PRODUCTOS
  // ============================================================================

  @Get('products/:productId')
  @ApiOperation({ summary: 'Obtener impuestos asignados a un producto' })
  @ApiParam({ name: 'productId', description: 'ID del producto', type: String })
  @ApiResponse({ status: 200, description: 'Lista de impuestos del producto obtenida exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async getProductTaxes(@Param('productId') productId: string) {
    return this.taxesService.getProductTaxes(productId);
  }

  @Post('products/:productId')
  @ApiOperation({ summary: 'Asignar un impuesto a un producto' })
  @ApiParam({ name: 'productId', description: 'ID del producto', type: String })
  @ApiResponse({ status: 201, description: 'Impuesto asignado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Producto o tipo de impuesto no encontrado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async assignTaxToProduct(
    @Param('productId') productId: string,
    @Body() assignTaxDto: AssignTaxToProductDto,
  ) {
    return this.taxesService.assignTaxToProduct(productId, assignTaxDto);
  }

  @Delete('products/:productId/:taxTypeId')
  @ApiOperation({ summary: 'Desasignar un impuesto de un producto' })
  @ApiParam({ name: 'productId', description: 'ID del producto', type: String })
  @ApiParam({ name: 'taxTypeId', description: 'ID del tipo de impuesto', type: String })
  @ApiResponse({ status: 200, description: 'Impuesto desasignado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Producto o impuesto no encontrado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async removeTaxFromProduct(
    @Param('productId') productId: string,
    @Param('taxTypeId') taxTypeId: string,
  ) {
    return this.taxesService.removeTaxFromProduct(productId, taxTypeId);
  }

  @Post('products/:productId/calculate')
  @Public()
  @ApiOperation({ summary: 'Calcular impuestos para un producto y subtotal (Público)' })
  @ApiParam({ name: 'productId', description: 'ID del producto', type: String })
  @ApiQuery({ name: 'subtotal', required: true, type: Number, description: 'Subtotal del producto' })
  @ApiResponse({ status: 200, description: 'Cálculo de impuestos obtenido exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async calculateProductTaxes(
    @Param('productId') productId: string,
    @Query('subtotal') subtotal: string,
  ) {
    const subtotalNum = parseFloat(subtotal);
    if (isNaN(subtotalNum) || subtotalNum < 0) {
      throw new Error('Subtotal inválido');
    }
    return this.taxesService.calculateProductTaxes(productId, subtotalNum);
  }
}

