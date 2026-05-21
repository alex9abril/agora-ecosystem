import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { dbPool } from '../../config/database.config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
const PDFDocument = require('pdfkit');
import { CreateShippingLabelDto } from './dto/create-shipping-label.dto';
import { SkydropxService, SkydropxTracking, SkydropxTrackingEvent } from './skydropx/skydropx.service';
import {
  mapLabelLifecycleToNormalized,
  parseLabelLifecycle,
  shouldAdvanceLabelStatus,
  type LabelLifecycleStatus,
} from './skydropx/skydropx-logistics-state.mapper';
import { OrdersService } from '../orders/orders.service';

export type LogisticsSyncSource =
  | 'webhook'
  | 'polling'
  | 'manual_sync'
  | 'simulation'
  | 'label_creation';

export interface ShippingLabel {
  id: string;
  order_id: string;
  tracking_number: string;
  carrier_name: string;
  status: string;
  origin_address: string;
  destination_address: string;
  destination_name: string;
  destination_phone: string;
  package_weight?: number;
  package_dimensions?: string;
  declared_value?: number;
  pdf_url?: string;
  pdf_path?: string;
  metadata?: any; // JSONB metadata de Skydropx
  generated_at: Date;
  picked_up_at?: Date;
  in_transit_at?: Date;
  delivered_at?: Date;
  created_at: Date;
  updated_at: Date;
  logistics_status_normalized?: string;
  tracking_status_raw?: string | null;
  master_tracking_number?: string | null;
  tracking_url?: string | null;
  logistics_sync_source?: string | null;
  logistics_last_event_at?: Date | null;
  pickup_snapshot?: unknown;
}

/** Respuesta enriquecida con flags derivados (sin columnas extra en BD). */
export interface ShippingLabelResponse extends ShippingLabel {
  pdf_ready: boolean;
  tracking_is_pending: boolean;
  skydropx_workflow_status?: string | null;
  /** Alias de picked_up_at: paquete en manos de la paquetera / recolectado. */
  carrier_received_at?: Date | null;
}

@Injectable()
export class LogisticsService {
  private readonly logger = new Logger(LogisticsService.name);
  private readonly CARRIER_NAME = 'AGORA_LOGISTICS';
  private readonly PDF_STORAGE_DIR = path.join(process.cwd(), 'storage', 'shipping-labels');
  private statusUpdateIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly skydropxService: SkydropxService,
    private readonly ordersService: OrdersService,
  ) {
    // Crear directorio de almacenamiento si no existe
    if (!fs.existsSync(this.PDF_STORAGE_DIR)) {
      fs.mkdirSync(this.PDF_STORAGE_DIR, { recursive: true });
      this.logger.log(`📁 Directorio de almacenamiento creado: ${this.PDF_STORAGE_DIR}`);
    }
  }

  /**
   * Dividir dirección en líneas que quepan en el ancho disponible
   */
  private splitAddress(address: string, maxWidth: number): string[] {
    const words = address.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach((word) => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      // Aproximación más precisa: tamaño 7, considerar espacios
      // A tamaño 7, aproximadamente 2.5 puntos por carácter
      const estimatedWidth = testLine.length * 2.5;
      
      if (estimatedWidth > maxWidth && currentLine) {
        lines.push(currentLine.trim());
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) {
      lines.push(currentLine.trim());
    }

    return lines.length > 0 ? lines : [address];
  }

  /**
   * Dibujar código de barras simulado
   */
  private drawBarcode(doc: any, text: string, x: number, y: number, width: number, height: number): void {
    const barCount = Math.min(text.length, 30); // Limitar número de barras
    const barSpacing = width / barCount;
    
    for (let i = 0; i < barCount; i++) {
      const charCode = text.charCodeAt(i % text.length);
      const barWidth = (charCode % 3) + 0.5; // Ancho variable basado en el carácter
      const barHeight = height + (charCode % 5); // Altura variable
      const barX = x + i * barSpacing;
      
      doc.rect(barX, y, barWidth, barHeight).fill();
    }
  }

  /**
   * Parsear dimensiones de paquete "LxWxH cm" a { length, width, height } en cm.
   * Por defecto 30x20x15 si el formato no es válido.
   */
  private parsePackageDimensions(dimensions: string | undefined): { length: number; width: number; height: number } {
    const def = { length: 30, width: 20, height: 15 };
    if (!dimensions || typeof dimensions !== 'string') return def;
    const match = dimensions.trim().match(/^(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)/);
    if (!match) return def;
    const length = Math.max(1, Math.round(parseFloat(match[1])));
    const width = Math.max(1, Math.round(parseFloat(match[2])));
    const height = Math.max(1, Math.round(parseFloat(match[3])));
    return { length, width, height };
  }

  /**
   * Generar número de guía único
   */
  private generateTrackingNumber(): string {
    // Formato: AGO-YYYYMMDD-HHMMSS-XXXX
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    return `AGO-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;
  }

  /**
   * Generar PDF de guía de envío (estilo profesional tipo DHL/Mercado Libre)
   */
  private async generateShippingLabelPDF(
    trackingNumber: string,
    orderData: any,
    shippingLabelData: any
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const fileName = `shipping-label-${trackingNumber}.pdf`;
        const filePath = path.join(this.PDF_STORAGE_DIR, fileName);

        // Tamaño estándar de etiqueta de envío: 4x6 pulgadas (101.6 x 152.4 mm)
        // En puntos: 1 pulgada = 72 puntos, entonces 4x6 = 288 x 432 puntos
        const doc = new PDFDocument({
          size: [288, 432], // 4x6 pulgadas en puntos (ancho x alto)
          margins: { top: 10, bottom: 10, left: 10, right: 10 },
        });

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Constantes de diseño
        const pageWidth = 288;
        const pageHeight = 432;
        const marginLeft = 10;
        const marginRight = 10;
        const marginTop = 10;
        const contentWidth = pageWidth - marginLeft - marginRight;
        let currentY = marginTop;

        // ============================================
        // HEADER - Marca AGORA
        // ============================================
        doc.fontSize(12).font('Helvetica-Bold').fillColor('black');
        doc.text('AGORA', marginLeft, currentY, { width: contentWidth / 2 });
        doc.fontSize(8).font('Helvetica');
        doc.text('XML PI v4.5', pageWidth - marginRight - 50, currentY);
        currentY += 12;

        doc.fontSize(10).font('Helvetica-Bold');
        doc.text(this.CARRIER_NAME, marginLeft, currentY);
        doc.fontSize(7).font('Helvetica');
        doc.text('Origin: MEX', pageWidth - marginRight - 60, currentY);
        currentY += 10;

        // Línea separadora
        doc.moveTo(marginLeft, currentY).lineTo(pageWidth - marginRight, currentY).stroke();
        currentY += 5;

        // ============================================
        // FROM (REMITENTE)
        // ============================================
        doc.fontSize(9).font('Helvetica-Bold').fillColor('black');
        doc.text('From:', marginLeft, currentY);
        currentY += 11;

        doc.fontSize(8).font('Helvetica-Bold');
        if (orderData.business_name) {
          const nameHeight = doc.heightOfString(orderData.business_name, { width: contentWidth * 0.65 });
          doc.text(orderData.business_name, marginLeft, currentY, { width: contentWidth * 0.65 });
          currentY += nameHeight + 2;
        } else {
          currentY += 2;
        }

        doc.fontSize(7).font('Helvetica');
        if (orderData.business_address) {
          const addressLines = this.splitAddress(orderData.business_address, contentWidth * 0.65);
          addressLines.forEach((line: string) => {
            const lineHeight = doc.heightOfString(line, { width: contentWidth * 0.65 });
            doc.text(line, marginLeft, currentY, { width: contentWidth * 0.65 });
            currentY += lineHeight + 1;
          });
        }
        currentY += 5;

        // Línea separadora
        doc.moveTo(marginLeft, currentY).lineTo(pageWidth - marginRight, currentY).stroke();
        currentY += 5;

        // ============================================
        // TO (DESTINATARIO) con código de barras pequeño
        // ============================================
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('To:', marginLeft, currentY);
        currentY += 10;

        // Código de barras pequeño para destinatario (lado derecho)
        const smallBarcodeX = pageWidth - marginRight - 40;
        const smallBarcodeY = currentY;
        const smallBarcodeHeight = 8;
        this.drawBarcode(doc, trackingNumber.substring(0, 11), smallBarcodeX, smallBarcodeY, 35, smallBarcodeHeight);
        doc.fontSize(6).font('Courier');
        doc.text(trackingNumber.substring(0, 11), smallBarcodeX, smallBarcodeY + smallBarcodeHeight + 3, { width: 40, align: 'center' });
        const smallBarcodeTotalHeight = smallBarcodeY + smallBarcodeHeight + 15;

        // Información del destinatario (lado izquierdo)
        const destStartY = currentY;
        doc.fontSize(8).font('Helvetica-Bold');
        if (shippingLabelData.destination_name) {
          const destNameHeight = doc.heightOfString(shippingLabelData.destination_name, { width: contentWidth * 0.5 });
          doc.text(shippingLabelData.destination_name, marginLeft, currentY, { width: contentWidth * 0.5 });
          currentY += destNameHeight + 2;
        } else {
          currentY += 2;
        }

        doc.fontSize(7).font('Helvetica');
        if (shippingLabelData.destination_address) {
          const destAddressLines = this.splitAddress(shippingLabelData.destination_address, contentWidth * 0.5);
          destAddressLines.forEach((line: string) => {
            const lineHeight = doc.heightOfString(line, { width: contentWidth * 0.5 });
            doc.text(line, marginLeft, currentY, { width: contentWidth * 0.5 });
            currentY += lineHeight + 1;
          });
        }
        if (shippingLabelData.destination_phone) {
          const phoneHeight = doc.heightOfString(`Ph: ${shippingLabelData.destination_phone}`, { width: contentWidth * 0.5 });
          doc.text(`Ph: ${shippingLabelData.destination_phone}`, marginLeft, currentY);
          currentY += phoneHeight + 2;
        }
        // Asegurar que tenemos suficiente espacio para el código de barras
        currentY = Math.max(currentY, smallBarcodeTotalHeight);
        currentY += 6;

        // Línea separadora
        doc.moveTo(marginLeft, currentY).lineTo(pageWidth - marginRight, currentY).stroke();
        currentY += 5;

        // ============================================
        // SERVICE TYPE
        // ============================================
        doc.fontSize(11).font('Helvetica-Bold');
        doc.text('MX - MEX - EMX', marginLeft, currentY);
        currentY += 12;

        // ============================================
        // PACKAGE DETAILS
        // ============================================
        doc.fontSize(7).font('Helvetica');
        doc.text(`Ref: ${trackingNumber}`, marginLeft, currentY);
        currentY += 7;

        if (shippingLabelData.package_weight) {
          doc.text(`Piece Weight: ${shippingLabelData.package_weight} kg`, marginLeft, currentY);
          currentY += 7;
        }

        const genDate = new Date();
        doc.text(`Date: ${genDate.toISOString().split('T')[0]}`, marginLeft, currentY);
        currentY += 7;

        doc.text('Pieces: 1/1', marginLeft, currentY);
        currentY += 10;

        // ============================================
        // TÉRMINOS Y CONDICIONES (texto pequeño)
        // ============================================
        doc.fontSize(5).font('Helvetica');
        const termsText = 'Este documento es generado automáticamente por AGORA LOGISTICS. Para más información visite nuestro sistema. Los términos y condiciones de envío se aplican según nuestro acuerdo de servicio.';
        const termsHeight = doc.heightOfString(termsText, { width: contentWidth, align: 'justify' });
        doc.text(termsText, marginLeft, currentY, { width: contentWidth, align: 'justify' });
        currentY += termsHeight + 5;

        // ============================================
        // CÓDIGO DE BARRAS PRINCIPAL (WAYBILL)
        // ============================================
        const mainBarcodeX = marginLeft + 20;
        const mainBarcodeY = currentY;
        const mainBarcodeWidth = contentWidth - 40;
        const mainBarcodeHeight = 50;

        this.drawBarcode(doc, trackingNumber, mainBarcodeX, mainBarcodeY, mainBarcodeWidth, mainBarcodeHeight);
        
        const waybillTextY = mainBarcodeY + mainBarcodeHeight + 5;
        doc.fontSize(8).font('Helvetica-Bold');
        doc.text('WAYBILL', mainBarcodeX, waybillTextY, { width: mainBarcodeWidth, align: 'center' });
        const trackingTextY = waybillTextY + 8;
        doc.fontSize(7).font('Courier-Bold');
        doc.text(trackingNumber, mainBarcodeX, trackingTextY, { width: mainBarcodeWidth, align: 'center' });
        currentY = trackingTextY + 10;

        // ============================================
        // CÓDIGOS DE BARRAS ADICIONALES
        // ============================================
        // Segundo código de barras
        const secondBarcodeX = marginLeft + 10;
        const secondBarcodeY = currentY;
        const secondBarcodeWidth = contentWidth / 2 - 20;
        const secondBarcodeHeight = 30;

        const secondBarcodeText = `(2L) ${trackingNumber.substring(0, 8)}+${trackingNumber.substring(8, 16)}`;
        this.drawBarcode(doc, trackingNumber.substring(0, 16), secondBarcodeX, secondBarcodeY, secondBarcodeWidth, secondBarcodeHeight);
        const secondTextY = secondBarcodeY + secondBarcodeHeight + 3;
        doc.fontSize(6).font('Courier');
        doc.text(secondBarcodeText, secondBarcodeX, secondTextY, { width: secondBarcodeWidth, align: 'center' });

        // Tercer código de barras
        const thirdBarcodeX = pageWidth / 2 + 10;
        const thirdBarcodeY = currentY;
        const thirdBarcodeWidth = contentWidth / 2 - 20;
        const thirdBarcodeHeight = 30;

        const thirdBarcodeText = `(J) JD${trackingNumber.substring(0, 2)} ${trackingNumber.substring(2, 6)} ${trackingNumber.substring(6, 10)} ${trackingNumber.substring(10, 14)} ${trackingNumber.substring(14, 18)}`;
        this.drawBarcode(doc, trackingNumber.substring(0, 18), thirdBarcodeX, thirdBarcodeY, thirdBarcodeWidth, thirdBarcodeHeight);
        const thirdTextY = thirdBarcodeY + thirdBarcodeHeight + 3;
        doc.fontSize(6).font('Courier');
        doc.text(thirdBarcodeText, thirdBarcodeX, thirdTextY, { width: thirdBarcodeWidth, align: 'center' });
        
        // Asegurar que el texto vertical no se superponga
        const bottomBarcodesBottom = Math.max(secondTextY + 8, thirdTextY + 8);

        // ============================================
        // TEXTO VERTICAL EN EL LADO IZQUIERDO
        // ============================================
        // Asegurar que el texto vertical no se superponga con el contenido
        doc.save();
        doc.translate(3, pageHeight / 2);
        doc.rotate(-90);
        doc.fontSize(6).font('Helvetica');
        doc.text('Copia del Destinatario Pieza 1 de 1', 0, 0);
        doc.restore();

        doc.end();

        stream.on('finish', () => {
          this.logger.log(`✅ PDF generado: ${filePath}`);
          resolve(filePath);
        });

        stream.on('error', (error) => {
          this.logger.error(`❌ Error generando PDF: ${error.message}`);
          reject(error);
        });
      } catch (error: any) {
        this.logger.error(`❌ Error en generateShippingLabelPDF: ${error.message}`);
        reject(error);
      }
    });
  }

  /**
   * Crear guía de envío para una orden
   */
  async createShippingLabel(createDto: CreateShippingLabelDto): Promise<ShippingLabelResponse> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const client = await dbPool.connect();

    try {
      await client.query('BEGIN');

      // 1. Obtener información completa de la orden
      const orderResult = await client.query(
        `SELECT 
          o.id,
          o.status,
          o.delivery_address_id,
          o.delivery_address_text,
          o.total_amount,
          o.subtotal,
          o.client_id,
          o.business_id,
          b.name as business_name,
          b.email as business_email,
          b.phone as business_phone,
          -- Dirección del negocio (origen)
          ba.street as business_street,
          ba.street_number as business_street_number,
          ba.interior_number as business_interior_number,
          ba.neighborhood as business_neighborhood,
          ba.city as business_city,
          ba.state as business_state,
          ba.postal_code as business_postal_code,
          ba.country as business_country,
          COALESCE(
            CONCAT_WS(', ',
              NULLIF(TRIM(CONCAT_WS(' ', ba.street, ba.street_number)), ''),
              NULLIF(ba.neighborhood, ''),
              NULLIF(ba.city, ''),
              NULLIF(ba.state, ''),
              NULLIF(ba.postal_code, '')
            ),
            'Dirección del negocio'
          ) as business_address,
          -- Dirección del cliente (destino)
          da.street as delivery_street,
          da.street_number as delivery_street_number,
          da.interior_number as delivery_interior_number,
          da.neighborhood as delivery_neighborhood,
          da.city as delivery_city,
          da.state as delivery_state,
          da.postal_code as delivery_postal_code,
          da.country as delivery_country,
          da.additional_references as delivery_references,
          up.first_name || ' ' || COALESCE(up.last_name, '') as client_name,
          up.phone as client_phone,
          au.email as client_email
        FROM orders.orders o
        INNER JOIN core.businesses b ON o.business_id = b.id
        LEFT JOIN core.addresses ba ON b.address_id = ba.id
        LEFT JOIN core.addresses da ON o.delivery_address_id = da.id
        INNER JOIN core.user_profiles up ON o.client_id = up.id
        LEFT JOIN auth.users au ON up.id = au.id
        WHERE o.id = $1`,
        [createDto.orderId]
      );

      if (orderResult.rows.length === 0) {
        throw new NotFoundException(`Orden ${createDto.orderId} no encontrada`);
      }

      const order = orderResult.rows[0];

      // Validar que la orden esté en estado 'completed' (listo para recoger)
      if (order.status !== 'completed') {
        throw new BadRequestException(
          `La orden debe estar en estado 'completed' para generar la guía. Estado actual: ${order.status}`
        );
      }

      // Verificar si ya existe una guía para esta orden
      const existingLabelResult = await client.query(
        `SELECT * FROM orders.shipping_labels WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [createDto.orderId]
      );

      if (existingLabelResult.rows.length > 0) {
        // Si ya existe una guía, devolverla en lugar de lanzar un error
        await client.query('COMMIT');
        this.logger.log(`ℹ️ Guía de envío ya existe para orden ${createDto.orderId}, devolviendo la existente`);
        return existingLabelResult.rows[0];
      }

      // 2. Buscar rate_id, quotation_id y información de envío en los order_items
      const itemsResult = await client.query(
        `SELECT 
          oi.id,
          oi.product_id,
          oi.item_name,
          oi.item_price,
          oi.quantity,
          oi.item_subtotal,
          oi.quotation_id,
          oi.rate_id,
          oi.shipping_carrier,
          oi.shipping_service,
          p.sku,
          p.description
        FROM orders.order_items oi
        LEFT JOIN catalog.products p ON oi.product_id = p.id
        WHERE oi.order_id = $1
        ORDER BY oi.created_at ASC`,
        [createDto.orderId]
      );

      if (itemsResult.rows.length === 0) {
        throw new NotFoundException(`La orden ${createDto.orderId} no tiene items`);
      }

      const hasRateId = itemsResult.rows.some(row => row.rate_id);
      let rateId = hasRateId ? itemsResult.rows.find(row => row.rate_id)?.rate_id : null;
      const quotationId = itemsResult.rows[0]?.quotation_id || null;
      const shippingCarrier = itemsResult.rows[0]?.shipping_carrier || null;
      const shippingService = itemsResult.rows[0]?.shipping_service || null;

      this.logger.log(`📋 Información de envío encontrada:`, {
        orderId: createDto.orderId,
        hasRateId,
        rateId,
        quotationId,
        shippingCarrier,
        shippingService,
      });

      let trackingNumber: string;
      let carrierName: string;
      let labelUrl: string | null = null;
      let pdfPath: string | null = null;
      let shipmentMetadata: any = null;

      // Direcciones para Skydropx (cotización y/o envío)
      const addressFrom: any = {
        country_code: order.business_country === 'México' ? 'MX' : (order.business_country || 'MX'),
        postal_code: order.business_postal_code || '',
        area_level1: order.business_state || '',
        area_level2: order.business_city || '',
        area_level3: order.business_neighborhood || '',
        street1: `${order.business_street || ''} ${order.business_street_number || ''}`.trim() || '',
        internal_number: order.business_interior_number || '',
        reference: order.business_neighborhood || order.business_city || 'Sin referencia',
        name: order.business_name || '',
        company: order.business_name || '',
        phone: order.business_phone || '5550000000',
        email: order.business_email || '',
      };
      const addressTo: any = {
        country_code: order.delivery_country === 'México' ? 'MX' : (order.delivery_country || 'MX'),
        postal_code: order.delivery_postal_code || '',
        area_level1: order.delivery_state || '',
        area_level2: order.delivery_city || '',
        area_level3: order.delivery_neighborhood || '',
        street1: `${order.delivery_street || ''} ${order.delivery_street_number || ''}`.trim() || '',
        internal_number: order.delivery_interior_number || '',
        reference: (order.delivery_references || order.delivery_neighborhood || order.delivery_city || 'Sin referencia').substring(0, 30),
        name: order.client_name || '',
        company: '',
        phone: order.client_phone || '5550000000',
        email: order.client_email || '',
      };

      // Si no hay rate_id en items, intentar obtener cotización en Skydropx y usar el primer rate
      if (!rateId) {
        try {
          const dims = this.parsePackageDimensions(createDto.packageDimensions);
          const weightKg = createDto.packageWeight ?? 1.0;
          const parcels = [{ length: dims.length, width: dims.width, height: dims.height, weight: weightKg }];
          const { quotations } = await this.skydropxService.getQuotations({
            quotation: {
              address_from: addressFrom,
              address_to: addressTo,
              parcels,
              requested_carriers: [],
            },
          });
          if (quotations?.length > 0) {
            const first = quotations[0];
            rateId = first.id;
            if (!shippingCarrier && first.carrier) carrierName = first.carrier;
            this.logger.log(`📦 Rate obtenido por cotización (orden sin rate en items): ${rateId} (${first.carrier})`);
          }
        } catch (quotationError: any) {
          this.logger.warn(`⚠️ No se pudo obtener cotización Skydropx (se usará método simulado si no hay rate): ${quotationError.message}`);
        }
      }

      // 3. Si hay rate_id, usar Skydropx para crear el envío
      if (rateId) {
        try {
          this.logger.log(`🚚 Creando envío en Skydropx con rate_id: ${rateId}`);

          // Construir productos para el paquete
          const products = itemsResult.rows.map((item: any) => {
            // Formatear HS code a 10 dígitos (padding con ceros)
            // Nota: hs_code no existe en catalog.products, usar fallback
            // Código HS para partes y accesorios de vehículos automotores: 8708.99.99
            const rawHsCode = '8708999999'; // Código HS para partes y accesorios automotrices
            const hsCode = String(rawHsCode).padStart(10, '0').slice(0, 10);
            
            // Construir descripción mejorada en inglés para Skydropx
            const productName = item.item_name || 'Producto';
            const productDescription = item.description || productName;
            
            // Descripción en inglés más específica para refacciones/accesorios automotrices
            let descriptionEn = productDescription;
            if (!descriptionEn || descriptionEn === productName) {
              // Si no hay descripción o es igual al nombre, crear una descripción genérica apropiada
              descriptionEn = `Automotive parts and accessories - ${productName}`;
            } else {
              // Si hay descripción, asegurarse de que mencione que es automotriz
              if (!descriptionEn.toLowerCase().includes('automotive') && 
                  !descriptionEn.toLowerCase().includes('auto') && 
                  !descriptionEn.toLowerCase().includes('vehicle') &&
                  !descriptionEn.toLowerCase().includes('car')) {
                descriptionEn = `Automotive parts and accessories: ${descriptionEn}`;
              }
            }
            
            return {
              name: productName,
              description_en: descriptionEn,
              quantity: parseInt(item.quantity) || 1,
              price: parseFloat(item.item_price) || 0,
              sku: item.sku || `PROD-${item.product_id?.slice(0, 8) || 'UNKNOWN'}`,
              hs_code: hsCode,
              hs_code_description: `Automotive parts and accessories - ${productName}`,
              product_type_code: 'P',
              product_type_name: 'Automotive Parts and Accessories',
              country_code: 'MX',
            };
          });

          // Calcular valor declarado (suma de precios × cantidad)
          const declaredValue = itemsResult.rows.reduce((sum: number, item: any) => {
            return sum + (parseFloat(item.item_price || 0) * parseInt(item.quantity || 1));
          }, 0);

          // Construir descripción del contenido del paquete basada en los productos
          const packageContent = products.length === 1 
            ? products[0].name 
            : products.length > 0
            ? `Refacciones y accesorios automotrices (${products.length} ${products.length === 1 ? 'artículo' : 'artículos'})`
            : 'Refacciones y accesorios automotrices';

          // Construir paquete único
          const packages = [{
            package_number: '1',
            package_protected: false,
            declared_value: declaredValue,
            consignment_note: '53102400', // Código aduanal válido de Skydropx (no es código HS)
            package_type: '4G', // Tipo de paquete por defecto
            products: products,
            content: packageContent, // Descripción del contenido del paquete
            content_description: 'Refacciones y accesorios automotrices', // Descripción alternativa
          }];

          // Crear shipment en Skydropx
          const skydropxShipment = await this.skydropxService.createShipment({
            rate_id: rateId,
            printing_format: 'thermal',
            address_from: addressFrom,
            address_to: addressTo,
            packages: packages,
          });

          // Priorizar el tracking_number de Skydropx, solo usar el generado si no está disponible
          // NUNCA usar tracking_number local si hay metadata de Skydropx disponible
          if (skydropxShipment.tracking_number && !skydropxShipment.tracking_number.startsWith('AGO-')) {
            trackingNumber = skydropxShipment.tracking_number;
            this.logger.log(`✅ Tracking number de Skydropx (directo): ${trackingNumber}`);
          } else if (skydropxShipment.metadata) {
            // Si no hay tracking_number directo, SIEMPRE intentar extraerlo del metadata
            try {
              const metadata = skydropxShipment.metadata;
              const fullResponse = metadata.full_response || metadata;
              const data = fullResponse?.data || fullResponse;
              const attributes = data?.attributes || data;
              const included = fullResponse?.included || [];
              
              // Buscar tracking_number en las ubicaciones correctas según la estructura de Skydropx
              // Orden de prioridad:
              // 1. master_tracking_number en attributes (ubicación principal)
              // 2. tracking_number en included[0].attributes (muy común en Skydropx)
              // 3. tracking_number en attributes (fallback)
              const extractedTracking = 
                attributes?.master_tracking_number ||
                (included.length > 0 && included[0]?.attributes?.tracking_number) ||
                attributes?.tracking_number || 
                data?.tracking_number || 
                metadata?.tracking_number;
              
              if (extractedTracking && !extractedTracking.startsWith('AGO-') && extractedTracking.length >= 10) {
                trackingNumber = extractedTracking;
                this.logger.log(`✅ Tracking number extraído del metadata: ${trackingNumber}`);
              } else {
                // Si no se encontró tracking_number válido, esperar y hacer múltiples consultas
                this.logger.warn(`⚠️ No se encontró tracking_number válido en metadata inmediatamente, esperando y consultando nuevamente...`);
                
                // Hacer hasta 3 intentos con delays crecientes
                let foundTracking = false;
                for (let attempt = 1; attempt <= 3 && !foundTracking; attempt++) {
                  const delay = attempt * 2000; // 2s, 4s, 6s
                  this.logger.log(`🔄 Intento ${attempt}/3: Esperando ${delay}ms antes de consultar...`);
                  await new Promise(resolve => setTimeout(resolve, delay));
                  
                  try {
                    const updatedShipment = await this.skydropxService.getShipmentTracking(skydropxShipment.id);
                    if (updatedShipment.tracking_number && !updatedShipment.tracking_number.startsWith('AGO-') && updatedShipment.tracking_number.length >= 10) {
                      trackingNumber = updatedShipment.tracking_number;
                      this.logger.log(`✅ Tracking number obtenido en intento ${attempt}: ${trackingNumber}`);
                      foundTracking = true;
                    } else if (updatedShipment.metadata) {
                      // Intentar extraer del metadata de la respuesta actualizada
                      const updatedMetadata = updatedShipment.metadata;
                      const updatedFullResponse = updatedMetadata.full_response || updatedMetadata;
                      const updatedData = updatedFullResponse?.data || updatedFullResponse;
                      const updatedAttributes = updatedData?.attributes || updatedData;
                      const updatedIncluded = updatedFullResponse?.included || [];
                      
                      const updatedExtracted = 
                        updatedAttributes?.master_tracking_number ||
                        (updatedIncluded.length > 0 && updatedIncluded[0]?.attributes?.tracking_number) ||
                        updatedAttributes?.tracking_number;
                      
                      if (updatedExtracted && !updatedExtracted.startsWith('AGO-') && updatedExtracted.length >= 10) {
                        trackingNumber = updatedExtracted;
                        this.logger.log(`✅ Tracking number extraído del metadata actualizado en intento ${attempt}: ${trackingNumber}`);
                        foundTracking = true;
                      }
                    }
                  } catch (retryError: any) {
                    this.logger.warn(`⚠️ Error en intento ${attempt}: ${retryError.message}`);
                  }
                }
                
                // Solo generar tracking local si NO se encontró después de todos los intentos
                if (!foundTracking) {
                  // Generar un tracking temporal que será reemplazado
                  // Usar un formato especial que indique que es temporal: "PENDING-{shipment_id}"
                  trackingNumber = `PENDING-${skydropxShipment.id.substring(0, 8)}`;
                  this.logger.warn(`⚠️ No se obtuvo tracking_number después de 3 intentos. Usando temporal: ${trackingNumber}`);
                  this.logger.warn(`⚠️ El tracking_number se actualizará automáticamente cuando Skydropx lo proporcione.`);
                }
              }
            } catch (metaError: any) {
              // Si hay metadata pero hay error, usar formato temporal
              trackingNumber = `PENDING-${skydropxShipment.id.substring(0, 8)}`;
              this.logger.warn(`⚠️ Error extrayendo tracking_number del metadata: ${metaError.message}`);
              this.logger.warn(`⚠️ Usando tracking temporal: ${trackingNumber}. Se actualizará automáticamente cuando Skydropx lo proporcione.`);
            }
          } else {
            // Si no hay metadata, solo entonces generar tracking local como último recurso
            trackingNumber = this.generateTrackingNumber();
            this.logger.warn(`⚠️ No se obtuvo tracking_number de Skydropx y no hay metadata, usando generado local temporal: ${trackingNumber}`);
            this.logger.warn(`⚠️ NOTA: El tracking_number se actualizará automáticamente cuando Skydropx lo proporcione`);
          }
          
          // Si trackingNumber es temporal (PENDING-), intentar una última vez después de un delay
          if (trackingNumber && trackingNumber.startsWith('PENDING-') && skydropxShipment.metadata) {
            this.logger.log(`🔄 tracking_number es temporal, esperando 5 segundos y consultando shipment nuevamente...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            try {
              const finalShipment = await this.skydropxService.getShipmentTracking(skydropxShipment.id);
              if (finalShipment.tracking_number && !finalShipment.tracking_number.startsWith('AGO-') && !finalShipment.tracking_number.startsWith('PENDING-') && finalShipment.tracking_number.length >= 10) {
                trackingNumber = finalShipment.tracking_number;
                this.logger.log(`✅ Tracking number obtenido en consulta final: ${trackingNumber}`);
              } else if (finalShipment.metadata) {
                // Intentar extraer del metadata una vez más
                const finalMetadata = finalShipment.metadata;
                const finalFullResponse = finalMetadata.full_response || finalMetadata;
                const finalData = finalFullResponse?.data || finalFullResponse;
                const finalAttributes = finalData?.attributes || finalData;
                const finalIncluded = finalFullResponse?.included || [];
                
                const finalExtracted = 
                  finalAttributes?.master_tracking_number ||
                  (finalIncluded.length > 0 && finalIncluded[0]?.attributes?.tracking_number) ||
                  finalAttributes?.tracking_number;
                
                if (finalExtracted && !finalExtracted.startsWith('AGO-') && !finalExtracted.startsWith('PENDING-') && finalExtracted.length >= 10) {
                  trackingNumber = finalExtracted;
                  this.logger.log(`✅ Tracking number extraído del metadata en consulta final: ${trackingNumber}`);
                }
              }
            } catch (finalError: any) {
              this.logger.warn(`⚠️ Error en consulta final: ${finalError.message}`);
            }
          }
          
          carrierName = shippingCarrier || skydropxShipment.carrier || 'SKYDROPX';
          
          // PRIORIDAD 1: Intentar obtener label_url directamente de skydropxShipment
          labelUrl = skydropxShipment.label_url || null;
          
          // PRIORIDAD 2: Si no está disponible directamente, extraer del metadata
          // El label_url está en metadata.full_response.included[0].attributes.label_url
          if (!labelUrl && skydropxShipment.metadata) {
            try {
              const metadata = skydropxShipment.metadata;
              const fullResponse = metadata.full_response || metadata;
              const included = fullResponse?.included || [];
              
              this.logger.log(`🔍 Buscando label_url en metadata, included.length: ${included.length}`);
              
              // Buscar label_url en included[0].attributes.label_url (ubicación principal según estructura de Skydropx)
              if (included.length > 0 && included[0]?.attributes?.label_url) {
                labelUrl = included[0].attributes.label_url;
                this.logger.log(`✅ Label URL extraído del metadata: ${labelUrl}`);
              } else {
                this.logger.warn(`⚠️ No se encontró label_url en included[0].attributes.label_url`);
                if (included.length > 0) {
                  this.logger.log(`🔍 included[0].attributes keys: ${Object.keys(included[0]?.attributes || {}).join(', ')}`);
                }
              }
            } catch (urlError: any) {
              this.logger.error(`❌ Error extrayendo label_url del metadata: ${urlError.message}`);
            }
          }

          this.logger.log(`✅ Envío creado en Skydropx: ${trackingNumber} (carrier: ${carrierName})`);
          this.logger.log(`📄 Label URL FINAL: ${labelUrl || 'NO DISPONIBLE'}`);

          // Si hay label_url, descargar el PDF de Skydropx y guardarlo localmente
          // IMPORTANTE: Siempre usar el PDF de Skydropx, no generar uno local
          if (labelUrl) {
            try {
              const axios = require('axios');
              this.logger.log(`📄 Descargando PDF desde Skydropx: ${labelUrl}`);
              const pdfResponse = await axios.get(labelUrl, { 
                responseType: 'arraybuffer',
                timeout: 30000,
              });
              const fileName = `shipping-label-${trackingNumber}.pdf`;
              pdfPath = path.join(this.PDF_STORAGE_DIR, fileName);
              fs.writeFileSync(pdfPath, pdfResponse.data);
              this.logger.log(`✅ PDF de Skydropx descargado y guardado: ${pdfPath}`);
            } catch (pdfError: any) {
              this.logger.error(`❌ No se pudo descargar el PDF de Skydropx: ${pdfError.message}`);
              // NO generar PDF local si falla Skydropx - dejar pdfPath como null
              // El método getShippingLabelPDF intentará descargarlo nuevamente cuando se solicite
            }
          }

          // Guardar metadata en shipping_labels
          shipmentMetadata = {
            skydropx_shipment_id: skydropxShipment.id,
            workflow_status: skydropxShipment.workflow_status,
            carrier: skydropxShipment.carrier,
            service: skydropxShipment.service,
            full_response: skydropxShipment.metadata,
          };
          
          // El labelUrl ya debería estar extraído arriba, pero verificamos una vez más
          if (!labelUrl) {
            this.logger.error(`❌ CRÍTICO: labelUrl es null después de intentar extraerlo. Esto no debería pasar si hay metadata.`);
          }
          
          // Si no tenemos tracking_number pero hay metadata, intentar extraerlo
          if (!trackingNumber || trackingNumber.startsWith('AGO-')) {
            if (skydropxShipment.metadata) {
              try {
                const metadata = skydropxShipment.metadata;
                const fullResponse = metadata.full_response || metadata;
                const data = fullResponse?.data || fullResponse;
                const attributes = data?.attributes || data;
                const included = fullResponse?.included || [];
                
                // Buscar tracking_number en las ubicaciones correctas según la estructura de Skydropx
                // 1. master_tracking_number en attributes (ubicación principal)
                // 2. tracking_number en included[0].attributes (fallback)
                const extractedTracking = 
                  attributes?.master_tracking_number ||
                  (included.length > 0 && included[0]?.attributes?.tracking_number) ||
                  attributes?.tracking_number || 
                  data?.tracking_number || 
                  metadata?.tracking_number;
                
                if (extractedTracking && !extractedTracking.startsWith('AGO-') && extractedTracking.length >= 10) {
                  trackingNumber = extractedTracking;
                  this.logger.log(`✅ Tracking number extraído del metadata: ${trackingNumber}`);
                } else {
                  this.logger.debug(`🔍 Tracking number encontrado en metadata pero no válido: ${extractedTracking}`);
                }
              } catch (metaError: any) {
                this.logger.warn(`⚠️ No se pudo extraer tracking_number del metadata: ${metaError.message}`);
              }
            }
          }
          
        } catch (skydropxError: any) {
          this.logger.error(`❌ Error creando envío en Skydropx: ${skydropxError.message}`);
          // Si falla Skydropx, usar método simulado como fallback
          this.logger.log(`🔄 Usando método simulado como fallback`);
          trackingNumber = this.generateTrackingNumber();
          carrierName = shippingCarrier || this.CARRIER_NAME;
        }
      } else {
        // 4. Si no hay quotation_id, usar método simulado
        this.logger.log(`📦 Usando método simulado (sin quotation_id)`);
        trackingNumber = this.generateTrackingNumber();
        carrierName = this.CARRIER_NAME;
      }

      // 5. Preparar datos de la guía (usar el trackingNumber que se obtuvo de Skydropx o el generado)
      const shippingLabelData = {
        order_id: createDto.orderId,
        tracking_number: trackingNumber, // Este ya tiene el valor correcto (Skydropx o generado)
        carrier_name: carrierName,
        status: 'generated',
        origin_address: order.business_address || 'Dirección del negocio',
        destination_address: order.delivery_address_text || 'Dirección de entrega',
        destination_name: order.client_name || 'Cliente',
        destination_phone: order.client_phone || '',
        package_weight: createDto.packageWeight || 1.0,
        package_dimensions: createDto.packageDimensions || '30x20x15 cm',
        declared_value: createDto.declaredValue || parseFloat(order.total_amount),
        pdf_url: labelUrl, // Guardar label_url de Skydropx como pdf_url (debe estar en metadata.full_response.included[0].attributes.label_url)
      };

      this.logger.log(`📋 Guardando shipping label con tracking_number: ${shippingLabelData.tracking_number}`);
      this.logger.log(`📄 PDF URL que se guardará: ${shippingLabelData.pdf_url || 'NO DISPONIBLE'}`);

      // 6. Si no hay PDF de Skydropx, NO generar uno local automáticamente
      // Solo generar PDF local como último recurso si Skydropx no está disponible
      // Esto asegura que siempre se use el PDF real de Skydropx cuando esté disponible
      if (!pdfPath && !labelUrl) {
        this.logger.warn(`⚠️ No hay PDF de Skydropx disponible, generando PDF local como fallback`);
        pdfPath = await this.generateShippingLabelPDF(
          trackingNumber,
          order,
          shippingLabelData
        );
      } else if (!pdfPath && labelUrl) {
        this.logger.log(`ℹ️ PDF de Skydropx disponible (${labelUrl}), se descargará cuando se solicite. No se generará PDF local.`);
      }

      // 7. Guardar en base de datos
      this.logger.log(`💾 Guardando en BD - pdf_url: ${labelUrl || 'NULL'}, pdf_path: ${pdfPath || 'NULL'}`);
      
      const insertResult = await client.query(
        `INSERT INTO orders.shipping_labels (
          order_id,
          tracking_number,
          carrier_name,
          status,
          origin_address,
          destination_address,
          destination_name,
          destination_phone,
          package_weight,
          package_dimensions,
          declared_value,
          pdf_path,
          pdf_url,
          metadata,
          logistics_status_normalized,
          tracking_status_raw,
          logistics_sync_source,
          logistics_last_event_at,
          generated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, order_id, tracking_number, pdf_url, pdf_path`,
        [
          shippingLabelData.order_id,
          shippingLabelData.tracking_number,
          shippingLabelData.carrier_name,
          shippingLabelData.status,
          shippingLabelData.origin_address,
          shippingLabelData.destination_address,
          shippingLabelData.destination_name,
          shippingLabelData.destination_phone,
          shippingLabelData.package_weight,
          shippingLabelData.package_dimensions,
          shippingLabelData.declared_value,
          pdfPath,
          labelUrl,
          shipmentMetadata ? JSON.stringify(shipmentMetadata) : null,
          'prepared',
          'generated',
          'label_creation',
        ]
      );
      
      const savedLabel = insertResult.rows[0];
      this.logger.log(`✅ Shipping label guardado - ID: ${savedLabel.id}, pdf_url guardado: ${savedLabel.pdf_url || 'NULL'}, pdf_path guardado: ${savedLabel.pdf_path || 'NULL'}`);

      await client.query('COMMIT');

      const shippingLabel = insertResult.rows[0];

      await this.applyLogisticsStatusUpdate({
        shippingLabelId: shippingLabel.id,
        orderId: createDto.orderId,
        incomingLifecycle: 'generated',
        rawStatus: 'generated',
        eventSource: 'label_creation',
        occurredAt: new Date(),
        skipOrderStatusUpdate: true,
        externalKeyPart: `init_${shippingLabel.id}`,
        trackingNumber: shippingLabelData.tracking_number,
        carrierName: shippingLabelData.carrier_name,
      });

      // Si el tracking_number guardado es temporal (AGO- o PENDING-) pero hay metadata de Skydropx,
      // intentar extraer el tracking_number real del metadata y actualizarlo
      if (shippingLabel.tracking_number && 
          (shippingLabel.tracking_number.startsWith('AGO-') || shippingLabel.tracking_number.startsWith('PENDING-')) && 
          shippingLabel.metadata) {
        try {
          const metadata = typeof shippingLabel.metadata === 'string' 
            ? JSON.parse(shippingLabel.metadata) 
            : shippingLabel.metadata;
          
          const fullResponse = metadata.full_response || metadata;
          const data = fullResponse?.data || fullResponse;
          const attributes = data?.attributes || data;
          const included = fullResponse?.included || [];
          
          // Buscar tracking_number en las ubicaciones correctas según la estructura de Skydropx
          // 1. master_tracking_number en attributes (ubicación principal)
          // 2. tracking_number en included[0].attributes (fallback)
          const skydropxTracking = 
            attributes?.master_tracking_number ||
            (included.length > 0 && included[0]?.attributes?.tracking_number) ||
            attributes?.tracking_number || 
            data?.tracking_number;
          
          if (skydropxTracking && skydropxTracking !== shippingLabel.tracking_number) {
            this.logger.log(`🔄 Actualizando tracking_number de ${shippingLabel.tracking_number} a ${skydropxTracking}`);
            
            // Reconectar para hacer el UPDATE
            const updateClient = await dbPool.connect();
            try {
              await updateClient.query('BEGIN');
              const updateResult = await updateClient.query(
                `UPDATE orders.shipping_labels 
                 SET tracking_number = $1, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = $2 
                 RETURNING *`,
                [skydropxTracking, shippingLabel.id]
              );
              await updateClient.query('COMMIT');
              
              if (updateResult.rows.length > 0) {
                shippingLabel.tracking_number = skydropxTracking;
                this.logger.log(`✅ Tracking number actualizado exitosamente: ${skydropxTracking}`);
              }
            } finally {
              updateClient.release();
            }
          }
        } catch (updateError: any) {
          this.logger.warn(`⚠️ No se pudo actualizar tracking_number del metadata: ${updateError.message}`);
        }
      }

      this.logger.log(`✅ Guía de envío creada para orden ${createDto.orderId}`);
      this.logger.log(`📦 Tracking number guardado en BD: ${shippingLabel.tracking_number}`);
      this.logger.log(`📋 Carrier: ${shippingLabel.carrier_name}`);

      // 8. Simulación solo para guías locales: nunca si hubo envío real en Skydropx
      if (!shipmentMetadata?.skydropx_shipment_id && !quotationId) {
        this.startStatusSimulation(shippingLabel.id, createDto.orderId);
      }

      const finalRow = await this.fetchShippingLabelRowByOrderId(createDto.orderId);
      if (!finalRow) {
        throw new ServiceUnavailableException('Guía creada pero no se pudo recuperar el registro');
      }
      return this.enrichShippingLabel(finalRow);
    } catch (error: any) {
      await client.query('ROLLBACK');
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`❌ Error creando guía de envío: ${error.message}`);
      throw new ServiceUnavailableException(`Error creando guía de envío: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Iniciar simulación automática de cambios de estado
   */
  private startStatusSimulation(shippingLabelId: string, orderId: string): void {
    // Limpiar intervalo anterior si existe
    if (this.statusUpdateIntervals.has(shippingLabelId)) {
      clearTimeout(this.statusUpdateIntervals.get(shippingLabelId)!);
    }

    // Configurar tiempos de simulación (en milisegundos)
    const PICKED_UP_DELAY = 2 * 60 * 1000; // 2 minutos
    const IN_TRANSIT_DELAY = 5 * 60 * 1000; // 5 minutos después de picked_up
    const DELIVERED_DELAY = 10 * 60 * 1000; // 10 minutos después de in_transit

    // 1. Cambiar a 'picked_up' después de 2 minutos
    const pickedUpTimeout = setTimeout(async () => {
      await this.updateShippingStatus(shippingLabelId, orderId, 'picked_up');
    }, PICKED_UP_DELAY);

    // 2. Cambiar a 'in_transit' después de 5 minutos más
    const inTransitTimeout = setTimeout(async () => {
      await this.updateShippingStatus(shippingLabelId, orderId, 'in_transit');
    }, PICKED_UP_DELAY + IN_TRANSIT_DELAY);

    // 3. Cambiar a 'delivered' después de 10 minutos más
    const deliveredTimeout = setTimeout(async () => {
      await this.updateShippingStatus(shippingLabelId, orderId, 'delivered');
      // Limpiar el intervalo al finalizar
      this.statusUpdateIntervals.delete(shippingLabelId);
    }, PICKED_UP_DELAY + IN_TRANSIT_DELAY + DELIVERED_DELAY);

    // Guardar referencia al último timeout
    this.statusUpdateIntervals.set(shippingLabelId, deliveredTimeout);

    this.logger.log(
      `🔄 Simulación iniciada para guía ${shippingLabelId}: picked_up (2min) → in_transit (7min) → delivered (17min)`
    );
  }

  private buildLogisticsIdempotencyKey(parts: {
    shippingLabelId: string;
    eventSource: LogisticsSyncSource;
    rawStatus: string | null;
    occurredAtIso: string;
    externalKeyPart?: string | null;
  }): string {
    const base = [
      parts.shippingLabelId,
      parts.eventSource,
      parts.rawStatus ?? '',
      parts.occurredAtIso,
      parts.externalKeyPart ?? '',
    ].join('|');
    return crypto.createHash('sha256').update(base, 'utf8').digest('hex');
  }

  /**
   * Persiste evento logístico (idempotente), avanza estado de guía de forma monótona
   * y alinea pedido + historial cuando aplica.
   */
  private async applyLogisticsStatusUpdate(options: {
    shippingLabelId: string;
    orderId: string;
    incomingLifecycle: LabelLifecycleStatus;
    rawStatus: string | null;
    eventSource: LogisticsSyncSource;
    occurredAt: Date;
    payload?: unknown;
    trackingNumber?: string | null;
    masterTrackingNumber?: string | null;
    trackingUrl?: string | null;
    carrierName?: string | null;
    externalKeyPart?: string | null;
    skipOrderStatusUpdate?: boolean;
    /** Si se envía, reemplaza metadata completo de la guía (JSON ya mergeado en caller). */
    replaceMetadataJson?: string | null;
    /** URL del PDF de etiqueta en Skydropx (no confundir con tracking_url del carrier). */
    labelPdfUrl?: string | null;
  }): Promise<void> {
    if (!dbPool) {
      this.logger.error('❌ No hay conexión a base de datos');
      return;
    }

    const client = await dbPool.connect();
    let orderStatusNotify: { orderId: string; prev: string; next: string } | null = null;
    try {
      await client.query('BEGIN');

      const labelRow = await client.query<{
        status: string;
        logistics_status_normalized: string | null;
      }>(
        `SELECT status, logistics_status_normalized FROM orders.shipping_labels WHERE id = $1`,
        [options.shippingLabelId]
      );
      const curStatus = labelRow.rows[0]?.status ?? 'generated';

      const advance =
        options.incomingLifecycle === 'cancelled' ||
        shouldAdvanceLabelStatus(curStatus, options.incomingLifecycle);

      let nextLabelStatus: LabelLifecycleStatus;
      if (options.incomingLifecycle === 'cancelled') {
        nextLabelStatus = 'cancelled';
      } else if (advance) {
        nextLabelStatus = options.incomingLifecycle;
      } else {
        nextLabelStatus = parseLabelLifecycle(curStatus);
      }

      const nextNorm = mapLabelLifecycleToNormalized(nextLabelStatus);
      const occurredIso = options.occurredAt.toISOString();
      const idempotencyKey = this.buildLogisticsIdempotencyKey({
        shippingLabelId: options.shippingLabelId,
        eventSource: options.eventSource,
        rawStatus: options.rawStatus,
        occurredAtIso: occurredIso,
        externalKeyPart: options.externalKeyPart,
      });

      try {
        await client.query(
          `INSERT INTO orders.shipping_label_logistics_events (
            shipping_label_id, order_id, event_source, raw_status, normalized_status,
            label_status, carrier_name, tracking_number, idempotency_key, occurred_at, payload
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
          ON CONFLICT (idempotency_key) DO NOTHING`,
          [
            options.shippingLabelId,
            options.orderId,
            options.eventSource,
            options.rawStatus,
            nextNorm,
            nextLabelStatus,
            options.carrierName ?? null,
            options.trackingNumber ?? null,
            idempotencyKey,
            occurredIso,
            options.payload != null ? JSON.stringify(options.payload) : null,
          ]
        );
      } catch (evErr: any) {
        this.logger.warn(
          `⚠️ No se pudo insertar shipping_label_logistics_events (¿migración pendiente?): ${evErr?.message || evErr}`
        );
      }

      const setPickupTs =
        advance && options.incomingLifecycle === 'picked_up' ? 'picked_up_at = CURRENT_TIMESTAMP' : null;
      const setTransitTs =
        advance && options.incomingLifecycle === 'in_transit' ? 'in_transit_at = CURRENT_TIMESTAMP' : null;
      const setDeliveredTs =
        advance && options.incomingLifecycle === 'delivered' ? 'delivered_at = CURRENT_TIMESTAMP' : null;
      const extraTsParts = [setPickupTs, setTransitTs, setDeliveredTs].filter(Boolean);
      const extraTsSql = extraTsParts.length ? `, ${extraTsParts.join(', ')}` : '';

      const metaFragment = options.replaceMetadataJson
        ? `, metadata = $12::jsonb`
        : '';

      const baseParams = [
        nextLabelStatus,
        nextNorm,
        options.rawStatus,
        options.trackingNumber ?? null,
        options.masterTrackingNumber ?? null,
        options.trackingUrl ?? null,
        options.labelPdfUrl ?? null,
        options.carrierName ?? null,
        options.eventSource,
        occurredIso,
        options.shippingLabelId,
      ];

      await client.query(
        `UPDATE orders.shipping_labels
         SET
           status = $1,
           logistics_status_normalized = $2,
           tracking_status_raw = COALESCE($3, tracking_status_raw),
           tracking_number = COALESCE($4, tracking_number),
           master_tracking_number = COALESCE($5, master_tracking_number),
           tracking_url = COALESCE($6, tracking_url),
           pdf_url = COALESCE($7, pdf_url),
           carrier_name = COALESCE($8, carrier_name),
           logistics_sync_source = $9,
           logistics_last_event_at = $10::timestamptz
           ${extraTsSql}
           ${metaFragment},
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $11`,
        options.replaceMetadataJson
          ? [...baseParams, options.replaceMetadataJson]
          : baseParams
      );

      if (!options.skipOrderStatusUpdate && nextLabelStatus !== 'cancelled') {
        let orderNew: string | null = null;
        if (nextLabelStatus === 'picked_up' || nextLabelStatus === 'in_transit') {
          orderNew = 'in_transit';
        } else if (nextLabelStatus === 'delivered') {
          orderNew = 'delivered';
        }

        if (orderNew) {
          const ordRes = await client.query(`SELECT status FROM orders.orders WHERE id = $1 FOR UPDATE`, [
            options.orderId,
          ]);
          const previousOrderStatus = ordRes.rows[0]?.status as string;
          let didUpdateOrderStatus = false;

          // No permitir que logÃ­stica "reviva" Ã³rdenes canceladas/reembolsadas.
          if (previousOrderStatus === 'cancelled' || previousOrderStatus === 'refunded') {
            this.logger.warn(
              `âš ï¸ LogÃ­stica: omitiendo update de estado de orden ${options.orderId} (${previousOrderStatus} â†’ ${orderNew})`
            );
          } else {
            // Configurar variables de sesión para trigger de historial (si existe).
            try {
              await client.query(`SELECT set_config('app.current_user_role', $1, true)`, ['admin']);
              await client.query(`SELECT set_config('app.status_change_reason', $1, true)`, [
                'Actualización automática desde servicio de logística',
              ]);
            } catch {
              // ignore
            }

            await client.query(
              `UPDATE orders.orders
               SET status = $1, updated_at = CURRENT_TIMESTAMP
               ${orderNew === 'delivered' ? ', delivered_at = CURRENT_TIMESTAMP' : ''}
               WHERE id = $2`,
              [orderNew, options.orderId]
            );
            didUpdateOrderStatus = true;
          }

          if (didUpdateOrderStatus && previousOrderStatus && previousOrderStatus !== orderNew) {
            orderStatusNotify = {
              orderId: options.orderId,
              prev: previousOrderStatus,
              next: orderNew,
            };
            // Historial: se registra vía trigger (si está instalado).
          }
        }
      }

      await client.query('COMMIT');
      if (orderStatusNotify) {
        this.ordersService.notifyOrderStatusChange(
          orderStatusNotify.orderId,
          orderStatusNotify.prev,
          orderStatusNotify.next,
        );
      }
      this.logger.log(
        `✅ Logística: guía ${options.shippingLabelId} → ${nextLabelStatus} (${nextNorm}) [${options.eventSource}]`
      );
    } catch (error: any) {
      await client.query('ROLLBACK');
      this.logger.error(`❌ Error applyLogisticsStatusUpdate: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Simulación local de estados (sin Skydropx).
   */
  private async updateShippingStatus(
    shippingLabelId: string,
    orderId: string,
    newStatus: string
  ): Promise<void> {
    await this.applyLogisticsStatusUpdate({
      shippingLabelId,
      orderId,
      incomingLifecycle: parseLabelLifecycle(newStatus),
      rawStatus: newStatus,
      eventSource: 'simulation',
      occurredAt: new Date(),
    });
  }

  private normalizeLabelMetadata(metadata: any): any {
    if (metadata == null) return null;
    if (typeof metadata === 'string') {
      try {
        return JSON.parse(metadata);
      } catch {
        return null;
      }
    }
    return metadata;
  }

  /** ID del shipment en Skydropx para consultar /shipments/:id (sin crear envíos nuevos). */
  private extractSkydropxShipmentIdFromLabel(row: ShippingLabel): string | null {
    const metadata = this.normalizeLabelMetadata(row.metadata);
    if (!metadata) return null;
    if (metadata.skydropx_shipment_id) return String(metadata.skydropx_shipment_id);
    if (metadata.full_response?.data?.id) return String(metadata.full_response.data.id);
    if (metadata.full_response?.data?.attributes?.id) {
      return String(metadata.full_response.data.attributes.id);
    }
    return null;
  }

  /**
   * URL de etiqueta PDF en Skydropx (sin descargar), alineada con la lógica de creación y de SkydropxService.
   */
  private extractLabelUrlFromLabelRow(row: ShippingLabel): string | null {
    if (
      row.pdf_url &&
      (row.pdf_url.startsWith('https://pro.skydropx.com') ||
        row.pdf_url.startsWith('https://sandbox.skydropx.com'))
    ) {
      return row.pdf_url;
    }
    const metadata = this.normalizeLabelMetadata(row.metadata);
    if (!metadata) return null;
    const fullResponse = metadata.full_response || metadata;
    const included = fullResponse?.included || [];
    if (included.length > 0 && included[0]?.attributes?.label_url) {
      return included[0].attributes.label_url;
    }
    const data = fullResponse?.data || fullResponse;
    const attributes = data?.attributes || data;
    if (attributes?.label_url) return attributes.label_url;
    return null;
  }

  private extractLabelUrlFromSkydropxApiMetadata(apiMetadata: any): string | null {
    if (!apiMetadata) return null;
    const included = apiMetadata.included || [];
    if (included.length > 0 && included[0]?.attributes?.label_url) {
      return included[0].attributes.label_url;
    }
    const data = apiMetadata.data || apiMetadata;
    const attributes = data?.attributes || data;
    return attributes?.label_url || null;
  }

  private localPdfFileExists(pdfPath?: string | null): boolean {
    if (!pdfPath || typeof pdfPath !== 'string') return false;
    try {
      return fs.existsSync(pdfPath) && fs.statSync(pdfPath).isFile();
    } catch {
      return false;
    }
  }

  private computeShippingLabelFlags(row: ShippingLabel): {
    pdf_ready: boolean;
    tracking_is_pending: boolean;
    skydropx_workflow_status: string | null;
  } {
    const tracking_is_pending =
      !!row.tracking_number && String(row.tracking_number).startsWith('PENDING-');
    const metadata = this.normalizeLabelMetadata(row.metadata);
    const fullResponse = metadata?.full_response || metadata;
    const data = fullResponse?.data || fullResponse;
    const attributes = data?.attributes || data;
    const skydropx_workflow_status =
      (metadata?.workflow_status as string) ||
      (attributes?.workflow_status as string) ||
      null;
    const labelUrl = this.extractLabelUrlFromLabelRow(row);
    const isSkydropxLabelUrl = (u: string) =>
      u.startsWith('https://pro.skydropx.com') || u.startsWith('https://sandbox.skydropx.com');
    const pdfReady =
      this.localPdfFileExists(row.pdf_path) ||
      (!!row.pdf_url && isSkydropxLabelUrl(row.pdf_url)) ||
      (!!labelUrl && isSkydropxLabelUrl(labelUrl));
    return {
      pdf_ready: pdfReady,
      tracking_is_pending,
      skydropx_workflow_status,
    };
  }

  enrichShippingLabel(row: ShippingLabel): ShippingLabelResponse {
    const flags = this.computeShippingLabelFlags(row);
    return {
      ...row,
      pdf_ready: flags.pdf_ready,
      tracking_is_pending: flags.tracking_is_pending,
      skydropx_workflow_status: flags.skydropx_workflow_status,
      carrier_received_at: row.picked_up_at ?? null,
    };
  }

  private async fetchShippingLabelRowByOrderId(orderId: string): Promise<ShippingLabel | null> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const result = await dbPool.query(
      `SELECT 
        id, order_id, tracking_number, carrier_name, status,
        origin_address, destination_address, destination_name, destination_phone,
        package_weight, package_dimensions, declared_value,
        pdf_path, pdf_url, metadata,
        generated_at, picked_up_at, in_transit_at, delivered_at,
        created_at, updated_at,
        logistics_status_normalized, tracking_status_raw, master_tracking_number,
        tracking_url, logistics_sync_source, logistics_last_event_at, pickup_snapshot
       FROM orders.shipping_labels 
       WHERE order_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [orderId]
    );

    if (result.rows.length > 0) {
      const label = result.rows[0];
      this.logger.debug(
        `📦 Guía de envío encontrada para orden ${orderId}: tracking_number=${label.tracking_number}, carrier=${label.carrier_name}`
      );
      return label;
    }

    return null;
  }

  /**
   * Buscar la guía más reciente por shipment Skydropx o por tracking (excluye prefijo PENDING-).
   */
  private async fetchShippingLabelBySkydropxLookup(
    skydropxShipmentId: string,
    trackingNumber: string | null
  ): Promise<ShippingLabel | null> {
    if (!dbPool) return null;
    const tn =
      trackingNumber &&
      !trackingNumber.startsWith('PENDING-') &&
      !trackingNumber.startsWith('AGO-')
        ? trackingNumber
        : null;
    const result = await dbPool.query(
      `SELECT 
        id, order_id, tracking_number, carrier_name, status,
        origin_address, destination_address, destination_name, destination_phone,
        package_weight, package_dimensions, declared_value,
        pdf_path, pdf_url, metadata,
        generated_at, picked_up_at, in_transit_at, delivered_at,
        created_at, updated_at,
        logistics_status_normalized, tracking_status_raw, master_tracking_number,
        tracking_url, logistics_sync_source, logistics_last_event_at, pickup_snapshot
       FROM orders.shipping_labels 
       WHERE (metadata->>'skydropx_shipment_id') = $1
          OR ($2::text IS NOT NULL AND tracking_number = $2)
       ORDER BY created_at DESC 
       LIMIT 1`,
      [skydropxShipmentId, tn]
    );
    return result.rows[0] || null;
  }

  /**
   * Webhook Skydropx (packages): validar firma en controller y persistir estado.
   */
  async processSkydropxWebhookPackage(
    body: unknown,
    authorization: string | undefined,
    rawBody: Buffer | undefined
  ): Promise<{ ok: boolean; ignored?: boolean; orderId?: string }> {
    await this.skydropxService.verifyWebhookAuthorization(authorization, rawBody);
    const tracking = this.skydropxService.trackingFromPackageWebhook(body);
    if (!tracking) {
      this.logger.debug('Webhook Skydropx: evento no es package o sin shipment id; OK');
      return { ok: true, ignored: true };
    }
    const attrs = (body as any)?.data?.attributes;
    const trackingNum =
      (attrs?.tracking_number != null ? String(attrs.tracking_number) : null) ||
      tracking.tracking_number;
    const row = await this.fetchShippingLabelBySkydropxLookup(
      tracking.shipment_id,
      trackingNum
    );
    if (!row) {
      this.logger.warn(
        `Webhook Skydropx: sin guía local para shipment ${tracking.shipment_id}`
      );
      return { ok: true, ignored: true };
    }
    const attrsWh = (body as any)?.data?.attributes;
    let occurredAt = new Date();
    if (attrsWh?.updated_at) {
      const d = new Date(attrsWh.updated_at);
      if (!isNaN(d.getTime())) occurredAt = d;
    } else if (attrsWh?.created_at) {
      const d = new Date(attrsWh.created_at);
      if (!isNaN(d.getTime())) occurredAt = d;
    }
    const packageId = (body as any)?.data?.id != null ? String((body as any).data.id) : null;
    await this.applySkydropxTrackingToShippingLabel(row.order_id, row, tracking, 'webhook', {
      occurredAt,
      externalKeyPart: packageId,
      webhookMeta: {
        skydropx_last_webhook_at: occurredAt.toISOString(),
        skydropx_last_webhook_status: tracking.status,
      },
    });
    this.logger.log(
      `✅ Webhook Skydropx aplicado: orden ${row.order_id} → ${tracking.status}`
    );
    return { ok: true, orderId: row.order_id };
  }

  /**
   * Refresco batch de guías con envío Skydropx no terminal (cron). Respeta delay entre llamadas.
   */
  async refreshSkydropxOpenShipmentsBatch(): Promise<void> {
    if (process.env.SKYDROPPX_SYNC_ENABLED !== 'true') {
      return;
    }
    if (!dbPool) return;
    const delayMs = Math.max(
      200,
      parseInt(process.env.SKYDROPPX_SYNC_BATCH_DELAY_MS || '600', 10)
    );
    const batchLimit = Math.min(
      100,
      Math.max(1, parseInt(process.env.SKYDROPPX_SYNC_BATCH_LIMIT || '40', 10))
    );
    const res = await dbPool.query<{ order_id: string }>(
      `SELECT order_id FROM orders.shipping_labels sl
       WHERE sl.status NOT IN ('delivered', 'cancelled')
       AND COALESCE(sl.metadata->>'skydropx_shipment_id', '') <> ''
       ORDER BY sl.updated_at ASC
       LIMIT $1`,
      [batchLimit]
    );
    this.logger.log(
      `🔄 Skydropx batch sync: ${res.rows.length} orden(es) (delay ${delayMs}ms)`
    );
    for (const { order_id } of res.rows) {
      try {
        await this.refreshSkydropxShipmentData(order_id);
      } catch (e: any) {
        this.logger.warn(
          `⚠️ Batch Skydropx falló para orden ${order_id}: ${e?.message || e}`
        );
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  /**
   * Cancelar envío en Skydropx y marcar guía local como cancelada.
   */
  async cancelSkydropxShippingLabel(
    orderId: string,
    reason?: string
  ): Promise<ShippingLabelResponse> {
    const row = await this.fetchShippingLabelRowByOrderId(orderId);
    if (!row) {
      throw new NotFoundException(`No se encontró guía de envío para la orden ${orderId}`);
    }
    const sid = this.extractSkydropxShipmentIdFromLabel(row);
    if (!sid) {
      throw new BadRequestException(
        'Esta guía no tiene un envío de Skydropx asociado para cancelar.'
      );
    }
    await this.skydropxService.cancelShipment(sid, reason);
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }
    const meta = this.normalizeLabelMetadata(row.metadata) || {};
    const merged = {
      ...meta,
      skydropx_shipment_id: sid,
      skydropx_cancelled_at: new Date().toISOString(),
      skydropx_cancel_reason: reason?.trim() || null,
    };
    await this.applyLogisticsStatusUpdate({
      shippingLabelId: row.id,
      orderId,
      incomingLifecycle: 'cancelled',
      rawStatus: 'cancelled',
      eventSource: 'manual_sync',
      occurredAt: new Date(),
      skipOrderStatusUpdate: true,
      replaceMetadataJson: JSON.stringify(merged),
      externalKeyPart: 'skydropx_cancel',
    });
    const fresh = await this.fetchShippingLabelRowByOrderId(orderId);
    if (!fresh) {
      throw new ServiceUnavailableException('Guía actualizada pero no se pudo releer');
    }
    return this.enrichShippingLabel(fresh);
  }

  private async downloadRemoteLabelPdf(row: ShippingLabel, labelUrl: string): Promise<Buffer> {
    const axios = require('axios');
    const pdfResponse = await axios.get(labelUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Agora-Ecosystem/1.0',
      },
    });
    const buf = Buffer.from(pdfResponse.data);
    if (row.tracking_number && dbPool) {
      const safeTracking = String(row.tracking_number).replace(/[/\\\0]/g, '_');
      const fileName = `shipping-label-${safeTracking}.pdf`;
      const pdfPath = path.join(this.PDF_STORAGE_DIR, fileName);
      fs.writeFileSync(pdfPath, buf);
      await dbPool.query(
        `UPDATE orders.shipping_labels 
         SET pdf_path = $1, pdf_url = $2, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $3`,
        [pdfPath, labelUrl, row.id]
      );
      this.logger.log(`✅ PDF guardado localmente y pdf_url actualizado en BD`);
    }
    return buf;
  }

  /**
   * Persistir snapshot de Skydropx (tracking, metadata, pdf_url) y alinear estado de guía/orden.
   */
  private async applySkydropxTrackingToShippingLabel(
    orderId: string,
    shippingLabel: ShippingLabel,
    tracking: SkydropxTracking,
    eventSource: LogisticsSyncSource,
    extras?: {
      occurredAt?: Date;
      externalKeyPart?: string | null;
      webhookMeta?: Record<string, unknown>;
    }
  ): Promise<void> {
    if (!dbPool) return;

    let newStatus = tracking.status;
    if (newStatus === 'created') {
      newStatus = 'generated';
    } else if (newStatus === 'exception') {
      newStatus = 'in_transit';
    } else if (newStatus === 'cancelled' || newStatus === 'canceled') {
      newStatus = 'cancelled';
      this.logger.warn(`⚠️ Shipment cancelado, actualizando estado a 'cancelled'`);
    }
    if (newStatus === 'success' || newStatus === 'in_progress') {
      newStatus = 'generated';
    }

    if (shippingLabel.status !== newStatus) {
      this.logger.log(
        `🔄 Actualizando estado de shipping_label ${shippingLabel.id}: ${shippingLabel.status} → ${newStatus}`
      );
    }

    const labelUrl = this.extractLabelUrlFromSkydropxApiMetadata(tracking.metadata);
    const prevMeta = this.normalizeLabelMetadata(shippingLabel.metadata) || {};
    const shipmentId = tracking.shipment_id || this.extractSkydropxShipmentIdFromLabel(shippingLabel);
    const dataBlock = tracking.metadata?.data || tracking.metadata;
    const attrs = dataBlock?.attributes || dataBlock;
    const workflowStatus = attrs?.workflow_status || prevMeta.workflow_status;
    const included = tracking.metadata?.included || [];
    const masterTn =
      attrs?.master_tracking_number ||
      (included.length > 0 ? (included[0] as any)?.attributes?.master_tracking_number : null);

    const mergedMetadata = {
      ...prevMeta,
      skydropx_shipment_id: shipmentId || prevMeta.skydropx_shipment_id,
      workflow_status: workflowStatus,
      full_response: tracking.metadata,
      ...(extras?.webhookMeta || {}),
    };

    const newTracking =
      tracking.tracking_number &&
      !tracking.tracking_number.startsWith('AGO-') &&
      !tracking.tracking_number.startsWith('PENDING-')
        ? tracking.tracking_number
        : null;

    const incomingLifecycle = parseLabelLifecycle(newStatus);
    const rawForEvent =
      tracking.raw_status != null && String(tracking.raw_status).length > 0
        ? String(tracking.raw_status)
        : newStatus;

    await this.applyLogisticsStatusUpdate({
      shippingLabelId: shippingLabel.id,
      orderId,
      incomingLifecycle,
      rawStatus: rawForEvent,
      eventSource,
      occurredAt: extras?.occurredAt ?? new Date(),
      payload: tracking,
      trackingNumber: newTracking,
      masterTrackingNumber: masterTn != null ? String(masterTn) : null,
      trackingUrl: tracking.tracking_url ?? null,
      labelPdfUrl: labelUrl ?? null,
      carrierName: tracking.carrier != null ? String(tracking.carrier) : null,
      externalKeyPart: extras?.externalKeyPart ?? null,
      replaceMetadataJson: JSON.stringify(mergedMetadata),
    });
  }

  /** Una consulta a Skydropx + persistencia; intenta guardar PDF local si hay label_url. */
  private async refreshSkydropxShipmentData(
    orderId: string,
    eventSource: LogisticsSyncSource = 'polling'
  ): Promise<ShippingLabel | null> {
    const row = await this.fetchShippingLabelRowByOrderId(orderId);
    if (!row) return null;
    const shipmentId = this.extractSkydropxShipmentIdFromLabel(row);
    if (!shipmentId) {
      this.logger.warn(`⚠️ Sin skydropx_shipment_id; no se puede refrescar desde Skydropx para orden ${orderId}`);
      return null;
    }
    try {
      const tracking = await this.skydropxService.getShipmentTracking(shipmentId);
      await this.applySkydropxTrackingToShippingLabel(orderId, row, tracking, eventSource);
      let fresh = await this.fetchShippingLabelRowByOrderId(orderId);
      if (fresh) {
        const url = this.extractLabelUrlFromLabelRow(fresh);
        if (url && !this.localPdfFileExists(fresh.pdf_path)) {
          try {
            await this.downloadRemoteLabelPdf(fresh, url);
            fresh = await this.fetchShippingLabelRowByOrderId(orderId);
          } catch (e: any) {
            this.logger.warn(`⚠️ No se pudo descargar PDF tras refrescar Skydropx: ${e.message}`);
          }
        }
      }
      return fresh;
    } catch (error: any) {
      this.logger.error(`❌ Error refrescando Skydropx para orden ${orderId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Reintentar sincronización con Skydropx y persistir PDF si ya hay label_url.
   */
  async syncShippingLabelFromSkydropx(orderId: string): Promise<ShippingLabelResponse> {
    const updated = await this.refreshSkydropxShipmentData(orderId, 'manual_sync');
    if (!updated) {
      const row = await this.fetchShippingLabelRowByOrderId(orderId);
      if (!row) {
        throw new NotFoundException(`No se encontró guía de envío para la orden ${orderId}`);
      }
      const shipmentId = this.extractSkydropxShipmentIdFromLabel(row);
      if (!shipmentId) {
        throw new BadRequestException(
          'Esta guía no tiene un envío de Skydropx asociado para sincronizar.'
        );
      }
      throw new ServiceUnavailableException('No se pudo sincronizar con Skydropx. Intenta de nuevo.');
    }
    return this.enrichShippingLabel(updated);
  }

  /**
   * Obtener guía de envío por ID de orden (con flags pdf_ready, tracking_is_pending, etc.)
   */
  async getShippingLabelByOrderId(orderId: string): Promise<ShippingLabelResponse | null> {
    const row = await this.fetchShippingLabelRowByOrderId(orderId);
    if (!row) return null;
    return this.enrichShippingLabel(row);
  }

  /**
   * Obtener PDF de guía: primero archivo local (pdf_path), luego URL Skydropx.
   * Si el tracking sigue en PENDING o falla la descarga, intenta una sincronización con Skydropx y reintenta.
   */
  async getShippingLabelPDF(orderId: string): Promise<Buffer | null> {
    const isSkydropxHttpUrl = (u: string) =>
      u.startsWith('https://pro.skydropx.com') || u.startsWith('https://sandbox.skydropx.com');

    /** Archivo local que sabemos que vino de una descarga Skydropx (misma fuente que la URL). */
    const isSkydropxLocalCache = (row: ShippingLabel): boolean => {
      if (!this.localPdfFileExists(row.pdf_path)) return false;
      if (row.pdf_url && isSkydropxHttpUrl(row.pdf_url)) return true;
      const extracted = this.extractLabelUrlFromLabelRow(row);
      return !!extracted && isSkydropxHttpUrl(extracted);
    };

    const tryResolvePdf = async (row: ShippingLabel): Promise<Buffer | null> => {
      const labelUrl = this.extractLabelUrlFromLabelRow(row);
      const skydropxShipmentId = this.extractSkydropxShipmentIdFromLabel(row);

      // 1) Si hay URL de Skydropx, priorizar siempre el PDF del proveedor (no el fallback generado por Agora en disco)
      if (labelUrl) {
        try {
          this.logger.log(`📄 Descargando PDF desde Skydropx (prioridad sobre archivo local): ${labelUrl}`);
          return await this.downloadRemoteLabelPdf(row, labelUrl);
        } catch (error: any) {
          this.logger.error(`❌ Error descargando PDF de Skydropx: ${error.message}`);
          if (isSkydropxLocalCache(row)) {
            try {
              this.logger.log(`📄 Usando PDF en caché local (misma fuente Skydropx): ${row.pdf_path}`);
              return fs.readFileSync(row.pdf_path!);
            } catch (e: any) {
              this.logger.warn(`⚠️ Caché local ilegible: ${e.message}`);
            }
          }
          return null;
        }
      }

      // 2) Sin URL aún: no servir PDF local de Agora si hay envío Skydropx (debe sync / esperar label_url)
      if (skydropxShipmentId) {
        this.logger.warn(
          `⚠️ Hay envío Skydropx pero sin label_url todavía; no se sirve PDF local de respaldo para orden ${orderId}`
        );
        return null;
      }

      // 3) Solo simulación / sin Skydropx: permitir PDF local generado por Agora
      if (this.localPdfFileExists(row.pdf_path)) {
        try {
          this.logger.log(`📄 Sirviendo PDF local (sin envío Skydropx): ${row.pdf_path}`);
          return fs.readFileSync(row.pdf_path!);
        } catch (e: any) {
          this.logger.warn(`⚠️ pdf_path en BD pero no legible: ${e.message}`);
        }
      }

      this.logger.warn(`⚠️ Sin label_url Skydropx ni PDF local para orden ${orderId}`);
      return null;
    };

    let shippingLabel = await this.fetchShippingLabelRowByOrderId(orderId);
    if (!shippingLabel) {
      this.logger.warn(`⚠️ No se encontró shipping label para orden ${orderId}`);
      return null;
    }

    this.logger.log(`📦 Obteniendo PDF para orden ${orderId}`);
    let buf = await tryResolvePdf(shippingLabel);
    if (buf) return buf;

    if (this.extractSkydropxShipmentIdFromLabel(shippingLabel)) {
      this.logger.log(
        `🔄 Sincronizando con Skydropx y reintentando PDF (PENDING, sin URL o fallo de descarga)`
      );
      const refreshed = await this.refreshSkydropxShipmentData(orderId);
      if (refreshed) {
        buf = await tryResolvePdf(refreshed);
      }
    }

    if (!buf) {
      this.logger.warn(`⚠️ No hay PDF disponible para orden ${orderId} tras intentos`);
    }
    return buf;
  }

  /**
   * Obtener datos de la orden para etiqueta de pickup (cliente + tienda + ítems).
   * Solo válido si delivery_address_text = 'Recoger en tienda'.
   */
  async getOrderForPickupLabel(orderId: string): Promise<{
    order_id: string;
    order_number: string;
    client_name: string;
    client_phone: string;
    business_name: string;
    business_address: string;
    business_logo_url: string | null;
    items: { item_name: string; quantity: number }[];
    created_at: Date;
  } | null> {
    if (!dbPool) return null;
    const orderResult = await dbPool.query(
      `SELECT 
        o.id as order_id,
        o.delivery_address_text,
        o.created_at,
        TRIM(COALESCE(up.first_name, '') || ' ' || COALESCE(up.last_name, '')) as client_name,
        up.phone as client_phone,
        b.name as business_name,
        b.logo_url as business_logo_url,
        TRIM(CONCAT_WS(', ',
          NULLIF(TRIM(CONCAT_WS(' ', a.street, a.street_number)), ''),
          NULLIF(a.neighborhood, ''),
          NULLIF(a.city, ''),
          NULLIF(a.state, ''),
          NULLIF(a.postal_code, '')
        )) as business_address
       FROM orders.orders o
       INNER JOIN core.user_profiles up ON o.client_id = up.id
       INNER JOIN core.businesses b ON o.business_id = b.id
       LEFT JOIN core.addresses a ON b.address_id = a.id
       WHERE o.id = $1`,
      [orderId]
    );
    if (orderResult.rows.length === 0) return null;
    const row = orderResult.rows[0];
    if (row.delivery_address_text !== 'Recoger en tienda') return null;

    const itemsResult = await dbPool.query(
      `SELECT item_name, quantity FROM orders.order_items WHERE order_id = $1 ORDER BY created_at`,
      [orderId]
    );
    const items = (itemsResult.rows || []).map((r: any) => ({
      item_name: r.item_name || 'Producto',
      quantity: parseInt(r.quantity, 10) || 1,
    }));

    const orderNumber = String(row.order_id).replace(/-/g, '').slice(-8).toUpperCase();
    return {
      order_id: row.order_id,
      order_number: orderNumber,
      client_name: row.client_name || 'Cliente',
      client_phone: row.client_phone || '',
      business_name: row.business_name || 'Tienda',
      business_address: row.business_address && String(row.business_address).trim() ? String(row.business_address).trim() : '',
      business_logo_url: row.business_logo_url ? String(row.business_logo_url).trim() : null,
      items,
      created_at: row.created_at,
    };
  }

  /**
   * Descargar imagen desde URL y devolver buffer (para logo en PDF).
   */
  private async fetchImageBuffer(url: string): Promise<Buffer | null> {
    try {
      if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) return null;
      const axios = require('axios');
      const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 8000 });
      return Buffer.from(res.data);
    } catch (err: any) {
      this.logger.warn(`⚠️ No se pudo cargar logo (${url}): ${err?.message || err}`);
      return null;
    }
  }

  /**
   * Generar PDF de etiqueta para recoger en tienda (tamaño estándar 4x6 pulgadas).
   */
  async getPickupLabelPDF(orderId: string): Promise<Buffer | null> {
    const orderData = await this.getOrderForPickupLabel(orderId);
    if (!orderData) {
      this.logger.warn(`⚠️ Orden ${orderId} no es pickup o no existe`);
      return null;
    }
    let logoBuffer: Buffer | null = null;
    if (orderData.business_logo_url) {
      logoBuffer = await this.fetchImageBuffer(orderData.business_logo_url);
    }
    return this.generatePickupLabelPDFBuffer(orderData, logoBuffer);
  }

  private generatePickupLabelPDFBuffer(
    data: {
      order_id: string;
      order_number: string;
      client_name: string;
      client_phone: string;
      business_name: string;
      business_address: string;
      items: { item_name: string; quantity: number }[];
      created_at: Date;
    },
    logoBuffer: Buffer | null
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const { Writable } = require('stream');
        const chunks: Buffer[] = [];
        const writable = new Writable({
          write(chunk: Buffer, _enc: string, cb: () => void) {
            chunks.push(chunk);
            cb();
          },
          final(cb: () => void) {
            resolve(Buffer.concat(chunks));
            cb();
          },
        });

        const doc = new PDFDocument({
          size: [288, 432],
          margins: { top: 12, bottom: 12, left: 12, right: 12 },
        });
        doc.pipe(writable);

        const pageWidth = 288;
        const marginLeft = 12;
        const marginRight = 12;
        const contentWidth = pageWidth - marginLeft - marginRight;
        let y = 12;

        // ========== TIENDA: logo + nombre + dirección ==========
        const logoHeight = 28;
        const logoWidth = 80;
        if (logoBuffer) {
          try {
            doc.image(logoBuffer, marginLeft, y, { width: logoWidth, height: logoHeight, fit: [logoWidth, logoHeight] });
          } catch {
            // Si la imagen no es compatible (ej. SVG), ignorar
          }
        }
        y += logoHeight + 4;

        doc.fontSize(11).font('Helvetica-Bold').fillColor('black');
        const businessNameH = doc.heightOfString(data.business_name, { width: contentWidth });
        doc.text(data.business_name, marginLeft, y, { width: contentWidth });
        y += businessNameH + 2;
        if (data.business_address) {
          doc.fontSize(7).font('Helvetica');
          const addrH = doc.heightOfString(data.business_address, { width: contentWidth });
          doc.text(data.business_address, marginLeft, y, { width: contentWidth });
          y += addrH + 2;
        }
        y += 4;
        doc.moveTo(marginLeft, y).lineTo(pageWidth - marginRight, y).stroke();
        y += 8;

        doc.fontSize(11).font('Helvetica-Bold');
        doc.text('RECOGER EN TIENDA', marginLeft, y);
        y += 12;
        doc.moveTo(marginLeft, y).lineTo(pageWidth - marginRight, y).stroke();
        y += 8;

        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('Nº PEDIDO', marginLeft, y);
        y += 10;
        doc.fontSize(16).font('Helvetica-Bold');
        doc.text(data.order_number, marginLeft, y);
        y += 20;

        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('CLIENTE', marginLeft, y);
        y += 10;
        doc.fontSize(10).font('Helvetica');
        const clientNameH = doc.heightOfString(data.client_name, { width: contentWidth });
        doc.text(data.client_name, marginLeft, y, { width: contentWidth });
        y += clientNameH + 2;
        if (data.client_phone) {
          doc.fontSize(9);
          doc.text('Tel: ' + data.client_phone, marginLeft, y);
          y += 12;
        } else {
          y += 4;
        }
        y += 6;

        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('CONTENIDO', marginLeft, y);
        y += 10;
        doc.fontSize(8).font('Helvetica');
        const maxItems = 10;
        const itemsToShow = data.items.slice(0, maxItems);
        for (const item of itemsToShow) {
          const line = `• ${item.item_name} x ${item.quantity}`;
          const lineH = doc.heightOfString(line, { width: contentWidth });
          if (y + lineH > 390) break;
          doc.text(line, marginLeft, y, { width: contentWidth });
          y += lineH + 2;
        }
        if (data.items.length > maxItems) {
          doc.fontSize(7).fillColor('gray');
          doc.text(`+ ${data.items.length - maxItems} más`, marginLeft, y);
          doc.fillColor('black');
          y += 10;
        }
        y += 8;

        doc.moveTo(marginLeft, y).lineTo(pageWidth - marginRight, y).stroke();
        y += 8;

        const barcodeY = y;
        this.drawBarcode(doc, data.order_number, marginLeft + 20, barcodeY, contentWidth - 40, 32);
        doc.fontSize(8).font('Courier-Bold');
        doc.text(data.order_number, marginLeft, barcodeY + 38, { width: contentWidth, align: 'center' });
        y = barcodeY + 50;

        doc.fontSize(6).font('Helvetica').fillColor('gray');
        doc.text(
          `Pedido: ${new Date(data.created_at).toLocaleDateString('es-MX')}`,
          marginLeft,
          y,
          { width: contentWidth, align: 'center' }
        );
        doc.fillColor('black');
        doc.end();
      } catch (error: any) {
        this.logger.error(`❌ Error generando PDF pickup: ${error.message}`);
        reject(error);
      }
    });
  }

  /**
   * Obtener guía por número de seguimiento
   */
  async getShippingLabelByTrackingNumber(trackingNumber: string): Promise<ShippingLabel | null> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const result = await dbPool.query(
      `SELECT * FROM orders.shipping_labels WHERE tracking_number = $1`,
      [trackingNumber]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Obtener y actualizar el estado de seguimiento de un envío desde Skydropx
   * @param orderId ID de la orden
   * @returns Información de tracking actualizada
   */
  async getShipmentTracking(orderId: string): Promise<SkydropxTracking | null> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const shippingLabel = await this.fetchShippingLabelRowByOrderId(orderId);
    if (!shippingLabel) {
      this.logger.warn(`⚠️ No se encontró shipping label para orden ${orderId}`);
      return null;
    }

    const skydropxShipmentId = this.extractSkydropxShipmentIdFromLabel(shippingLabel);
    if (!skydropxShipmentId) {
      this.logger.warn(`⚠️ No se encontró skydropx_shipment_id en metadata para orden ${orderId}`);
      return null;
    }

    this.logger.log(`📦 Consultando tracking de Skydropx para shipment: ${skydropxShipmentId}`);

    try {
      const tracking = await this.skydropxService.getShipmentTracking(skydropxShipmentId);
      await this.applySkydropxTrackingToShippingLabel(
        orderId,
        shippingLabel,
        tracking,
        'manual_sync'
      );
      return tracking;
    } catch (error: any) {
      this.logger.error(`❌ Error obteniendo tracking de Skydropx: ${error.message}`);
      throw error;
    }
  }

  /**
   * Historial persistido de eventos logísticos (webhook, polling, sync manual, etc.).
   */
  async getShippingLabelLogisticsEvents(orderId: string, limit = 80): Promise<
    Array<{
      id: string;
      shipping_label_id: string;
      order_id: string;
      event_source: string;
      raw_status: string | null;
      normalized_status: string;
      label_status: string;
      carrier_name: string | null;
      tracking_number: string | null;
      occurred_at: Date;
      payload: unknown;
      created_at: Date;
    }>
  > {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }
    try {
      const res = await dbPool.query(
        `SELECT id, shipping_label_id, order_id, event_source, raw_status, normalized_status,
                label_status, carrier_name, tracking_number, occurred_at, payload, created_at
         FROM orders.shipping_label_logistics_events
         WHERE order_id = $1
         ORDER BY occurred_at DESC, created_at DESC
         LIMIT $2`,
        [orderId, Math.min(200, Math.max(1, limit))]
      );
      return res.rows;
    } catch (e: any) {
      this.logger.warn(
        `⚠️ getShippingLabelLogisticsEvents: ${e?.message || e} (¿migración pendiente?)`
      );
      return [];
    }
  }

  /**
   * Obtener eventos de tracking detallados para un envío
   * @param orderId ID de la orden
   * @returns Array de eventos de tracking
   */
  async getTrackingEvents(orderId: string): Promise<SkydropxTrackingEvent[]> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    // 1. Obtener la shipping_label de la orden
    const shippingLabel = await this.getShippingLabelByOrderId(orderId);
    
    if (!shippingLabel) {
      this.logger.warn(`⚠️ No se encontró shipping label para orden ${orderId}`);
      return [];
    }

    // 2. Verificar que tenga tracking_number y carrier_name
    if (!shippingLabel.tracking_number || !shippingLabel.carrier_name) {
      this.logger.warn(`⚠️ Shipping label no tiene tracking_number o carrier_name`);
      return [];
    }

    // 3. Obtener eventos de tracking desde Skydropx
    try {
      const events = await this.skydropxService.getTrackingEvents(
        shippingLabel.tracking_number,
        shippingLabel.carrier_name.toLowerCase() // Skydropx espera el carrier en minúsculas
      );

      return events;
    } catch (error: any) {
      this.logger.error(`❌ Error obteniendo eventos de tracking: ${error.message}`);
      throw error;
    }
  }
}

