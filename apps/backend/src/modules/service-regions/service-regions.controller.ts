import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ServiceRegionsService } from './service-regions.service';
import { ListServiceRegionsDto } from './dto/list-service-regions.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@ApiBearerAuth()
@ApiTags('service-regions')
@UseGuards(SupabaseAuthGuard)
@Controller('service-regions')
export class ServiceRegionsController {
  constructor(private readonly serviceRegionsService: ServiceRegionsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las zonas de servicio' })
  @ApiResponse({ status: 200, description: 'Lista de zonas obtenida exitosamente.' })
  @ApiResponse({ status: 503, description: 'Error al obtener zonas.' })
  async findAll(@Query() query: ListServiceRegionsDto) {
    return this.serviceRegionsService.findAll(query);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Obtener estadísticas de zonas' })
  @ApiResponse({ status: 200, description: 'Estadísticas de zonas obtenidas exitosamente.' })
  @ApiResponse({ status: 503, description: 'Error al obtener estadísticas.' })
  async getStatistics() {
    return this.serviceRegionsService.getStatistics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalles de una zona por ID' })
  @ApiParam({ name: 'id', description: 'UUID de la zona', type: 'string' })
  @ApiResponse({ status: 200, description: 'Detalles de la zona obtenidos exitosamente.' })
  @ApiResponse({ status: 404, description: 'Zona no encontrada.' })
  @ApiResponse({ status: 503, description: 'Error al obtener zona.' })
  async findOne(@Param('id') id: string) {
    return this.serviceRegionsService.findOne(id);
  }

  @Get(':id/businesses')
  @ApiOperation({ summary: 'Obtener todas las tiendas de una zona' })
  @ApiParam({ name: 'id', description: 'UUID de la zona', type: 'string' })
  @ApiResponse({ status: 200, description: 'Lista de tiendas obtenida exitosamente.' })
  @ApiResponse({ status: 503, description: 'Error al obtener tiendas.' })
  async getBusinessesByRegion(@Param('id') id: string) {
    return this.serviceRegionsService.getBusinessesByRegion(id);
  }
}




