import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
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
import { UserVehiclesService } from './user-vehicles.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateUserVehicleDto } from './dto/create-user-vehicle.dto';
import { UpdateUserVehicleDto } from './dto/update-user-vehicle.dto';

@ApiTags('User Vehicles')
@ApiBearerAuth()
@Controller('user-vehicles')
@UseGuards(SupabaseAuthGuard)
export class UserVehiclesController {
  constructor(private readonly userVehiclesService: UserVehiclesService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todos los vehículos del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Vehículos obtenidos exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async getUserVehicles(@CurrentUser() user: any) {
    return this.userVehiclesService.getUserVehicles(user.id);
  }

  @Get('default')
  @ApiOperation({ summary: 'Obtener el vehículo predeterminado del usuario' })
  @ApiResponse({ status: 200, description: 'Vehículo predeterminado obtenido exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'No se encontró vehículo predeterminado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async getDefaultVehicle(@CurrentUser() user: any) {
    const vehicle = await this.userVehiclesService.getDefaultUserVehicle(user.id);
    if (!vehicle) {
      return { message: 'No se encontró vehículo predeterminado' };
    }
    return vehicle;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un vehículo específico del usuario' })
  @ApiParam({ name: 'id', description: 'ID del vehículo' })
  @ApiResponse({ status: 200, description: 'Vehículo obtenido exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Vehículo no encontrado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async getUserVehicle(@CurrentUser() user: any, @Param('id') id: string) {
    return this.userVehiclesService.getUserVehicle(user.id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo vehículo para el usuario' })
  @ApiResponse({ status: 201, description: 'Vehículo creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async createUserVehicle(
    @CurrentUser() user: any,
    @Body() dto: CreateUserVehicleDto
  ) {
    return this.userVehiclesService.createUserVehicle(user.id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un vehículo del usuario' })
  @ApiParam({ name: 'id', description: 'ID del vehículo' })
  @ApiResponse({ status: 200, description: 'Vehículo actualizado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Vehículo no encontrado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async updateUserVehicle(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateUserVehicleDto
  ) {
    return this.userVehiclesService.updateUserVehicle(user.id, id, dto);
  }

  @Put(':id/set-default')
  @ApiOperation({ summary: 'Establecer un vehículo como predeterminado' })
  @ApiParam({ name: 'id', description: 'ID del vehículo' })
  @ApiResponse({ status: 200, description: 'Vehículo establecido como predeterminado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Vehículo no encontrado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async setDefaultVehicle(@CurrentUser() user: any, @Param('id') id: string) {
    return this.userVehiclesService.setDefaultVehicle(user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un vehículo del usuario' })
  @ApiParam({ name: 'id', description: 'ID del vehículo' })
  @ApiResponse({ status: 200, description: 'Vehículo eliminado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Vehículo no encontrado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async deleteUserVehicle(@CurrentUser() user: any, @Param('id') id: string) {
    await this.userVehiclesService.deleteUserVehicle(user.id, id);
    return { message: 'Vehículo eliminado exitosamente' };
  }
}

