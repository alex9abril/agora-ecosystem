import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { dbPool } from '../../config/database.config';
import { CheckoutDto } from './dto/checkout.dto';
import { TaxesService } from '../catalog/taxes/taxes.service';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(forwardRef(() => TaxesService))
    private readonly taxesService: TaxesService,
  ) {}

  /**
   * Crear pedido desde carrito (checkout)
   */
  async checkout(userId: string, checkoutDto: CheckoutDto) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const client = await dbPool.connect();
    
    try {
      await client.query('BEGIN');

      // 1. Obtener y validar carrito
      const cartResult = await client.query(
        `SELECT * FROM orders.shopping_cart WHERE user_id = $1`,
        [userId]
      );

      if (cartResult.rows.length === 0) {
        throw new BadRequestException('El carrito está vacío');
      }

      const cart = cartResult.rows[0];

      // 2. Obtener items del carrito
      const itemsResult = await client.query(
        `SELECT 
          sci.id,
          sci.product_id,
          sci.variant_selections,
          sci.quantity,
          sci.unit_price,
          sci.variant_price_adjustment,
          sci.item_subtotal,
          sci.special_instructions,
          p.name as product_name,
          p.business_id
        FROM orders.shopping_cart_items sci
        INNER JOIN catalog.products p ON sci.product_id = p.id
        WHERE sci.cart_id = $1`,
        [cart.id]
      );

      if (itemsResult.rows.length === 0) {
        throw new BadRequestException('El carrito está vacío');
      }

      // 3. Validar que todos los items son del mismo negocio
      const businessIds = [...new Set(itemsResult.rows.map((item: any) => item.business_id))];
      if (businessIds.length > 1) {
        throw new BadRequestException('Todos los productos deben ser del mismo negocio');
      }

      const businessId = businessIds[0];

      // 4. Validar dirección
      const addressResult = await client.query(
        `SELECT 
          id,
          street,
          street_number,
          neighborhood,
          city,
          state,
          postal_code,
          country,
          location,
          (location)[0] as longitude,
          (location)[1] as latitude
        FROM core.addresses
        WHERE id = $1 AND user_id = $2 AND is_active = TRUE`,
        [checkoutDto.addressId, userId]
      );

      if (addressResult.rows.length === 0) {
        throw new NotFoundException('Dirección no encontrada');
      }

      const address = addressResult.rows[0];

      // 5. Obtener información del negocio
      const businessResult = await client.query(
        `SELECT id, name, location FROM core.businesses WHERE id = $1 AND is_active = TRUE`,
        [businessId]
      );

      if (businessResult.rows.length === 0) {
        throw new NotFoundException('Negocio no encontrado');
      }

      const business = businessResult.rows[0];

      // 6. Calcular montos y impuestos
      const subtotal = itemsResult.rows.reduce((sum: number, item: any) => sum + parseFloat(item.item_subtotal), 0);
      
      // Calcular impuestos usando el nuevo sistema
      let totalTaxAmount = 0;
      const itemTaxBreakdowns: any[] = [];
      
      for (const item of itemsResult.rows) {
        try {
          const taxBreakdown = await this.taxesService.calculateProductTaxes(
            item.product_id,
            parseFloat(item.item_subtotal)
          );
          totalTaxAmount += taxBreakdown.total_tax;
          itemTaxBreakdowns.push({
            product_id: item.product_id,
            tax_breakdown: taxBreakdown,
          });
        } catch (error) {
          // Si hay error calculando impuestos, continuar sin impuestos para ese producto
          console.warn(`⚠️ Error calculando impuestos para producto ${item.product_id}:`, error);
          itemTaxBreakdowns.push({
            product_id: item.product_id,
            tax_breakdown: { taxes: [], total_tax: 0 },
          });
        }
      }
      
      const taxAmount = Math.round(totalTaxAmount * 100) / 100;
      const deliveryFee = 0; // Por ahora gratis, se puede calcular después
      const discountAmount = 0; // Por ahora sin descuentos
      const tipAmount = checkoutDto.tipAmount || 0;
      const totalAmount = subtotal + taxAmount + deliveryFee + tipAmount - discountAmount;

      // 7. Construir texto de dirección
      const addressText = [
        address.street,
        address.street_number,
        address.neighborhood,
        address.city,
        address.state,
        address.postal_code,
        address.country,
      ].filter(Boolean).join(', ');

      // 8. Crear pedido
      const orderResult = await client.query(
        `INSERT INTO orders.orders (
          client_id, business_id, status,
          delivery_address_id, delivery_address_text, delivery_location,
          subtotal, tax_amount, delivery_fee, discount_amount, tip_amount, total_amount,
          payment_method, payment_status,
          delivery_notes
        ) VALUES ($1, $2, 'pending', $3, $4, ST_MakePoint($5, $6)::point, $7, $8, $9, $10, $11, $12, 'cash', 'pending', $13)
        RETURNING *`,
        [
          userId,
          businessId,
          checkoutDto.addressId,
          addressText,
          address.longitude,
          address.latitude,
          subtotal.toFixed(2),
          taxAmount.toFixed(2),
          deliveryFee.toFixed(2),
          discountAmount.toFixed(2),
          tipAmount.toFixed(2),
          totalAmount.toFixed(2),
          checkoutDto.deliveryNotes || null,
        ]
      );

      const order = orderResult.rows[0];

      // 9. Crear order_items con tax_breakdown
      for (let i = 0; i < itemsResult.rows.length; i++) {
        const item = itemsResult.rows[i];
        const taxBreakdown = itemTaxBreakdowns.find(tb => tb.product_id === item.product_id)?.tax_breakdown || { taxes: [], total_tax: 0 };
        
        await client.query(
          `INSERT INTO orders.order_items (
            order_id, product_id, item_name, item_price,
            quantity, variant_selection, item_subtotal, special_instructions, tax_breakdown
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            order.id,
            item.product_id,
            item.product_name,
            item.unit_price,
            item.quantity,
            item.variant_selections ? JSON.stringify(item.variant_selections) : null,
            item.item_subtotal,
            item.special_instructions || null,
            JSON.stringify(taxBreakdown),
          ]
        );
      }

      // 10. Limpiar carrito
      await client.query(
        `DELETE FROM orders.shopping_cart_items WHERE cart_id = $1`,
        [cart.id]
      );
      await client.query(
        `DELETE FROM orders.shopping_cart WHERE id = $1`,
        [cart.id]
      );

      await client.query('COMMIT');

      // 11. Obtener pedido completo con items
      return await this.findOne(order.id, userId);
    } catch (error: any) {
      await client.query('ROLLBACK');
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error('❌ Error en checkout:', error);
      throw new ServiceUnavailableException(`Error al procesar checkout: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Listar pedidos del usuario
   */
  async findAll(userId: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      const result = await dbPool.query(
        `SELECT 
          o.id,
          o.client_id,
          o.business_id,
          o.status,
          o.delivery_address_text,
          o.subtotal,
          o.tax_amount,
          o.delivery_fee,
          o.discount_amount,
          o.tip_amount,
          o.total_amount,
          o.payment_method,
          o.payment_status,
          o.estimated_delivery_time,
          o.delivery_notes,
          o.created_at,
          o.updated_at,
          o.confirmed_at,
          o.delivered_at,
          o.cancelled_at,
          b.name as business_name,
          b.logo_url as business_logo_url
        FROM orders.orders o
        INNER JOIN core.businesses b ON o.business_id = b.id
        WHERE o.client_id = $1
        ORDER BY o.created_at DESC`,
        [userId]
      );

      console.log('📦 Pedidos encontrados en BD:', result.rows.length);
      console.log('📦 Primer pedido (ejemplo):', result.rows[0] || 'Ninguno');
      return result.rows;
    } catch (error: any) {
      console.error('❌ Error obteniendo pedidos:', error);
      throw new ServiceUnavailableException(`Error al obtener pedidos: ${error.message}`);
    }
  }

  /**
   * Obtener detalle de pedido
   */
  async findOne(orderId: string, userId: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      // Obtener pedido
      const orderResult = await dbPool.query(
        `SELECT 
          o.*,
          b.name as business_name,
          b.logo_url as business_logo_url,
          (o.delivery_location)[0] as delivery_longitude,
          (o.delivery_location)[1] as delivery_latitude
        FROM orders.orders o
        INNER JOIN core.businesses b ON o.business_id = b.id
        WHERE o.id = $1 AND o.client_id = $2`,
        [orderId, userId]
      );

      if (orderResult.rows.length === 0) {
        throw new NotFoundException('Pedido no encontrado');
      }

      const order = orderResult.rows[0];

      // Obtener items del pedido
      const itemsResult = await dbPool.query(
        `SELECT 
          id,
          product_id,
          item_name,
          item_price,
          quantity,
          variant_selection,
          item_subtotal,
          special_instructions,
          tax_breakdown,
          created_at
        FROM orders.order_items
        WHERE order_id = $1
        ORDER BY created_at ASC`,
        [orderId]
      );

      // Parsear tax_breakdown si viene como string (JSONB de PostgreSQL)
      const items = itemsResult.rows.map(item => ({
        ...item,
        tax_breakdown: typeof item.tax_breakdown === 'string' 
          ? JSON.parse(item.tax_breakdown) 
          : item.tax_breakdown,
        variant_selection: typeof item.variant_selection === 'string'
          ? JSON.parse(item.variant_selection)
          : item.variant_selection,
      }));

      return {
        ...order,
        items,
      };
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('❌ Error obteniendo pedido:', error);
      throw new ServiceUnavailableException(`Error al obtener pedido: ${error.message}`);
    }
  }

  /**
   * Cancelar pedido
   */
  async cancel(orderId: string, userId: string, reason?: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      // Verificar que el pedido existe y pertenece al usuario
      const orderResult = await dbPool.query(
        `SELECT id, status FROM orders.orders WHERE id = $1 AND client_id = $2`,
        [orderId, userId]
      );

      if (orderResult.rows.length === 0) {
        throw new NotFoundException('Pedido no encontrado');
      }

      const order = orderResult.rows[0];

      // Solo se puede cancelar si está pendiente o confirmado
      if (!['pending', 'confirmed'].includes(order.status)) {
        throw new BadRequestException('El pedido no se puede cancelar en su estado actual');
      }

      // Actualizar pedido
      const result = await dbPool.query(
        `UPDATE orders.orders 
         SET status = 'cancelled', 
             cancelled_at = CURRENT_TIMESTAMP,
             cancellation_reason = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND client_id = $3
         RETURNING *`,
        [reason || null, orderId, userId]
      );

      return result.rows[0];
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('❌ Error cancelando pedido:', error);
      throw new ServiceUnavailableException(`Error al cancelar pedido: ${error.message}`);
    }
  }

  /**
   * Listar pedidos de un negocio
   */
  async findAllByBusiness(businessId: string, filters?: {
    status?: string;
    payment_status?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      let whereClause = `WHERE o.business_id = $1`;
      const queryParams: any[] = [businessId];
      let paramIndex = 2;

      if (filters?.status) {
        whereClause += ` AND o.status = $${paramIndex}`;
        queryParams.push(filters.status);
        paramIndex++;
      }

      if (filters?.payment_status) {
        whereClause += ` AND o.payment_status = $${paramIndex}`;
        queryParams.push(filters.payment_status);
        paramIndex++;
      }

      if (filters?.startDate) {
        whereClause += ` AND o.created_at >= $${paramIndex}`;
        queryParams.push(filters.startDate);
        paramIndex++;
      }

      if (filters?.endDate) {
        whereClause += ` AND o.created_at <= $${paramIndex}`;
        queryParams.push(filters.endDate);
        paramIndex++;
      }

      if (filters?.search) {
        whereClause += ` AND (
          o.delivery_address_text ILIKE $${paramIndex} OR
          o.id::text ILIKE $${paramIndex} OR
          EXISTS (
            SELECT 1 FROM orders.order_items oi
            WHERE oi.order_id = o.id
            AND oi.item_name ILIKE $${paramIndex}
          )
        )`;
        queryParams.push(`%${filters.search}%`);
        paramIndex++;
      }

      const result = await dbPool.query(
        `SELECT 
          o.id,
          o.client_id,
          o.business_id,
          o.status,
          o.delivery_address_text,
          o.subtotal,
          o.tax_amount,
          o.delivery_fee,
          o.discount_amount,
          o.tip_amount,
          o.total_amount,
          o.payment_method,
          o.payment_status,
          o.estimated_delivery_time,
          o.actual_delivery_time,
          o.delivery_notes,
          o.created_at,
          o.updated_at,
          o.confirmed_at,
          o.delivered_at,
          o.cancelled_at,
          o.cancellation_reason,
          up.first_name as client_first_name,
          up.last_name as client_last_name,
          up.phone as client_phone,
          (
            SELECT COUNT(*)::integer
            FROM orders.order_items
            WHERE order_id = o.id
          ) as item_count,
          (
            SELECT SUM(quantity)::integer
            FROM orders.order_items
            WHERE order_id = o.id
          ) as total_quantity
        FROM orders.orders o
        LEFT JOIN core.user_profiles up ON o.client_id = up.id
        ${whereClause}
        ORDER BY o.created_at DESC`,
        queryParams
      );

      // Obtener items para cada orden
      const ordersWithItems = await Promise.all(
        result.rows.map(async (order) => {
          // Obtener items del pedido
          const itemsResult = await dbPool.query(
            `SELECT 
              id,
              product_id,
              collection_id,
              item_name,
              item_price,
              quantity,
              variant_selection,
              item_subtotal,
              special_instructions,
              tax_breakdown,
              created_at
            FROM orders.order_items
            WHERE order_id = $1
            ORDER BY created_at ASC`,
            [order.id]
          );

          // Parsear variant_selection y tax_breakdown si vienen como string (JSONB de PostgreSQL)
          const items = itemsResult.rows.map(item => ({
            ...item,
            tax_breakdown: typeof item.tax_breakdown === 'string' 
              ? JSON.parse(item.tax_breakdown) 
              : item.tax_breakdown,
            variant_selection: typeof item.variant_selection === 'string'
              ? JSON.parse(item.variant_selection)
              : item.variant_selection,
          }));

          return {
            ...order,
            items,
          };
        })
      );

      return ordersWithItems;
    } catch (error: any) {
      console.error('❌ Error obteniendo pedidos del negocio:', error);
      throw new ServiceUnavailableException(`Error al obtener pedidos: ${error.message}`);
    }
  }

  /**
   * Obtener detalle de pedido para negocio
   */
  async findOneByBusiness(orderId: string, businessId: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      // Obtener pedido
      const orderResult = await dbPool.query(
        `SELECT 
          o.*,
          (o.delivery_location)[0] as delivery_longitude,
          (o.delivery_location)[1] as delivery_latitude,
          up.first_name as client_first_name,
          up.last_name as client_last_name,
          up.phone as client_phone,
          au.email as client_email
        FROM orders.orders o
        LEFT JOIN core.user_profiles up ON o.client_id = up.id
        LEFT JOIN auth.users au ON o.client_id = au.id
        WHERE o.id = $1 AND o.business_id = $2`,
        [orderId, businessId]
      );

      if (orderResult.rows.length === 0) {
        throw new NotFoundException('Pedido no encontrado');
      }

      const order = orderResult.rows[0];

      // Obtener items del pedido
      const itemsResult = await dbPool.query(
        `SELECT 
          id,
          product_id,
          collection_id,
          item_name,
          item_price,
          quantity,
          variant_selection,
          item_subtotal,
          special_instructions,
          created_at
        FROM orders.order_items
        WHERE order_id = $1
        ORDER BY created_at ASC`,
        [orderId]
      );

      // Obtener información de entrega si existe
      let delivery = null;
      const deliveryResult = await dbPool.query(
        `SELECT 
          d.*,
          r.user_id as repartidor_user_id,
          up.first_name as repartidor_first_name,
          up.last_name as repartidor_last_name,
          up.phone as repartidor_phone
        FROM orders.deliveries d
        LEFT JOIN core.repartidores r ON d.repartidor_id = r.id
        LEFT JOIN core.user_profiles up ON r.user_id = up.id
        WHERE d.order_id = $1`,
        [orderId]
      );

      if (deliveryResult.rows.length > 0) {
        delivery = deliveryResult.rows[0];
      }

      return {
        ...order,
        items: itemsResult.rows,
        delivery,
      };
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('❌ Error obteniendo pedido del negocio:', error);
      throw new ServiceUnavailableException(`Error al obtener pedido: ${error.message}`);
    }
  }

  /**
   * Actualizar estado de pedido (para negocios)
   */
  async updateStatus(orderId: string, businessId: string, newStatus: string, metadata?: {
    estimated_delivery_time?: number;
    cancellation_reason?: string;
  }) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      // Verificar que el pedido existe y pertenece al negocio
      const orderResult = await dbPool.query(
        `SELECT id, status FROM orders.orders WHERE id = $1 AND business_id = $2`,
        [orderId, businessId]
      );

      if (orderResult.rows.length === 0) {
        throw new NotFoundException('Pedido no encontrado');
      }

      const order = orderResult.rows[0];

      // Validar transición de estado
      const validTransitions: { [key: string]: string[] } = {
        'pending': ['confirmed', 'cancelled'],
        'confirmed': ['preparing', 'cancelled'],
        'preparing': ['ready', 'cancelled'],
        'ready': ['assigned', 'cancelled'],
        'assigned': ['picked_up', 'cancelled'],
        'picked_up': ['in_transit', 'cancelled'],
        'in_transit': ['delivered', 'cancelled'],
        'delivered': [],
        'cancelled': [],
        'refunded': [],
      };

      if (!validTransitions[order.status]?.includes(newStatus)) {
        throw new BadRequestException(
          `No se puede cambiar el estado de "${order.status}" a "${newStatus}"`
        );
      }

      // Construir query de actualización
      const updateFields: string[] = ['status = $3', 'updated_at = CURRENT_TIMESTAMP'];
      const updateParams: any[] = [orderId, businessId, newStatus];
      let paramIndex = 4;

      // Actualizar timestamps según el estado
      if (newStatus === 'confirmed') {
        updateFields.push('confirmed_at = CURRENT_TIMESTAMP');
      } else if (newStatus === 'delivered') {
        updateFields.push('delivered_at = CURRENT_TIMESTAMP');
      } else if (newStatus === 'cancelled') {
        updateFields.push('cancelled_at = CURRENT_TIMESTAMP');
        if (metadata?.cancellation_reason) {
          updateFields.push(`cancellation_reason = $${paramIndex}`);
          updateParams.push(metadata.cancellation_reason);
          paramIndex++;
        }
      }

      // Actualizar tiempo estimado de entrega si se proporciona
      if (metadata?.estimated_delivery_time !== undefined) {
        updateFields.push(`estimated_delivery_time = $${paramIndex}`);
        updateParams.push(metadata.estimated_delivery_time);
        paramIndex++;
      }

      const result = await dbPool.query(
        `UPDATE orders.orders 
         SET ${updateFields.join(', ')}
         WHERE id = $1 AND business_id = $2
         RETURNING *`,
        updateParams
      );

      return result.rows[0];
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('❌ Error actualizando estado de pedido:', error);
      throw new ServiceUnavailableException(`Error al actualizar estado: ${error.message}`);
    }
  }
}

