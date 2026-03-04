import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { StoresService } from './stores.service';
import { ListStoresDto } from './dto/list-stores.dto';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

@ApiTags('stores')
@Controller('stores')
@UseGuards(SupabaseAuthGuard)
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Listar tiendas (canales de venta) con filtros' })
  @ApiResponse({ status: 200, description: 'Lista de tiendas' })
  async findAll(@Query() query: ListStoresDto) {
    return this.storesService.findAll(query);
  }

  @Get('by-path')
  @Public()
  @ApiOperation({ summary: 'Obtener tienda por path (ej: /grupo/grupo-andrade)' })
  @ApiQuery({ name: 'path', required: true, example: '/grupo/grupo-andrade' })
  @ApiResponse({ status: 200, description: 'Tienda encontrada' })
  @ApiResponse({ status: 404, description: 'Tienda no encontrada' })
  async findByPath(@Query('path') path: string) {
    if (!path || typeof path !== 'string') {
      throw new NotFoundException('Query path es requerido');
    }
    return this.storesService.findByPath(path);
  }

  @Get('disable-reasons')
  @Public()
  @ApiOperation({ summary: 'Listar motivos para deshabilitar una tienda' })
  @ApiResponse({ status: 200, description: 'Lista de motivos' })
  async getDisableReasons() {
    return this.storesService.getDisableReasons();
  }

  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear tienda (group, branch o group_brand)' })
  @ApiResponse({ status: 201, description: 'Tienda creada' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o tienda ya existe' })
  async create(@Body() dto: CreateStoreDto) {
    return this.storesService.create({
      type: dto.type,
      businessGroupId: dto.businessGroupId,
      businessId: dto.businessId,
      vehicleBrandId: dto.vehicleBrandId,
    });
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Obtener tienda por ID' })
  @ApiParam({ name: 'id', description: 'UUID de la tienda' })
  @ApiResponse({ status: 200, description: 'Tienda encontrada' })
  @ApiResponse({ status: 404, description: 'Tienda no encontrada' })
  async findOne(@Param('id') id: string) {
    return this.storesService.findById(id);
  }

  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar tienda (name, isActive, settings, motivo deshabilitar)' })
  @ApiParam({ name: 'id', description: 'UUID de la tienda' })
  @ApiResponse({ status: 200, description: 'Tienda actualizada' })
  @ApiResponse({ status: 404, description: 'Tienda no encontrada' })
  async update(@Param('id') id: string, @Body() dto: UpdateStoreDto, @Req() req: Request) {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    return this.storesService.update(
      id,
      {
        name: dto.name,
        isActive: dto.isActive,
        settings: dto.settings,
        disableReasonId: dto.disableReasonId,
        disableNotes: dto.disableNotes,
      },
      userId
    );
  }
}
