import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../../../common/guards/supabase-auth.guard';
import { KarlopayWebhookGuard } from '../../../common/guards/karlopay-webhook.guard';
import { Public } from '../../../common/decorators/public.decorator';
import { KarlopayService } from './karlopay.service';
import { CreateKarlopayOrderDto } from './dto/create-karlopay-order.dto';
import { KarlopayPaymentWebhookDto } from './dto/karlopay-payment-webhook.dto';
import { CreatePaymentSessionDto } from './dto/create-payment-session.dto';
import { EmbeddedInitDto } from './dto/embedded-init.dto';

@ApiTags('Payments - Karlopay')
@Controller('payments/karlopay')
export class KarlopayController {
  constructor(private readonly karlopayService: KarlopayService) {}

  @Post('create-order')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear o actualizar orden en Karlopay' })
  @ApiResponse({ status: 201, description: 'Orden creada/actualizada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 503, description: 'Error procesando orden en Karlopay' })
  async createOrder(@Body() createOrderDto: CreateKarlopayOrderDto) {
    return this.karlopayService.createOrUpdateOrder(createOrderDto);
  }

  @Post('session')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear sesión de pago (redirect o embedded)' })
  @ApiResponse({ status: 201, description: 'Sesión creada' })
  async createSession(@Body() dto: CreatePaymentSessionDto) {
    return this.karlopayService.createPaymentSession(
      {
        orderGroupId: dto.orderGroupId,
        numberOfOrder: dto.numberOfOrder,
        total: dto.total,
        customer: dto.customer,
        operations: dto.operations,
        redirectUrl: dto.redirectUrl,
        additional: dto.additional,
      },
      dto.businessId,
    );
  }

  @Post('embedded/init')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Inicializar pago embebido (stub: fallback a redirect si no hay SDK)' })
  @ApiResponse({ status: 200, description: 'Init result con embeddedConfig o fallback' })
  async embeddedInit(@Body() dto: EmbeddedInitDto) {
    return this.karlopayService.initEmbeddedSession(
      dto.orderGroupId,
      dto.numberOfOrder,
      dto.businessId,
    );
  }

  @Get('status/:orderGroupIdOrNumberOfOrder')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Consultar estado de pago' })
  @ApiParam({ name: 'orderGroupIdOrNumberOfOrder', description: 'order_group_id o numberOfOrder' })
  @ApiResponse({ status: 200, description: 'Estado del pago' })
  async getStatus(@Param('orderGroupIdOrNumberOfOrder') orderGroupIdOrNumberOfOrder: string) {
    return this.karlopayService.getPaymentStatus(orderGroupIdOrNumberOfOrder);
  }

  @Post('webhook/payment')
  @Public()
  @UseGuards(KarlopayWebhookGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook para recibir confirmación de pago de Karlopay (protegido por IP whitelist y/o secret)' })
  @ApiResponse({ status: 200, description: 'Webhook procesado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'IP no autorizada o firma inválida' })
  async paymentWebhook(@Body() body: Record<string, any>) {
    await this.karlopayService.processPaymentWebhook(body as KarlopayPaymentWebhookDto, body);
    return { success: true, message: 'Webhook procesado exitosamente' };
  }

  @Post('confirm-redirect')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmación de pago desde redirect de Karlopay (público)' })
  @ApiResponse({ status: 200, description: 'Confirmación procesada' })
  async confirmRedirect(@Body() payload: any) {
    return this.karlopayService.processRedirectConfirmation(payload);
  }
}

