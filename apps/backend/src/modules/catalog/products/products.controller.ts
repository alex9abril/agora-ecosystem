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
  UseInterceptors,
  UploadedFile,
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
import { ProductsService } from './products.service';
import { ProductImagesService } from './product-images.service';
import { ListProductsDto } from './dto/list-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { BulkUpdateProductBranchAvailabilityDto } from './dto/product-branch-availability.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { SupabaseAuthGuard } from '../../../common/guards/supabase-auth.guard';
import { Public } from '../../../common/decorators/public.decorator';

@ApiTags('Catalog - Products')
@ApiBearerAuth()
@Controller('catalog/products')
@UseGuards(SupabaseAuthGuard)
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly productImagesService: ProductImagesService,
  ) {}

  @Get('field-config/:productType')
  @Public()
  @ApiOperation({ summary: 'Obtener configuración de campos por tipo de producto' })
  @ApiParam({ name: 'productType', description: 'Tipo de producto (refaccion, accesorio, servicio_instalacion, servicio_mantenimiento, fluido)' })
  @ApiResponse({ status: 200, description: 'Configuración de campos obtenida exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async getFieldConfig(@Param('productType') productType: string) {
    return this.productsService.getFieldConfigByProductType(productType);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Listar productos con filtros y paginación (Público)' })
  @ApiResponse({ status: 200, description: 'Lista de productos obtenida exitosamente' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async findAll(@Query() query: ListProductsDto) {
    return this.productsService.findAll(query);
  }

  // IMPORTANTE: Las rutas específicas deben ir ANTES de las rutas genéricas con parámetros
  @Get(':id/branch-availability')
  @Public()
  @ApiOperation({ summary: 'Obtener disponibilidad de un producto en todas las sucursales (Público)' })
  @ApiParam({ name: 'id', description: 'ID del producto (UUID)' })
  @ApiQuery({ name: 'groupId', required: false, type: String, description: 'Filtrar por grupo empresarial' })
  @ApiQuery({ name: 'brandId', required: false, type: String, description: 'Filtrar por marca de vehículo' })
  @ApiResponse({ status: 200, description: 'Disponibilidad obtenida exitosamente' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async getBranchAvailability(
    @Param('id') id: string,
    @Query('groupId') groupId?: string,
    @Query('brandId') brandId?: string,
  ) {
    return this.productsService.getProductBranchAvailability(id, groupId, brandId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Obtener detalle de un producto (Público)' })
  @ApiParam({ name: 'id', description: 'ID del producto (UUID)' })
  @ApiQuery({ name: 'branchId', required: false, type: String, description: 'ID de la sucursal para obtener precio y stock específicos' })
  @ApiResponse({ status: 200, description: 'Producto obtenido exitosamente' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async findOne(@Param('id') id: string, @Query('branchId') branchId?: string) {
    return this.productsService.findOne(id, branchId);
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

  @Post(':id/branch-availability')
  @ApiOperation({ summary: 'Actualizar disponibilidad de un producto en múltiples sucursales' })
  @ApiParam({ name: 'id', description: 'ID del producto (UUID)' })
  @ApiResponse({ status: 200, description: 'Disponibilidad actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async updateBranchAvailability(
    @Param('id') id: string,
    @Body() bulkUpdateDto: BulkUpdateProductBranchAvailabilityDto
  ) {
    return this.productsService.updateProductBranchAvailability(id, bulkUpdateDto.availabilities);
  }

  // ============================================================================
  // ENDPOINTS DE IMÁGENES
  // ============================================================================

  @Post(':productId/images')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Subir una imagen para un producto' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'productId', description: 'ID del producto (UUID)' })
  @ApiResponse({ status: 201, description: 'Imagen subida exitosamente' })
  @ApiResponse({ status: 400, description: 'Archivo inválido o datos incorrectos' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @Param('productId') productId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('alt_text') altText?: string,
    @Body('is_primary') isPrimary?: string,
    @Body('display_order') displayOrder?: string,
  ) {
    const isPrimaryBool = isPrimary === 'true' || isPrimary === '1';
    const displayOrderNum = displayOrder ? parseInt(displayOrder, 10) : undefined;
    
    return this.productImagesService.uploadImage(
      productId,
      file,
      altText,
      isPrimaryBool,
      displayOrderNum,
    );
  }

  @Get(':productId/images')
  @Public()
  @ApiOperation({ summary: 'Listar todas las imágenes de un producto (Público)' })
  @ApiParam({ name: 'productId', description: 'ID del producto (UUID)' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean, description: 'Incluir imágenes inactivas' })
  @ApiResponse({ status: 200, description: 'Lista de imágenes obtenida exitosamente' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async getProductImages(
    @Param('productId') productId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const includeInactiveBool = includeInactive === 'true' || includeInactive === '1';
    return this.productImagesService.getProductImages(productId, includeInactiveBool);
  }

  @Get(':productId/images/:imageId')
  @Public()
  @ApiOperation({ summary: 'Obtener una imagen específica de un producto (Público)' })
  @ApiParam({ name: 'productId', description: 'ID del producto (UUID)' })
  @ApiParam({ name: 'imageId', description: 'ID de la imagen (UUID)' })
  @ApiResponse({ status: 200, description: 'Imagen obtenida exitosamente' })
  @ApiResponse({ status: 404, description: 'Imagen no encontrada' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async getImage(
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.productImagesService.getImage(imageId);
  }

  @Patch(':productId/images/:imageId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar metadata de una imagen' })
  @ApiParam({ name: 'productId', description: 'ID del producto (UUID)' })
  @ApiParam({ name: 'imageId', description: 'ID de la imagen (UUID)' })
  @ApiResponse({ status: 200, description: 'Imagen actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Imagen no encontrada' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async updateImage(
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
    @Body() updateDto: UpdateProductImageDto,
  ) {
    return this.productImagesService.updateImage(imageId, updateDto);
  }

  @Delete(':productId/images/:imageId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Eliminar una imagen de un producto' })
  @ApiParam({ name: 'productId', description: 'ID del producto (UUID)' })
  @ApiParam({ name: 'imageId', description: 'ID de la imagen (UUID)' })
  @ApiResponse({ status: 200, description: 'Imagen eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Imagen no encontrada' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async deleteImage(
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.productImagesService.deleteImage(imageId);
  }
}

