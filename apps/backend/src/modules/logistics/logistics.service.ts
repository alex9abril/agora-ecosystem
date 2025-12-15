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
const PDFDocument = require('pdfkit');
import { CreateShippingLabelDto } from './dto/create-shipping-label.dto';

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
  generated_at: Date;
  picked_up_at?: Date;
  in_transit_at?: Date;
  delivered_at?: Date;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class LogisticsService {
  private readonly logger = new Logger(LogisticsService.name);
  private readonly CARRIER_NAME = 'AGORA_LOGISTICS';
  private readonly PDF_STORAGE_DIR = path.join(process.cwd(), 'storage', 'shipping-labels');
  private statusUpdateIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
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
  async createShippingLabel(createDto: CreateShippingLabelDto): Promise<ShippingLabel> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const client = await dbPool.connect();

    try {
      await client.query('BEGIN');

      // 1. Obtener información de la orden
      const orderResult = await client.query(
        `SELECT 
          o.id,
          o.status,
          o.delivery_address_text,
          o.total_amount,
          o.client_id,
          o.business_id,
          b.name as business_name,
          COALESCE(
            CONCAT_WS(', ',
              NULLIF(TRIM(CONCAT_WS(' ', a.street, a.street_number)), ''),
              NULLIF(a.neighborhood, ''),
              NULLIF(a.city, ''),
              NULLIF(a.state, ''),
              NULLIF(a.postal_code, '')
            ),
            'Dirección del negocio'
          ) as business_address,
          up.first_name || ' ' || COALESCE(up.last_name, '') as client_name,
          up.phone as client_phone
        FROM orders.orders o
        INNER JOIN core.businesses b ON o.business_id = b.id
        LEFT JOIN core.addresses a ON b.address_id = a.id
        INNER JOIN core.user_profiles up ON o.client_id = up.id
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

      // 2. Generar número de guía
      const trackingNumber = this.generateTrackingNumber();

      // 3. Preparar datos de la guía
      const shippingLabelData = {
        order_id: createDto.orderId,
        tracking_number: trackingNumber,
        carrier_name: this.CARRIER_NAME,
        status: 'generated',
        origin_address: order.business_address || 'Dirección del negocio',
        destination_address: order.delivery_address_text || 'Dirección de entrega',
        destination_name: order.client_name || 'Cliente',
        destination_phone: order.client_phone || '',
        package_weight: createDto.packageWeight || 1.0,
        package_dimensions: createDto.packageDimensions || '30x20x15 cm',
        declared_value: createDto.declaredValue || parseFloat(order.total_amount),
      };

      // 4. Generar PDF
      const pdfPath = await this.generateShippingLabelPDF(
        trackingNumber,
        order,
        shippingLabelData
      );

      // 5. Guardar en base de datos
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
          generated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
        RETURNING *`,
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
        ]
      );

      await client.query('COMMIT');

      const shippingLabel = insertResult.rows[0];

      this.logger.log(`✅ Guía de envío creada: ${trackingNumber} para orden ${createDto.orderId}`);

      // 6. Iniciar simulación automática de estados
      this.startStatusSimulation(shippingLabel.id, createDto.orderId);

      return shippingLabel;
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

  /**
   * Actualizar estado de la guía y de la orden
   */
  private async updateShippingStatus(
    shippingLabelId: string,
    orderId: string,
    newStatus: string
  ): Promise<void> {
    if (!dbPool) {
      this.logger.error('❌ No hay conexión a base de datos');
      return;
    }

    const client = await dbPool.connect();

    try {
      await client.query('BEGIN');

      // Actualizar estado de la guía
      const timestampField = {
        picked_up: 'picked_up_at',
        in_transit: 'in_transit_at',
        delivered: 'delivered_at',
      }[newStatus];

      await client.query(
        `UPDATE orders.shipping_labels
         SET status = $1, ${timestampField} = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [newStatus, shippingLabelId]
      );

      // Actualizar estado de la orden
      let orderStatus = newStatus;
      if (newStatus === 'picked_up' || newStatus === 'in_transit') {
        orderStatus = 'in_transit';
      } else if (newStatus === 'delivered') {
        orderStatus = 'delivered';
      }

      await client.query(
        `UPDATE orders.orders
         SET status = $1, updated_at = CURRENT_TIMESTAMP
         ${orderStatus === 'delivered' ? ', delivered_at = CURRENT_TIMESTAMP' : ''}
         WHERE id = $2`,
        [orderStatus, orderId]
      );

      // Registrar en historial de estados
      await client.query(
        `INSERT INTO orders.order_status_history (order_id, old_status, new_status, changed_by_user_id, changed_by_role, notes)
         SELECT 
           $1,
           o.status,
           $2,
           NULL,
           'system',
           'Actualización automática desde servicio de logística'
         FROM orders.orders o
         WHERE o.id = $1`,
        [orderId, orderStatus]
      );

      await client.query('COMMIT');

      this.logger.log(
        `✅ Estado actualizado: Guía ${shippingLabelId} → ${newStatus}, Orden ${orderId} → ${orderStatus}`
      );
    } catch (error: any) {
      await client.query('ROLLBACK');
      this.logger.error(`❌ Error actualizando estado: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Obtener guía de envío por ID de orden
   */
  async getShippingLabelByOrderId(orderId: string): Promise<ShippingLabel | null> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const result = await dbPool.query(
      `SELECT * FROM orders.shipping_labels WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [orderId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Obtener PDF de guía de envío
   */
  async getShippingLabelPDF(orderId: string): Promise<Buffer | null> {
    const shippingLabel = await this.getShippingLabelByOrderId(orderId);

    if (!shippingLabel || !shippingLabel.pdf_path) {
      return null;
    }

    try {
      if (fs.existsSync(shippingLabel.pdf_path)) {
        return fs.readFileSync(shippingLabel.pdf_path);
      }
    } catch (error: any) {
      this.logger.error(`❌ Error leyendo PDF: ${error.message}`);
    }

    return null;
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
}

