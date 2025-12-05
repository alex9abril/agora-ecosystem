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
import { CategoriesService } from './categories.service';
import { ListCategoriesDto } from './dto/list-categories.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { SupabaseAuthGuard } from '../../../common/guards/supabase-auth.guard';
import { Public } from '../../../common/decorators/public.decorator';

@ApiTags('Catalog - Categories')
@Controller('catalog/categories')
@UseGuards(SupabaseAuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Listar categorías con filtros y paginación (Público)' })
  @ApiResponse({ status: 200, description: 'Lista de categorías obtenida exitosamente' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async findAll(@Query() query: ListCategoriesDto) {
    return this.categoriesService.findAll(query);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Obtener detalle de una categoría (Público)' })
  @ApiParam({ name: 'id', description: 'ID de la categoría (UUID)' })
  @ApiResponse({ status: 200, description: 'Categoría obtenida exitosamente' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear una nueva categoría' })
  @ApiResponse({ status: 201, description: 'Categoría creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar una categoría' })
  @ApiParam({ name: 'id', description: 'ID de la categoría (UUID)' })
  @ApiResponse({ status: 200, description: 'Categoría actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Eliminar lógicamente una categoría (desactivar)' })
  @ApiParam({ name: 'id', description: 'ID de la categoría (UUID)' })
  @ApiResponse({ status: 200, description: 'Categoría desactivada exitosamente' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  @ApiResponse({ status: 400, description: 'No se puede eliminar (tiene productos o subcategorías)' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}

