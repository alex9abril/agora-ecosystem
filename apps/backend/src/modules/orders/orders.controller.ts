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
  @ApiOperation({ summary: 'Actualizar estado de pedido' })
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
  ) {
    return this.ordersService.updateStatus(id, businessId, body.status, {
      estimated_delivery_time: body.estimated_delivery_time,
      cancellation_reason: body.cancellation_reason,
    });
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
}
