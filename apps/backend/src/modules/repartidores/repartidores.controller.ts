import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@supabase/supabase-js';
import { RepartidoresService } from './repartidores.service';
import { ListRepartidoresDto } from './dto/list-repartidores.dto';
import { UpdateRepartidorStatusDto } from './dto/update-repartidor-status.dto';

@ApiTags('repartidores')
@Controller('repartidores')
@UseGuards(SupabaseAuthGuard)
export class RepartidoresController {
  constructor(private readonly repartidoresService: RepartidoresService) {}

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Listar todos los repartidores con filtros y paginación' })
  @ApiResponse({ status: 200, description: 'Lista de repartidores obtenida exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async findAll(@Query() query: ListRepartidoresDto, @CurrentUser() user: User) {
    return this.repartidoresService.findAll(query);
  }

  @Get('statistics')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener estadísticas de repartidores' })
  @ApiResponse({ status: 200, description: 'Estadísticas obtenidas exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async getStatistics(@CurrentUser() user: User) {
    return this.repartidoresService.getStatistics();
  }

  @Get(':id/timeline')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener timeline de actividad de un repartidor' })
  @ApiParam({ name: 'id', description: 'ID del repartidor', type: String })
  @ApiResponse({ status: 200, description: 'Timeline obtenido exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Repartidor no encontrado' })
  async getTimeline(@Param('id') id: string, @CurrentUser() user: User) {
    return this.repartidoresService.getTimeline(id);
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener un repartidor por ID' })
  @ApiParam({ name: 'id', description: 'ID del repartidor', type: String })
  @ApiResponse({ status: 200, description: 'Repartidor obtenido exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Repartidor no encontrado' })
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.repartidoresService.findOne(id);
  }

  @Patch(':id/status')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar estado de un repartidor' })
  @ApiParam({ name: 'id', description: 'ID del repartidor', type: String })
  @ApiResponse({ status: 200, description: 'Estado actualizado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Repartidor no encontrado' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateRepartidorStatusDto,
    @CurrentUser() user: User,
  ) {
    return this.repartidoresService.updateStatus(id, updateDto);
  }
}

