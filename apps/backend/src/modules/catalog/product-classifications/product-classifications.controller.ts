import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ProductClassificationsService } from './product-classifications.service';
import { ListProductClassificationsDto } from './dto/list-product-classifications.dto';
import { CreateProductClassificationDto } from './dto/create-product-classification.dto';
import { UpdateProductClassificationDto } from './dto/update-product-classification.dto';

@ApiTags('Catalog - Product Classifications')
@ApiBearerAuth()
@Controller('catalog/classifications')
export class ProductClassificationsController {
  constructor(private readonly service: ProductClassificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar clasificaciones por sucursal' })
  @ApiQuery({ name: 'businessId', required: true, type: String, description: 'ID de la sucursal' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Filtro por nombre o slug' })
  async list(@Query() query: ListProductClassificationsDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una clasificación' })
  @ApiParam({ name: 'id', description: 'ID de la clasificación', type: String })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una clasificación' })
  async create(@Body() dto: CreateProductClassificationDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una clasificación' })
  @ApiParam({ name: 'id', description: 'ID de la clasificación', type: String })
  async update(@Param('id') id: string, @Body() dto: UpdateProductClassificationDto) {
    return this.service.update(id, dto);
  }
}
