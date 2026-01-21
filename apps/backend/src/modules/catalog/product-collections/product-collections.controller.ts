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

@ApiTags('Catalog - Product Collections')
@ApiBearerAuth()
@Controller('catalog/collections')
export class ProductCollectionsController {
  constructor(
    private readonly service: ProductCollectionsService,
    private readonly imagesService: ProductCollectionImagesService,
  ) {}

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

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una colección' })
  @ApiParam({ name: 'id', description: 'ID de la colección', type: String })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
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
