import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@supabase/supabase-js';
import { BusinessUsersService } from './business-users.service';
import { AssignUserDto } from './dto/assign-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { CreateUserDto } from './dto/create-user.dto';

@ApiTags('business-users')
@Controller('business-users')
@UseGuards(SupabaseAuthGuard)
export class BusinessUsersController {
  constructor(private readonly businessUsersService: BusinessUsersService) {}

  @Get('superadmin/businesses')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener todas las tiendas del superadmin' })
  @ApiResponse({ status: 200, description: 'Lista de tiendas obtenida exitosamente' })
  async getSuperadminBusinesses(@CurrentUser() user: User) {
    return this.businessUsersService.getSuperadminBusinesses(user.id);
  }

  @Get('business/:businessId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener todos los usuarios de un negocio' })
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios obtenida exitosamente' })
  async getBusinessUsers(
    @Param('businessId') businessId: string,
    @CurrentUser() user: User
  ) {
    // Verificar que el usuario es superadmin del negocio
    const isSuperadmin = await this.businessUsersService.isSuperadminOfBusiness(
      user.id,
      businessId
    );
    if (!isSuperadmin) {
      throw new ForbiddenException('Solo el superadmin puede ver los usuarios del negocio');
    }

    return this.businessUsersService.getBusinessUsers(businessId);
  }

  @Get('available/:businessId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener usuarios disponibles para asignar' })
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiQuery({ name: 'search', required: false, description: 'Término de búsqueda' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios disponibles' })
  async getAvailableUsers(
    @Param('businessId') businessId: string,
    @Query('search') search?: string,
    @CurrentUser() user?: User
  ) {
    // Verificar que el usuario es superadmin del negocio
    if (user) {
      const isSuperadmin = await this.businessUsersService.isSuperadminOfBusiness(
        user.id,
        businessId
      );
      if (!isSuperadmin) {
        throw new ForbiddenException('Solo el superadmin puede ver usuarios disponibles');
      }
    }

    return this.businessUsersService.getAvailableUsers(businessId, search);
  }

  @Post('business/:businessId/assign')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Asignar usuario a un negocio' })
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiResponse({ status: 201, description: 'Usuario asignado exitosamente' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  async assignUserToBusiness(
    @Param('businessId') businessId: string,
    @Body() assignDto: AssignUserDto,
    @CurrentUser() user: User
  ) {
    // Verificar que el usuario es superadmin del negocio
    const isSuperadmin = await this.businessUsersService.isSuperadminOfBusiness(
      user.id,
      businessId
    );
    if (!isSuperadmin) {
      throw new ForbiddenException('Solo el superadmin puede asignar usuarios');
    }

    return this.businessUsersService.assignUserToBusiness(businessId, user.id, assignDto);
  }

  @Patch('business/:businessId/user/:userId/role')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Cambiar rol de usuario en un negocio' })
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiParam({ name: 'userId', description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Rol actualizado exitosamente' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  async changeUserRole(
    @Param('businessId') businessId: string,
    @Param('userId') userId: string,
    @Body() updateDto: UpdateUserRoleDto,
    @CurrentUser() user: User
  ) {
    // Verificar que el usuario es superadmin del negocio
    const isSuperadmin = await this.businessUsersService.isSuperadminOfBusiness(
      user.id,
      businessId
    );
    if (!isSuperadmin) {
      throw new ForbiddenException('Solo el superadmin puede cambiar roles');
    }

    return this.businessUsersService.changeUserRole(businessId, userId, user.id, updateDto);
  }

  @Delete('business/:businessId/user/:userId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Remover usuario de un negocio' })
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiParam({ name: 'userId', description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Usuario removido exitosamente' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  async removeUserFromBusiness(
    @Param('businessId') businessId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: User
  ) {
    // Verificar que el usuario es superadmin del negocio
    const isSuperadmin = await this.businessUsersService.isSuperadminOfBusiness(
      user.id,
      businessId
    );
    if (!isSuperadmin) {
      throw new ForbiddenException('Solo el superadmin puede remover usuarios');
    }

    return this.businessUsersService.removeUserFromBusiness(businessId, userId, user.id);
  }

  @Get('user/:userId/summary')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener resumen de permisos de un usuario' })
  @ApiParam({ name: 'userId', description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Resumen obtenido exitosamente' })
  async getUserBusinessesSummary(
    @Param('userId') userId: string,
    @CurrentUser() user: User
  ) {
    // Solo el mismo usuario puede ver su resumen (o un admin del sistema)
    if (userId !== user.id) {
      throw new ForbiddenException('Solo puedes ver tu propio resumen de permisos');
    }

    return this.businessUsersService.getUserBusinessesSummary(userId);
  }

  // ============================================================================
  // ENDPOINTS A NIVEL DE CUENTA DEL SUPERADMIN
  // ============================================================================

  @Get('superadmin/account/users')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener todos los usuarios de la cuenta del superadmin (todas sus tiendas)' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios obtenida exitosamente' })
  async getSuperadminAccountUsers(@CurrentUser() user: User) {
    return this.businessUsersService.getSuperadminAccountUsers(user.id);
  }

  @Get('superadmin/account/available-users')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener usuarios disponibles para asignar a la cuenta del superadmin' })
  @ApiQuery({ name: 'search', required: false, description: 'Término de búsqueda' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios disponibles' })
  async getAvailableUsersForSuperadminAccount(
    @Query('search') search?: string,
    @CurrentUser() user?: User
  ) {
    if (!user) {
      throw new ForbiddenException('Debes estar autenticado');
    }
    return this.businessUsersService.getAvailableUsersForSuperadminAccount(user.id, search);
  }

  @Delete('superadmin/account/user/:userId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Remover usuario de todas las tiendas de la cuenta del superadmin' })
  @ApiParam({ name: 'userId', description: 'ID del usuario a remover' })
  @ApiResponse({ status: 200, description: 'Usuario removido exitosamente' })
  async removeUserFromSuperadminAccount(
    @Param('userId') userId: string,
    @CurrentUser() user: User
  ) {
    return this.businessUsersService.removeUserFromSuperadminAccount(user.id, userId);
  }

  @Get('superadmin/account/users-summary')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener resumen de usuarios por tienda de la cuenta del superadmin' })
  @ApiResponse({ status: 200, description: 'Resumen obtenido exitosamente' })
  async getSuperadminAccountUsersSummary(@CurrentUser() user: User) {
    return this.businessUsersService.getSuperadminAccountUsersSummary(user.id);
  }

  @Get('check-email/:email')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Verificar si un email ya está registrado' })
  @ApiParam({ name: 'email', description: 'Email a verificar' })
  @ApiResponse({ status: 200, description: 'Verificación exitosa', schema: { type: 'object', properties: { exists: { type: 'boolean' } } } })
  async checkEmailExists(
    @Param('email') email: string,
    @CurrentUser() user: User
  ) {
    const exists = await this.businessUsersService.checkEmailExists(email);
    return { exists };
  }

  @Post('superadmin/account/create-user')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear un nuevo usuario y asignarlo a las tiendas del superadmin' })
  @ApiResponse({ status: 201, description: 'Usuario creado y asignado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  @ApiResponse({ status: 409, description: 'El email ya está registrado' })
  async createUserForSuperadminAccount(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() user: User
  ) {
    return this.businessUsersService.createUserForSuperadminAccount(user.id, createUserDto);
  }
}

