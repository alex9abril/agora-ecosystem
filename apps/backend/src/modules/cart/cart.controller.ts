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
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@supabase/supabase-js';

@ApiTags('Cart')
@ApiBearerAuth()
@Controller('cart')
@UseGuards(SupabaseAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener carrito del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Carrito obtenido exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async getCart(@CurrentUser() user: User) {
    return this.cartService.getCart(user.id);
  }

  @Post('items')
  @ApiOperation({ summary: 'Agregar item al carrito' })
  @ApiResponse({ status: 201, description: 'Item agregado al carrito exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o producto no disponible' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  @ApiResponse({ status: 409, description: 'No se pueden mezclar productos de diferentes tiendas' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async addItem(@CurrentUser() user: User, @Body() addItemDto: AddCartItemDto) {
    console.log('📦 [CartController.addItem] Request recibido:', {
      userId: user.id,
      productId: addItemDto.productId,
      productIdType: typeof addItemDto.productId,
      productIdLength: addItemDto.productId?.length,
      productIdValue: JSON.stringify(addItemDto.productId),
      quantity: addItemDto.quantity,
      branchId: addItemDto.branchId,
      fullDto: JSON.stringify(addItemDto),
    });
    return this.cartService.addItem(user.id, addItemDto);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Actualizar item del carrito' })
  @ApiParam({ name: 'itemId', description: 'ID del item a actualizar' })
  @ApiResponse({ status: 200, description: 'Item actualizado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Item no encontrado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async updateItem(
    @CurrentUser() user: User,
    @Param('itemId') itemId: string,
    @Body() updateItemDto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(user.id, itemId, updateItemDto);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Eliminar item del carrito' })
  @ApiParam({ name: 'itemId', description: 'ID del item a eliminar' })
  @ApiResponse({ status: 200, description: 'Item eliminado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Item no encontrado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async removeItem(@CurrentUser() user: User, @Param('itemId') itemId: string) {
    return this.cartService.removeItem(user.id, itemId);
  }

  @Delete()
  @ApiOperation({ summary: 'Vaciar carrito completamente' })
  @ApiResponse({ status: 200, description: 'Carrito vaciado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async clearCart(@CurrentUser() user: User) {
    return this.cartService.clearCart(user.id);
  }
}

