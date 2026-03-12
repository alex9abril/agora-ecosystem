import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Res,
  UseGuards,
  NotFoundException,
  BadRequestException,
  Logger,
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
import { SkydropxService } from './skydropx/skydropx.service';
import { QuotationRequestDto } from './skydropx/dto/quotation-request.dto';
import { CreateShipmentDto } from './skydropx/dto/create-shipment.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Logistics')
@Controller('logistics')
@UseGuards(SupabaseAuthGuard)
export class LogisticsController {
  private readonly logger = new Logger(LogisticsController.name);

  constructor(
    private readonly logisticsService: LogisticsService,
    private readonly skydropxService: SkydropxService
  ) {}

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
    this.logger.log(`📦 Recibida solicitud para crear shipping label para orden: ${createDto.orderId}`);
    try {
      const result = await this.logisticsService.createShippingLabel(createDto);
      this.logger.log(`✅ Shipping label creado exitosamente para orden: ${createDto.orderId}`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Error creando shipping label para orden ${createDto.orderId}:`, error.message);
      this.logger.error(`Stack trace:`, error.stack);
      throw error;
    }
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
    // Forzar descarga sin caché
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.send(pdfBuffer);
  }

  @Get('pickup-label/:orderId/pdf')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Descargar PDF etiqueta de pickup',
    description: 'Genera un PDF en tamaño estándar de etiqueta (4x6 in) con número de pedido, cliente y contenido. Solo para órdenes con recoger en tienda.',
  })
  @ApiParam({ name: 'orderId', description: 'ID de la orden', type: String })
  @ApiResponse({ status: 200, description: 'PDF etiqueta pickup', content: { 'application/pdf': {} } })
  @ApiResponse({ status: 404, description: 'Orden no encontrada o no es pickup' })
  async getPickupLabelPDF(
    @Param('orderId') orderId: string,
    @Res() res: Response
  ) {
    const pdfBuffer = await this.logisticsService.getPickupLabelPDF(orderId);
    if (!pdfBuffer) {
      throw new NotFoundException(
        `No se pudo generar la etiqueta. La orden ${orderId} no existe o no es de recoger en tienda.`
      );
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="etiqueta-pickup-${orderId}.pdf"`
    );
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.send(pdfBuffer);
  }

  @Get('shipments/:orderId/tracking')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener estado de seguimiento de envío',
    description: 'Obtiene el estado actual de seguimiento de un envío desde Skydropx y actualiza el estado en la base de datos',
  })
  @ApiParam({
    name: 'orderId',
    description: 'ID de la orden',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado de seguimiento obtenido exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'No se encontró shipping label para la orden',
  })
  @ApiResponse({
    status: 503,
    description: 'Error al consultar Skydropx',
  })
  async getShipmentTracking(@Param('orderId') orderId: string) {
    this.logger.log(`📦 Consultando tracking para orden: ${orderId}`);
    
    const tracking = await this.logisticsService.getShipmentTracking(orderId);

    if (!tracking) {
      throw new NotFoundException(
        `No se encontró información de tracking para la orden ${orderId}`
      );
    }

    return {
      success: true,
      data: tracking,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('shipments/:orderId/tracking-events')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener eventos de tracking detallados',
    description: 'Obtiene el historial completo de eventos de tracking desde Skydropx para mostrar en un timeline',
  })
  @ApiParam({
    name: 'orderId',
    description: 'ID de la orden',
  })
  @ApiResponse({
    status: 200,
    description: 'Eventos de tracking obtenidos exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'No se encontró shipping label para la orden',
  })
  @ApiResponse({
    status: 503,
    description: 'Error al consultar Skydropx',
  })
  async getTrackingEvents(@Param('orderId') orderId: string) {
    this.logger.log(`📦 Consultando eventos de tracking para orden: ${orderId}`);
    
    const events = await this.logisticsService.getTrackingEvents(orderId);

    return {
      success: true,
      data: {
        events,
        count: events.length,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Post('quotations')
  @Public()
  @ApiOperation({
    summary: 'Obtener cotizaciones de envío',
    description:
      'Obtiene cotizaciones de envío desde Skydropx. Este endpoint puede procesar las cotizaciones internamente antes de llamar a Skydropx (mejora futura).',
  })
  @ApiResponse({
    status: 200,
    description: 'Cotizaciones obtenidas exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de cotización inválidos',
  })
  @ApiResponse({
    status: 503,
    description: 'Skydropx no está disponible o no está habilitado',
  })
  async getQuotations(@Body() quotationRequest: QuotationRequestDto) {
    // Transformar el formato del request al formato de Skydropx
    // Según la documentación oficial: https://pro.skydropx.com/es-MX/api-docs
    // El payload debe estar envuelto en un objeto "quotation"
    // Las direcciones necesitan campos adicionales: street1, internal_number, reference, name, company, phone, email
    // Se requiere el campo "requested_carriers" con al menos un carrier
    
    // Normalizar código de país
    const normalizeCountryCode = (country: string): string => {
      if (country === 'México' || country === 'Mexico' || country === 'MEX') return 'MX';
      if (country.length === 2) return country.toUpperCase();
      return country;
    };

    // Normalizar estado de México (CDMX puede necesitar formato específico)
    const normalizeState = (state: string): string => {
      const normalized = state.trim();
      if (normalized === 'CDMX' || normalized === 'Ciudad de México' || normalized === 'Distrito Federal' || normalized === 'DF') {
        return 'Ciudad de México';
      }
      return normalized;
    };

    // Construir street1 combinando street y number
    const buildStreet1 = (street: string, number: string): string => {
      const streetTrimmed = street.trim();
      const numberTrimmed = number.trim();
      return numberTrimmed ? `${streetTrimmed} ${numberTrimmed}` : streetTrimmed;
    };

    // Construir referencia (máximo 30 caracteres)
    const buildReference = (district?: string, city?: string): string => {
      const ref = (district || city || '').trim();
      return ref.substring(0, 30); // Máximo 30 caracteres
    };

    // Validar y normalizar dimensiones del paquete
    const normalizeParcel = (parcel: any) => {
      const length = Math.max(1, Math.round(parcel.length || 1)); // Mínimo 1cm
      const width = Math.max(1, Math.round(parcel.width || 1)); // Mínimo 1cm
      const height = Math.max(1, Math.round(parcel.height || 1)); // Mínimo 1cm
      const weight = Math.max(0.01, parseFloat(parcel.weight?.toString() || '0.01')); // Mínimo 0.01kg según docs

      return {
        length,
        width,
        height,
        weight,
      };
    };

    // Construir dirección completa para Skydropx
    const buildSkydropxAddress = (address: any) => {
      const countryCode = normalizeCountryCode(address.country);
      const state = normalizeState(address.state);
      
      return {
        country_code: countryCode,
        postal_code: address.postal_code.trim(),
        area_level1: state,
        area_level2: address.city.trim(),
        area_level3: (address.district || address.city).trim(),
        street1: buildStreet1(address.street, address.number),
        internal_number: '', // No tenemos este dato, dejar vacío
        reference: buildReference(address.district, address.city),
        name: address.name.trim(),
        company: '', // No tenemos este dato, dejar vacío para personas físicas
        phone: address.phone.trim(),
        email: (address.email || '').trim(),
      };
    };

    // Determinar si es envío internacional
    const originCountry = normalizeCountryCode(quotationRequest.origin.country);
    const destinationCountry = normalizeCountryCode(quotationRequest.destination.country);
    const isInternational = originCountry !== destinationCountry;

    // Construir el payload según la especificación de Skydropx
    const skydropxRequest = {
      quotation: {
        address_from: buildSkydropxAddress(quotationRequest.origin),
        address_to: buildSkydropxAddress(quotationRequest.destination),
        parcels: quotationRequest.parcels.map(normalizeParcel),
        requested_carriers: ['fedex', 'dhl', 'ups', 'estafeta'], // Carriers comunes en México
        // products solo se incluye para envíos internacionales
        ...(isInternational ? {
          products: [] // Por ahora vacío, se puede implementar después si es necesario
        } : {}),
      },
    };

    return this.skydropxService.getQuotations(skydropxRequest);
  }

  @Post('shipments')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Crear envío usando un rate_id',
    description:
      'Crea un envío real en Skydropx usando el rate_id de una cotización previamente obtenida. Este endpoint requiere el payload completo con direcciones y paquetes. Para uso interno, se recomienda usar /logistics/shipping-labels que construye el payload automáticamente.',
  })
  @ApiResponse({
    status: 201,
    description: 'Envío creado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o rate_id no encontrado',
  })
  @ApiResponse({
    status: 503,
    description: 'Skydropx no está disponible o no está habilitado',
  })
  async createShipment(@Body() createShipmentDto: CreateShipmentDto) {
    // Este endpoint está deprecado en favor de /logistics/shipping-labels
    // que construye el payload completo automáticamente desde la orden
    // Se mantiene por compatibilidad pero requiere el payload completo
    throw new BadRequestException(
      'Este endpoint requiere el payload completo de Skydropx. Use /logistics/shipping-labels con orderId para crear el shipment automáticamente.'
    );
  }
}

