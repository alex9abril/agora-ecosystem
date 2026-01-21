import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ProductCollectionsService } from './product-collections.service';
import { ListProductCollectionsDto } from './dto/list-product-collections.dto';
import { CreateProductCollectionDto } from './dto/create-product-collection.dto';
import { UpdateProductCollectionDto } from './dto/update-product-collection.dto';

@ApiTags('Catalog - Product Collections')
@ApiBearerAuth()
@Controller('catalog/collections')
export class ProductCollectionsController {
  constructor(private readonly service: ProductCollectionsService) {}

  @Get()
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

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una colección' })
  @ApiParam({ name: 'id', description: 'ID de la colección', type: String })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
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
}
