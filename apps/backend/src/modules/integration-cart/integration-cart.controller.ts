import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiHeader,
  ApiSecurity,
  ApiQuery,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { SkipIntegrationCartWebhook } from './decorators/skip-integration-cart-webhook.decorator';
import { IntegrationCartWebhookGuard } from './guards/integration-cart-webhook.guard';
import { IntegrationCartService } from './integration-cart.service';
import { CreateIntegrationCartDto } from './dto/create-integration-cart.dto';
import { AddIntegrationCartItemDto } from './dto/add-integration-cart-item.dto';
import { PatchIntegrationCartItemDto } from './dto/patch-integration-cart-item.dto';
import { CreateIntegrationCartLinkDto } from './dto/create-integration-cart-link.dto';

@ApiTags('Integration Cart')
@ApiSecurity('ApiKey')
@ApiHeader({
  name: 'X-Webhook-Secret',
  required: false,
  description: 'Clave de integración (alternativa: Authorization: Bearer &lt;clave&gt;)',
})
@Public()
@UseGuards(IntegrationCartWebhookGuard)
@Controller('integrations/cart')
export class IntegrationCartController {
  constructor(private readonly integrationCartService: IntegrationCartService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear carrito de integración para una tienda (core.stores)' })
  @ApiResponse({ status: 201, description: 'Carrito creado' })
  @ApiResponse({ status: 401, description: 'Clave inválida o no configurada' })
  @ApiResponse({ status: 404, description: 'Tienda no encontrada' })
  async create(@Body() dto: CreateIntegrationCartDto) {
    return this.integrationCartService.createCart(dto.storeId);
  }

  @Get('session')
  @SkipIntegrationCartWebhook()
  @ApiOperation({
    summary: 'Obtener carrito por token del enlace (query t)',
    description:
      'Valida la firma HMAC del token generado con POST/GET /integrations/cart/:cartId/link. No requiere X-Webhook-Secret.',
  })
  @ApiQuery({ name: 't', required: true, description: 'Token firmado (query en la URL del enlace)' })
  @ApiResponse({ status: 200, description: 'Carrito con ítems' })
  @ApiResponse({ status: 400, description: 'Token inválido, ausente o expirado' })
  @ApiResponse({ status: 410, description: 'Carrito expirado en base de datos' })
  @ApiResponse({ status: 503, description: 'Falta secreto para validar o BD no disponible' })
  async getSession(@Query('t') token: string) {
    return this.integrationCartService.getCartByLinkToken(token ?? '');
  }

  @Post(':cartId/link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Generar enlace público firmado (query `t`) para abrir el carrito en el sitio; n8n solo orquesta, la firma la hace el backend',
    description:
      'Requiere `phone`: busca al usuario por teléfono y devuelve un enlace con sesión automática (magic link) que redirige al carrito tokenizado. Sin `path`: la URL se arma desde el `store_id` del carrito.',
  })
  @ApiParam({ name: 'cartId', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'url (magic link), checkout_url, token, store_id, link_expires_at' })
  @ApiResponse({ status: 400, description: 'phone inválido o storeId no coincide con el carrito' })
  @ApiResponse({ status: 404, description: 'No existe usuario con ese teléfono' })
  @ApiResponse({ status: 422, description: 'Tienda sin slug o tipo no soportado para URL' })
  @ApiResponse({ status: 503, description: 'Falta FRONTEND_URL o secreto para firmar' })
  async createShareLinkPost(
    @Param('cartId') cartId: string,
    @Body() dto: CreateIntegrationCartLinkDto,
  ) {
    return this.integrationCartService.createShareLink(cartId, dto);
  }

  @Get(':cartId/link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Igual que POST :cartId/link; query opcional ttlSeconds, path, storeId, requerido phone' })
  @ApiParam({ name: 'cartId', format: 'uuid' })
  @ApiQuery({ name: 'storeId', required: false, description: 'UUID core.stores; obligatorio si no se envía path' })
  @ApiQuery({ name: 'phone', required: true, description: 'Teléfono del usuario para sesión automática' })
  async createShareLinkGet(
    @Param('cartId') cartId: string,
    @Query('ttlSeconds') ttlSecondsRaw?: string,
    @Query('path') path?: string,
    @Query('storeId') storeId?: string,
    @Query('phone') phone?: string,
  ) {
    const dto = new CreateIntegrationCartLinkDto();
    dto.phone = phone ?? '';
    if (ttlSecondsRaw !== undefined && ttlSecondsRaw !== '') {
      const n = parseInt(ttlSecondsRaw, 10);
      if (Number.isFinite(n)) dto.ttlSeconds = n;
    }
    if (path) dto.path = path;
    if (storeId) dto.storeId = storeId;
    return this.integrationCartService.createShareLink(cartId, dto);
  }

  @Get(':cartId')
  @ApiOperation({ summary: 'Obtener carrito con ítems' })
  @ApiParam({ name: 'cartId', format: 'uuid' })
  @ApiResponse({ status: 410, description: 'Carrito expirado' })
  async getOne(@Param('cartId') cartId: string) {
    return this.integrationCartService.getCart(cartId);
  }

  @Post(':cartId/items')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Agregar o incrementar ítem (misma línea si producto/variantes/sucursal coinciden)' })
  @ApiParam({ name: 'cartId', format: 'uuid' })
  async addItem(@Param('cartId') cartId: string, @Body() dto: AddIntegrationCartItemDto) {
    return this.integrationCartService.addItem(cartId, dto);
  }

  @Patch(':cartId/items/:itemId')
  @ApiOperation({ summary: 'Ajustar cantidad (absolute o delta). Si cantidad ≤ 0, elimina el ítem' })
  @ApiParam({ name: 'cartId', format: 'uuid' })
  @ApiParam({ name: 'itemId', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Carrito actualizado o vacío (body null si se eliminó el carrito)' })
  async patchItem(
    @Param('cartId') cartId: string,
    @Param('itemId') itemId: string,
    @Body() dto: PatchIntegrationCartItemDto,
  ) {
    return this.integrationCartService.patchItem(cartId, itemId, dto);
  }

  @Delete(':cartId/items/:itemId')
  @ApiOperation({ summary: 'Eliminar ítem del carrito' })
  @ApiParam({ name: 'cartId', format: 'uuid' })
  @ApiParam({ name: 'itemId', format: 'uuid' })
  async removeItem(@Param('cartId') cartId: string, @Param('itemId') itemId: string) {
    return this.integrationCartService.removeItem(cartId, itemId);
  }

  @Delete(':cartId')
  @ApiOperation({ summary: 'Eliminar carrito completo' })
  @ApiParam({ name: 'cartId', format: 'uuid' })
  async deleteCart(@Param('cartId') cartId: string) {
    return this.integrationCartService.deleteCart(cartId);
  }
}
