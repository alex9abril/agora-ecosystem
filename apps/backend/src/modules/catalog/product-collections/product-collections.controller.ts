import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ProductCollectionsService } from './product-collections.service';
import { ListProductCollectionsDto } from './dto/list-product-collections.dto';
import { CreateProductCollectionDto } from './dto/create-product-collection.dto';
import { UpdateProductCollectionDto } from './dto/update-product-collection.dto';
import { ProductCollectionImagesService } from './product-collection-images.service';
import { SupabaseAuthGuard } from '../../../common/guards/supabase-auth.guard';
import { Public } from '../../../common/decorators/public.decorator';

@ApiTags('Catalog - Product Collections')
@ApiBearerAuth()
@Controller('catalog/collections')
export class ProductCollectionsController {
  constructor(
    private readonly service: ProductCollectionsService,
    private readonly imagesService: ProductCollectionImagesService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Listar colecciones por sucursal' })
  @ApiQuery({ name: 'businessId', required: true, type: String, description: 'ID de la sucursal' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Filtro por nombre o slug' })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: "Filtrar por estado ('active' | 'inactive' | 'all'). Por defecto: active",
  })
  async list(@Query() query: ListProductCollectionsDto) {
    return this.service.list(query);
  }

  @Get('available-products')
  @ApiOperation({ summary: 'Buscar productos disponibles por sucursal' })
  @ApiQuery({ name: 'businessId', required: true, type: String, description: 'ID de la sucursal' })
  @ApiQuery({ name: 'search', required: true, type: String, description: 'Buscar por nombre o SKU' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Límite de resultados' })
  async searchAvailableProducts(
    @Query('businessId') businessId: string,
    @Query('search') search: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.searchAvailableProducts(businessId, search, limit ? Number(limit) : undefined);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Obtener una colección' })
  @ApiParam({ name: 'id', description: 'ID de la colección', type: String })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/products')
  @ApiOperation({ summary: 'Listar productos de una colección por sucursal' })
  @ApiParam({ name: 'id', description: 'ID de la colección', type: String })
  @ApiQuery({ name: 'businessId', required: true, type: String, description: 'ID de la sucursal' })
  async listProducts(@Param('id') id: string, @Query('businessId') businessId: string) {
    return this.service.listProducts(id, businessId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una colección' })
  async create(@Body() dto: CreateProductCollectionDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una colección' })
  @ApiParam({ name: 'id', description: 'ID de la colección', type: String })
  async update(@Param('id') id: string, @Body() dto: UpdateProductCollectionDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una colección' })
  @ApiParam({ name: 'id', description: 'ID de la colección', type: String })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Delete(':id/products/:productId')
  @ApiOperation({ summary: 'Quitar un producto de la colección' })
  @ApiParam({ name: 'id', description: 'ID de la colección', type: String })
  @ApiParam({ name: 'productId', description: 'ID del producto', type: String })
  @ApiQuery({ name: 'businessId', required: true, type: String, description: 'ID de la sucursal' })
  async removeProduct(
    @Param('id') id: string,
    @Param('productId') productId: string,
    @Query('businessId') businessId: string,
  ) {
    return this.service.removeProduct(id, productId, businessId);
  }

  @Post(':id/products')
  @ApiOperation({ summary: 'Agregar un producto a la colección' })
  @ApiParam({ name: 'id', description: 'ID de la colección', type: String })
  @ApiQuery({ name: 'businessId', required: true, type: String, description: 'ID de la sucursal' })
  async addProduct(
    @Param('id') id: string,
    @Query('businessId') businessId: string,
    @Body('productId') productId: string,
  ) {
    return this.service.addProduct(id, productId, businessId);
  }

  @Post(':id/upload-image')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir imagen de colección' })
  @ApiParam({ name: 'id', description: 'ID de la colección', type: String })
  async uploadImage(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.imagesService.uploadImage(id, file);
  }
}
