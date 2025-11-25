import {
  Controller,
  Get,
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
import { ClientsService } from './clients.service';
import { ListClientsDto } from './dto/list-clients.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@ApiTags('Clients')
@ApiBearerAuth()
@Controller('clients')
@UseGuards(SupabaseAuthGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar clientes con filtros y paginación' })
  @ApiResponse({ status: 200, description: 'Lista de clientes obtenida exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async findAll(@Query() query: ListClientsDto) {
    return this.clientsService.findAll(query);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Obtener estadísticas de clientes' })
  @ApiResponse({ status: 200, description: 'Estadísticas obtenidas exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async getStatistics() {
    return this.clientsService.getStatistics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de un cliente' })
  @ApiParam({ name: 'id', description: 'ID del cliente (UUID)' })
  @ApiResponse({ status: 200, description: 'Cliente obtenido exitosamente' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }
}

