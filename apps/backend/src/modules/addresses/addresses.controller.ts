import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@supabase/supabase-js';

@ApiTags('addresses')
@Controller('addresses')
@UseGuards(SupabaseAuthGuard)
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Listar direcciones del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Lista de direcciones obtenida exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async findAll(@CurrentUser() user: User) {
    return this.addressesService.findAll(user.id);
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener dirección específica' })
  @ApiParam({ name: 'id', description: 'ID de la dirección', type: String })
  @ApiResponse({ status: 200, description: 'Dirección obtenida exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Dirección no encontrada' })
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.addressesService.findOne(id, user.id);
  }

  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear nueva dirección' })
  @ApiResponse({ status: 201, description: 'Dirección creada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(@Body() createDto: CreateAddressDto, @CurrentUser() user: User) {
    return this.addressesService.create(user.id, createDto);
  }

  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar dirección' })
  @ApiParam({ name: 'id', description: 'ID de la dirección', type: String })
  @ApiResponse({ status: 200, description: 'Dirección actualizada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Dirección no encontrada' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAddressDto,
    @CurrentUser() user: User,
  ) {
    return this.addressesService.update(id, user.id, updateDto);
  }

  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Eliminar dirección (soft delete)' })
  @ApiParam({ name: 'id', description: 'ID de la dirección', type: String })
  @ApiResponse({ status: 200, description: 'Dirección eliminada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Dirección no encontrada' })
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.addressesService.remove(id, user.id);
  }

  @Patch(':id/set-default')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Establecer dirección como predeterminada' })
  @ApiParam({ name: 'id', description: 'ID de la dirección', type: String })
  @ApiResponse({ status: 200, description: 'Dirección establecida como predeterminada' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Dirección no encontrada' })
  async setDefault(@Param('id') id: string, @CurrentUser() user: User) {
    return this.addressesService.setDefault(id, user.id);
  }
}

