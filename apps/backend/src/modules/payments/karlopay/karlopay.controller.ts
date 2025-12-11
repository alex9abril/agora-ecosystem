import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../../../common/guards/supabase-auth.guard';
import { Public } from '../../../common/decorators/public.decorator';
import { KarlopayService } from './karlopay.service';
import { CreateKarlopayOrderDto } from './dto/create-karlopay-order.dto';
import { KarlopayPaymentWebhookDto } from './dto/karlopay-payment-webhook.dto';

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

  @Post('webhook/payment')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook para recibir confirmación de pago de Karlopay (público)' })
  @ApiResponse({ status: 200, description: 'Webhook procesado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async paymentWebhook(@Body() webhookDto: KarlopayPaymentWebhookDto) {
    await this.karlopayService.processPaymentWebhook(webhookDto);
    return { success: true, message: 'Webhook procesado exitosamente' };
  }
}

