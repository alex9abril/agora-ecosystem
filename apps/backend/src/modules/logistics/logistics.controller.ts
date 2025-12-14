import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Res,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Response } from 'express';
import { LogisticsService } from './logistics.service';
import { CreateShippingLabelDto } from './dto/create-shipping-label.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Logistics')
@Controller('logistics')
@UseGuards(SupabaseAuthGuard)
export class LogisticsController {
  constructor(private readonly logisticsService: LogisticsService) {}

  @Post('shipping-labels')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Generar guía de envío para una orden',
    description:
      'Genera una guía de envío con número de seguimiento y PDF cuando la orden está lista para recoger (status: completed). Inicia la simulación automática de estados.',
  })
  @ApiResponse({
    status: 201,
    description: 'Guía de envío generada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'La orden no está en estado válido o ya tiene una guía',
  })
  @ApiResponse({
    status: 404,
    description: 'Orden no encontrada',
  })
  async createShippingLabel(@Body() createDto: CreateShippingLabelDto) {
    return this.logisticsService.createShippingLabel(createDto);
  }

  @Get('shipping-labels/order/:orderId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener guía de envío por ID de orden',
  })
  @ApiParam({
    name: 'orderId',
    description: 'ID de la orden',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Guía de envío obtenida exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Guía de envío no encontrada',
  })
  async getShippingLabelByOrderId(@Param('orderId') orderId: string) {
    const shippingLabel = await this.logisticsService.getShippingLabelByOrderId(orderId);
    if (!shippingLabel) {
      throw new NotFoundException(`No se encontró guía de envío para la orden ${orderId}`);
    }
    return shippingLabel;
  }

  @Get('shipping-labels/tracking/:trackingNumber')
  @Public()
  @ApiOperation({
    summary: 'Obtener guía de envío por número de seguimiento (público)',
    description: 'Endpoint público para consultar el estado de una guía de envío',
  })
  @ApiParam({
    name: 'trackingNumber',
    description: 'Número de guía de seguimiento',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Guía de envío obtenida exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Guía de envío no encontrada',
  })
  async getShippingLabelByTrackingNumber(
    @Param('trackingNumber') trackingNumber: string
  ) {
    const shippingLabel =
      await this.logisticsService.getShippingLabelByTrackingNumber(trackingNumber);
    if (!shippingLabel) {
      throw new NotFoundException(
        `No se encontró guía de envío con número ${trackingNumber}`
      );
    }
    return shippingLabel;
  }

  @Get('shipping-labels/:orderId/pdf')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Descargar PDF de guía de envío',
    description: 'Obtiene el archivo PDF de la guía de envío para imprimir',
  })
  @ApiParam({
    name: 'orderId',
    description: 'ID de la orden',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'PDF de guía de envío',
    content: {
      'application/pdf': {},
    },
  })
  @ApiResponse({
    status: 404,
    description: 'PDF no encontrado',
  })
  async getShippingLabelPDF(
    @Param('orderId') orderId: string,
    @Res() res: Response
  ) {
    const pdfBuffer = await this.logisticsService.getShippingLabelPDF(orderId);

    if (!pdfBuffer) {
      throw new NotFoundException(
        `No se encontró PDF de guía de envío para la orden ${orderId}`
      );
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="shipping-label-${orderId}.pdf"`
    );
    res.send(pdfBuffer);
  }
}

