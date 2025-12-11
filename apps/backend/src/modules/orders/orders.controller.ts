import {
  Controller,
  Get,
  Post,
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
  ApiQuery,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CheckoutDto } from './dto/checkout.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@supabase/supabase-js';

@ApiTags('orders')
@Controller('orders')
@UseGuards(SupabaseAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear pedido desde carrito (checkout)' })
  @ApiResponse({ status: 201, description: 'Pedido creado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 400, description: 'Carrito vacío o datos inválidos' })
  @ApiResponse({ status: 404, description: 'Dirección no encontrada' })
  async checkout(@Body() checkoutDto: CheckoutDto, @CurrentUser() user: User) {
    return this.ordersService.checkout(user.id, checkoutDto);
  }

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Listar pedidos del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Lista de pedidos obtenida exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async findAll(@CurrentUser() user: User) {
    return this.ordersService.findAll(user.id);
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener detalle de pedido' })
  @ApiParam({ name: 'id', description: 'ID del pedido', type: String })
  @ApiResponse({ status: 200, description: 'Pedido obtenido exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Pedido no encontrado' })
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.ordersService.findOne(id, user.id);
  }

  @Post(':id/cancel')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Cancelar pedido' })
  @ApiParam({ name: 'id', description: 'ID del pedido', type: String })
  @ApiResponse({ status: 200, description: 'Pedido cancelado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Pedido no encontrado' })
  @ApiResponse({ status: 400, description: 'El pedido no se puede cancelar' })
  async cancel(@Param('id') id: string, @CurrentUser() user: User, @Body() body?: { reason?: string }) {
    return this.ordersService.cancel(id, user.id, body?.reason);
  }

  // ============================================================================
  // ENDPOINTS PARA NEGOCIOS
  // ============================================================================

  @Get('business/:businessId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Listar pedidos de un negocio' })
  @ApiParam({ name: 'businessId', description: 'ID del negocio', type: String })
  @ApiQuery({ name: 'status', required: false, description: 'Filtrar por estado del pedido' })
  @ApiQuery({ name: 'payment_status', required: false, description: 'Filtrar por estado de pago' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Fecha de inicio (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Fecha de fin (ISO string)' })
  @ApiQuery({ name: 'search', required: false, description: 'Búsqueda por dirección, ID o nombre de producto' })
  @ApiResponse({ status: 200, description: 'Lista de pedidos obtenida exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async findAllByBusiness(
    @Param('businessId') businessId: string,
    @Query('status') status?: string,
    @Query('payment_status') payment_status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ) {
    return this.ordersService.findAllByBusiness(businessId, {
      status,
      payment_status,
      startDate,
      endDate,
      search,
    });
  }

  @Get('business/:businessId/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener detalle de pedido para negocio' })
  @ApiParam({ name: 'businessId', description: 'ID del negocio', type: String })
  @ApiParam({ name: 'id', description: 'ID del pedido', type: String })
  @ApiResponse({ status: 200, description: 'Pedido obtenido exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Pedido no encontrado' })
  async findOneByBusiness(
    @Param('id') id: string,
    @Param('businessId') businessId: string,
  ) {
    return this.ordersService.findOneByBusiness(id, businessId);
  }

  @Post('business/:businessId/:id/status')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar estado de pedido (para negocios)' })
  @ApiParam({ name: 'businessId', description: 'ID del negocio', type: String })
  @ApiParam({ name: 'id', description: 'ID del pedido', type: String })
  @ApiResponse({ status: 200, description: 'Estado actualizado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Pedido no encontrado' })
  @ApiResponse({ status: 400, description: 'Transición de estado inválida' })
  async updateStatus(
    @Param('id') id: string,
    @Param('businessId') businessId: string,
    @Body() body: { status: string; estimated_delivery_time?: number; cancellation_reason?: string },
    @CurrentUser() user: User,
  ) {
    // Obtener rol del usuario desde el perfil
    let userRole = 'local';
    try {
      const userProfile = await this.ordersService.getUserProfile(user.id);
      userRole = userProfile?.role || 'local';
    } catch (error) {
      console.warn('No se pudo obtener perfil de usuario, usando rol por defecto:', error);
    }
    
    return this.ordersService.updateStatus(id, businessId, body.status, {
      estimated_delivery_time: body.estimated_delivery_time,
      cancellation_reason: body.cancellation_reason,
      changed_by_user_id: user.id,
      changed_by_role: userRole as any,
    });
  }

  @Post('business/:businessId/:id/payment-status')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar estado de pago (modo prueba)' })
  @ApiParam({ name: 'businessId', description: 'ID del negocio', type: String })
  @ApiParam({ name: 'id', description: 'ID del pedido', type: String })
  @ApiResponse({ status: 200, description: 'Estado de pago actualizado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Pedido no encontrado' })
  @ApiResponse({ status: 400, description: 'Estado de pago inválido' })
  async updatePaymentStatus(
    @Param('id') id: string,
    @Param('businessId') businessId: string,
    @Body() body: { payment_status: string },
    @CurrentUser() user: User,
  ) {
    // Obtener rol del usuario desde el perfil
    let userRole = 'local';
    try {
      const userProfile = await this.ordersService.getUserProfile(user.id);
      userRole = userProfile?.role || 'local';
    } catch (error) {
      console.warn('No se pudo obtener perfil de usuario, usando rol por defecto:', error);
    }
    
    return this.ordersService.updatePaymentStatus(id, businessId, body.payment_status, {
      changed_by_user_id: user.id,
      changed_by_role: userRole as any,
    });
  }

  // ============================================================================
  // ENDPOINTS PARA REPARTIDORES
  // ============================================================================

  @Post('delivery/:id/pickup')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Marcar pedido como recogido (repartidor)' })
  @ApiParam({ name: 'id', description: 'ID del pedido', type: String })
  @ApiResponse({ status: 200, description: 'Pedido marcado como recogido' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Pedido no encontrado' })
  @ApiResponse({ status: 400, description: 'El pedido no está asignado a este repartidor' })
  async pickupOrder(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.updateDeliveryStatus(id, user.id, 'picked_up');
  }

  @Post('delivery/:id/in-transit')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Marcar pedido como en tránsito (repartidor)' })
  @ApiParam({ name: 'id', description: 'ID del pedido', type: String })
  @ApiResponse({ status: 200, description: 'Pedido marcado como en tránsito' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Pedido no encontrado' })
  async markInTransit(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.updateDeliveryStatus(id, user.id, 'in_transit');
  }

  @Post('delivery/:id/delivered')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Marcar pedido como entregado (repartidor)' })
  @ApiParam({ name: 'id', description: 'ID del pedido', type: String })
  @ApiResponse({ status: 200, description: 'Pedido marcado como entregado' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Pedido no encontrado' })
  async markDelivered(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.updateDeliveryStatus(id, user.id, 'delivered');
  }

  @Delete('business/:businessId/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '⚠️ TEMPORAL: Eliminar pedido físicamente de la base de datos' })
  @ApiParam({ name: 'businessId', description: 'ID del negocio', type: String })
  @ApiParam({ name: 'id', description: 'ID del pedido', type: String })
  @ApiResponse({ status: 200, description: 'Pedido eliminado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Pedido no encontrado' })
  async deleteOrder(
    @Param('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.ordersService.deleteOrder(id, businessId);
  }

  @Post('business/:businessId/:id/prepare')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Procesar preparación de pedido' })
  @ApiParam({ name: 'businessId', description: 'ID del negocio', type: String })
  @ApiParam({ name: 'id', description: 'ID del pedido', type: String })
  @ApiResponse({ status: 200, description: 'Preparación procesada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Pedido no encontrado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async prepareOrder(
    @Param('id') id: string,
    @Param('businessId') businessId: string,
    @Body() prepareDto: any,
    @CurrentUser() user: User,
  ) {
    // Obtener rol del usuario desde el perfil
    let userRole = 'local';
    try {
      const userProfile = await this.ordersService.getUserProfile(user.id);
      userRole = userProfile?.role || 'local';
    } catch (error) {
      console.warn('No se pudo obtener perfil de usuario, usando rol por defecto:', error);
    }
    
    return this.ordersService.prepareOrder(id, businessId, prepareDto, {
      changed_by_user_id: user.id,
      changed_by_role: userRole as any,
    });
  }
}
