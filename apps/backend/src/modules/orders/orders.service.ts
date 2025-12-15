import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { dbPool } from '../../config/database.config';
import { supabaseAdmin } from '../../config/supabase.config';
import { CheckoutDto } from './dto/checkout.dto';
import { TaxesService } from '../catalog/taxes/taxes.service';
import { WalletService } from '../wallet/wallet.service';
import { KarlopayService } from '../payments/karlopay/karlopay.service';
import { IntegrationsService } from '../settings/integrations.service';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(forwardRef(() => TaxesService))
    private readonly taxesService: TaxesService,
    @Inject(forwardRef(() => WalletService))
    private readonly walletService: WalletService,
    @Inject(forwardRef(() => KarlopayService))
    private readonly karlopayService: KarlopayService,
    private readonly integrationsService: IntegrationsService,
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

      // 2. Obtener items del carrito con información de sucursal
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
          sci.branch_id,
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

      // 3. Agrupar items por sucursal (business_id)
      // Usar branch_id si está disponible, sino usar business_id del producto
      const itemsByBusiness = new Map<string, any[]>();
      
      for (const item of itemsResult.rows) {
        // Determinar la sucursal: usar branch_id si existe, sino business_id del producto
        const businessId = item.branch_id || item.business_id;
        
        if (!itemsByBusiness.has(businessId)) {
          itemsByBusiness.set(businessId, []);
        }
        itemsByBusiness.get(businessId)!.push(item);
      }

      // 4. Generar order_group_id para todas las órdenes relacionadas
      const orderGroupIdResult = await client.query('SELECT gen_random_uuid() as id');
      const orderGroupId = orderGroupIdResult.rows[0].id;

      // 5. Validar dirección (una sola vez, se usa para todas las órdenes)
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

      // 6. Construir texto de dirección
      const addressText = [
        address.street,
        address.street_number,
        address.neighborhood,
        address.city,
        address.state,
        address.postal_code,
        address.country,
      ].filter(Boolean).join(', ');

      // 7. Calcular montos globales (delivery_fee y tip se distribuirán proporcionalmente)
      const globalSubtotal = itemsResult.rows.reduce((sum: number, item: any) => sum + parseFloat(item.item_subtotal), 0);
      const deliveryFee = checkoutDto.deliveryFee || 0; // Usar el costo de envío enviado desde el frontend
      const discountAmount = 0; // Por ahora sin descuentos
      const tipAmount = checkoutDto.tipAmount || 0;

      // 8. Calcular impuestos y tax_breakdowns para todos los items
      const itemTaxBreakdownsMap = new Map<string, any>();
      
      for (const item of itemsResult.rows) {
        try {
          const taxBreakdown = await this.taxesService.calculateProductTaxes(
            item.product_id,
            parseFloat(item.item_subtotal)
          );
          itemTaxBreakdownsMap.set(item.product_id, taxBreakdown);
        } catch (error) {
          // Si hay error calculando impuestos, continuar sin impuestos para ese producto
          console.warn(`⚠️ Error calculando impuestos para producto ${item.product_id}:`, error);
          itemTaxBreakdownsMap.set(item.product_id, { taxes: [], total_tax: 0 });
        }
      }

      // 9. Calcular total global para procesar wallet
      let globalTaxAmount = 0;
      for (const item of itemsResult.rows) {
        const taxBreakdown = itemTaxBreakdownsMap.get(item.product_id) || { taxes: [], total_tax: 0 };
        globalTaxAmount += taxBreakdown.total_tax;
      }
      const totalAmount = globalSubtotal + globalTaxAmount + deliveryFee - discountAmount + tipAmount;

      // 10. Procesar pago con wallet si se especifica
      let walletAmountUsed = 0;
      let walletTransaction: any = null; // Transacción del wallet si se usa
      let paymentMethod = 'cash'; // Por defecto
      let paymentStatus = 'pending'; // Por defecto

      if (checkoutDto.payment) {
        paymentMethod = checkoutDto.payment.method;

        // Si se usa wallet, procesar el débito
        if (checkoutDto.payment.method === 'wallet' && checkoutDto.payment.wallet) {
          const walletAmount = parseFloat(checkoutDto.payment.wallet.amount.toString());

          // Validar que el wallet tenga saldo suficiente
          const canUse = await this.walletService.canUseWallet(userId, walletAmount);
          if (!canUse) {
            const balance = await this.walletService.getBalance(userId);
            throw new BadRequestException(`Saldo insuficiente en el wallet. Saldo disponible: ${balance.toFixed(2)}`);
          }

          // Validar que el monto del wallet no exceda el total
          if (walletAmount > totalAmount) {
            throw new BadRequestException(`El monto del wallet (${walletAmount.toFixed(2)}) no puede exceder el total (${totalAmount.toFixed(2)})`);
          }

          // Debitar del wallet (el order_id se actualizará después de crear las órdenes)
          const walletTransaction = await this.walletService.debitWallet(
            userId,
            {
              amount: walletAmount,
              description: 'Pago de pedido',
              reason: `Pago ${walletAmount >= totalAmount ? 'completo' : 'parcial'} de pedido: ${walletAmount.toFixed(2)} de ${totalAmount.toFixed(2)}`,
              order_id: null, // Se actualizará después de crear las órdenes
            },
            userId, // createdByUserId
            'client' // createdByRole
          );

          walletAmountUsed = walletAmount;
          // Guardar referencia de la transacción del wallet para actualizarla después
          // (se guardará en payment_transactions después de crear las órdenes)

          // Si el wallet cubre todo el monto, el pago está completo
          if (walletAmount >= totalAmount) {
            paymentStatus = 'paid';
          } else if (checkoutDto.payment.secondary_method) {
            // Si hay método secundario, el pago está pendiente hasta que se procese el método secundario
            paymentStatus = 'pending';
          } else {
            // Si no hay método secundario pero el wallet no cubre todo, error
            throw new BadRequestException('El wallet no cubre el total y no se especificó un método de pago secundario');
          }
        } else {
          // Método de pago tradicional (card, cash, transfer)
          // El payment_status se mantiene como 'pending' hasta que se confirme el pago
          paymentStatus = 'pending';
        }
      }

      // 11. Crear una orden por cada sucursal
      const createdOrders: any[] = [];
      const businessSubtotals = new Map<string, number>();

      // Primero, calcular subtotales por sucursal
      for (const [businessId, items] of itemsByBusiness.entries()) {
        const subtotal = items.reduce((sum: number, item: any) => sum + parseFloat(item.item_subtotal), 0);
        businessSubtotals.set(businessId, subtotal);
      }

      // Crear órdenes para cada sucursal
      for (const [businessId, items] of itemsByBusiness.entries()) {
        // Validar que la sucursal existe y está activa
        const businessResult = await client.query(
          `SELECT id, name, location FROM core.businesses WHERE id = $1 AND is_active = TRUE`,
          [businessId]
        );

        if (businessResult.rows.length === 0) {
          throw new NotFoundException(`Sucursal ${businessId} no encontrada o inactiva`);
        }

        const business = businessResult.rows[0];
        const businessSubtotal = businessSubtotals.get(businessId)!;

        // Calcular impuestos para esta sucursal
        let businessTaxAmount = 0;
        for (const item of items) {
          const taxBreakdown = itemTaxBreakdownsMap.get(item.product_id);
          if (taxBreakdown) {
            businessTaxAmount += taxBreakdown.total_tax;
          }
        }
        businessTaxAmount = Math.round(businessTaxAmount * 100) / 100;

        // Distribuir delivery_fee y tip proporcionalmente
        const subtotalRatio = businessSubtotal / globalSubtotal;
        const businessDeliveryFee = Math.round(deliveryFee * subtotalRatio * 100) / 100;
        const businessTipAmount = Math.round(tipAmount * subtotalRatio * 100) / 100;
        const businessTotalAmount = businessSubtotal + businessTaxAmount + businessDeliveryFee + businessTipAmount - discountAmount;

        // Crear la orden
        const orderResult = await client.query(
          `INSERT INTO orders.orders (
            client_id, business_id, status,
            delivery_address_id, delivery_address_text, delivery_location,
            subtotal, tax_amount, delivery_fee, discount_amount, tip_amount, total_amount,
            payment_method, payment_status,
            delivery_notes,
            order_group_id
          ) VALUES ($1, $2, 'pending', $3, $4, ST_MakePoint($5, $6)::point, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          RETURNING *`,
          [
            userId,
            businessId,
            checkoutDto.addressId,
            addressText,
            address.longitude,
            address.latitude,
            businessSubtotal.toFixed(2),
            businessTaxAmount.toFixed(2),
            businessDeliveryFee.toFixed(2),
            discountAmount.toFixed(2),
            businessTipAmount.toFixed(2),
            businessTotalAmount.toFixed(2),
            paymentMethod, // Método de pago (wallet, card, cash, transfer)
            paymentStatus, // Estado de pago (paid si wallet cubre todo, pending si no)
            checkoutDto.deliveryNotes || null,
            orderGroupId, // ⭐ Relacionar con el grupo
          ]
        );

        const order = orderResult.rows[0];
        createdOrders.push(order);

        // Crear order_items para esta orden
        for (const item of items) {
          const taxBreakdown = itemTaxBreakdownsMap.get(item.product_id) || { taxes: [], total_tax: 0 };
          
          await client.query(
            `INSERT INTO orders.order_items (
              order_id, product_id, item_name, item_price,
              quantity, original_quantity, variant_selection, item_subtotal, special_instructions, tax_breakdown
            ) VALUES ($1, $2, $3, $4, $5, $5, $6, $7, $8, $9)`,
            [
              order.id,
              item.product_id,
              item.product_name,
              item.unit_price,
              item.quantity, // quantity y original_quantity son iguales al crear el pedido
              item.variant_selections ? JSON.stringify(item.variant_selections) : null,
              item.item_subtotal,
              item.special_instructions || null,
              JSON.stringify(taxBreakdown),
            ]
          );
        }
      }

      // 12. Actualizar transacciones de wallet con order_id (si se usó wallet)
      if (walletAmountUsed > 0 && createdOrders.length > 0) {
        // Actualizar la última transacción de débito con el order_id del primer pedido
        // (en el futuro se podría distribuir proporcionalmente entre múltiples órdenes)
        const primaryOrderId = createdOrders[0].id;
        // Usar subconsulta para obtener el ID de la transacción más reciente y luego actualizarla
        await client.query(
          `UPDATE commerce.wallet_transactions
           SET order_id = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = (
             SELECT id FROM commerce.wallet_transactions
             WHERE user_id = $2 
               AND transaction_type = 'debit'
               AND order_id IS NULL
               AND amount = $3
               AND created_at > NOW() - INTERVAL '1 minute'
             ORDER BY created_at DESC
             LIMIT 1
           )`,
          [primaryOrderId, userId, walletAmountUsed.toFixed(2)]
        );
      }

      // 13. Limpiar carrito
      await client.query(
        `DELETE FROM orders.shopping_cart_items WHERE cart_id = $1`,
        [cart.id]
      );
      await client.query(
        `DELETE FROM orders.shopping_cart WHERE id = $1`,
        [cart.id]
      );

      await client.query('COMMIT');

      // 13.5. Guardar transacciones de pago del wallet en payment_transactions
      if (walletAmountUsed > 0 && walletTransaction && createdOrders.length > 0) {
        // Distribuir el monto del wallet proporcionalmente entre las órdenes creadas
        const totalOrderAmount = createdOrders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0);
        
        for (const order of createdOrders) {
          const orderRatio = parseFloat(order.total_amount) / totalOrderAmount;
          const walletAmountForOrder = Math.round(walletAmountUsed * orderRatio * 100) / 100;
          
          // Guardar transacción del wallet en payment_transactions
          await dbPool.query(
            `INSERT INTO orders.payment_transactions (
              order_id,
              payment_method,
              transaction_id,
              amount,
              status,
              payment_data,
              completed_at
            ) VALUES ($1, 'wallet', $2, $3, 'completed', $4, CURRENT_TIMESTAMP)`,
            [
              order.id,
              walletTransaction.id,
              walletAmountForOrder,
              JSON.stringify({
                wallet_transaction_id: walletTransaction.id,
                balance_before: walletTransaction.balance_before,
                balance_after: walletTransaction.balance_after,
                description: walletTransaction.description,
                reason: walletTransaction.reason,
              }),
            ]
          );
        }
        console.log(`✅ Transacciones de wallet guardadas en payment_transactions para ${createdOrders.length} órdenes`);
      }

      // 13.6. Si todas las transacciones están completadas (solo wallet, sin KarloPay pendiente), actualizar payment_status a 'paid'
      // Esto solo aplica si NO hay método secundario o si el método secundario no es KarloPay
      if (walletAmountUsed > 0 && walletTransaction && createdOrders.length > 0) {
        const hasSecondaryKarlopay = checkoutDto.payment?.secondary_method === 'karlopay';
        
        // Si no hay KarloPay pendiente, todas las transacciones están completadas
        if (!hasSecondaryKarlopay && paymentMethod !== 'karlopay') {
          for (const order of createdOrders) {
            await dbPool.query(
              `UPDATE orders.orders 
               SET payment_status = 'paid', 
                   updated_at = CURRENT_TIMESTAMP 
               WHERE id = $1`,
              [order.id]
            );
          }
          console.log(`✅ Payment status actualizado a 'paid' para ${createdOrders.length} órdenes (todas las transacciones completadas)`);
        }
      }

      // 14. Crear orden en Karlopay si el método de pago es karlopay o si hay método secundario karlopay (después del COMMIT)
      let karlopayPaymentUrl: string | null = null;
      const needsKarlopay = paymentMethod === 'karlopay' || checkoutDto.payment?.secondary_method === 'karlopay';
      if (needsKarlopay && createdOrders.length > 0) {
        try {
          // Obtener información del usuario desde user_profiles y auth.users
          const userProfileResult = await dbPool.query(
            `SELECT up.first_name, up.last_name, up.phone
             FROM core.user_profiles up
             WHERE up.id = $1`,
            [userId]
          );

          const userProfile = userProfileResult.rows[0] || {};
          const userName = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'Cliente';
          const userPhone = userProfile.phone || '';

          // Obtener email desde Supabase Auth
          let userEmail = '';
          if (supabaseAdmin) {
            try {
              const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
              userEmail = authUser?.user?.email || '';
            } catch (error) {
              console.warn('No se pudo obtener email desde auth.users:', error);
            }
          }

          // Obtener información del receptor de la dirección
          const addressReceiverResult = await dbPool.query(
            `SELECT receiver_name, receiver_phone
             FROM core.addresses
             WHERE id = $1 AND user_id = $2`,
            [checkoutDto.addressId, userId]
          );
          const receiverInfo = addressReceiverResult.rows[0] || {};
          const receiverName = receiverInfo.receiver_name || userName;
          const receiverPhone = receiverInfo.receiver_phone || userPhone;

          // Construir operaciones desde los items del carrito
          const operations = itemsResult.rows.map((item: any) => ({
            description: item.product_name,
            quantity: item.quantity,
            price: parseFloat(item.item_subtotal),
          }));

          // Crear número de orden único (usar orderGroupId como base)
          const numberOfOrder = `AGORA_${orderGroupId.replace(/-/g, '').substring(0, 20).toUpperCase()}`;

          // Construir URL de redirección después del pago usando la configuración de Karlopay
          // Esta URL se obtiene de la configuración en la base de datos (dev/prod)
          const storeContext = checkoutDto.storeContext || ''; // Ruta de tienda (ej: /grupo/toyota-group o /sucursal/toyota-satelite)
          const redirectUrl = await this.integrationsService.buildKarlopayRedirectUrl({
            sessionId: numberOfOrder,
            storePath: storeContext,
          });
          
          console.log(`🔗 Redirect URL para Karlopay (desde configuración): ${redirectUrl}`);
          console.log(`📦 Contexto de tienda: ${storeContext || '(global)'}`);

          // Determinar el monto a cobrar en Karlopay
          // Si hay método secundario, usar el monto secundario; si no, usar el total
          const karlopayAmount = checkoutDto.payment?.secondary_method === 'karlopay' && checkoutDto.payment?.secondary_amount
            ? checkoutDto.payment.secondary_amount
            : totalAmount;

          // Crear orden en Karlopay
          const karlopayOrder = await this.karlopayService.createOrUpdateOrder({
            businessArea: 'ventas',
            numberOfOrder,
            status: 'R', // Remission
            total: karlopayAmount,
            customer: {
              foreignId: userId,
              fullName: receiverName,
              phoneNumber: receiverPhone,
              email: userEmail,
              invoiceProfile: null,
            },
            operations,
            product: null,
            redirectUrl,
            additional: {
              session_id: numberOfOrder,
              order_group_id: orderGroupId,
            },
          });

          karlopayPaymentUrl = karlopayOrder.urlPayment;
          
          // Obtener el numberOfOrder que devuelve Karlopay (puede ser diferente al que enviamos)
          const karlopayNumberOfOrder = karlopayOrder.numberOfOrder || numberOfOrder;
          
          console.log(`💰 [CHECKOUT] Karlopay devolvió numberOfOrder:`, {
            sent: numberOfOrder,
            received: karlopayNumberOfOrder,
            match: numberOfOrder === karlopayNumberOfOrder,
          });

          // Guardar la URL de pago y número de orden de Karlopay en la primera orden
          // Guardar tanto el que enviamos como el que recibimos
          await dbPool.query(
            `UPDATE orders.orders
             SET delivery_notes = COALESCE(delivery_notes, '') || E'\nKarlopay Order (sent): ' || $1 || E'\nKarlopay Order (received): ' || $2 || E'\nKarlopay Payment URL: ' || $3
             WHERE id = $4`,
            [numberOfOrder, karlopayNumberOfOrder, karlopayPaymentUrl, createdOrders[0].id]
          );

          // Guardar transacción de KarloPay en payment_transactions para todas las órdenes del grupo
          // Distribuir el monto de KarloPay proporcionalmente entre las órdenes
          console.log(`💰 [CHECKOUT] Guardando transacciones de KarloPay:`, {
            numberOfOrderSent: numberOfOrder,
            numberOfOrderReceived: karlopayNumberOfOrder,
            karlopayAmount,
            ordersCount: createdOrders.length,
          });
          
          const totalOrderAmount = createdOrders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0);
          
          for (const order of createdOrders) {
            const orderRatio = parseFloat(order.total_amount) / totalOrderAmount;
            const karlopayAmountForOrder = Math.round(karlopayAmount * orderRatio * 100) / 100;
            
            console.log(`💰 [CHECKOUT] Guardando transacción KarloPay para orden ${order.id}:`, {
              orderId: order.id,
              amount: karlopayAmountForOrder,
              numberOfOrderSent: numberOfOrder,
              numberOfOrderReceived: karlopayNumberOfOrder,
            });
            
            // Para pagos con tarjeta (pasarela automática), el pago se procesa inmediatamente
            // Por lo tanto, marcamos la transacción como 'completed' desde el inicio
            // El webhook solo actualizará información adicional (últimos 4 dígitos, etc.)
            const karlopayTransactionStatus = 'completed';
            const karlopayCompletedAt = new Date();
            
            const insertResult = await dbPool.query(
              `INSERT INTO orders.payment_transactions (
                order_id,
                payment_method,
                transaction_id,
                external_reference,
                amount,
                status,
                payment_data,
                completed_at
              ) VALUES ($1, 'karlopay', $2, $3, $4, $5, $6, $7)
              RETURNING id`,
              [
                order.id,
                karlopayNumberOfOrder, // Usar el numberOfOrder que devuelve Karlopay como transaction_id
                karlopayNumberOfOrder, // Usar el numberOfOrder que devuelve Karlopay como external_reference (este es el que vendrá en el webhook)
                karlopayAmountForOrder,
                karlopayTransactionStatus, // 'completed' porque el pago con tarjeta se procesa automáticamente
                JSON.stringify({
                  karlopay_order_id: karlopayOrder.id,
                  karlopay_number_of_order: karlopayNumberOfOrder,
                  karlopay_number_of_order_sent: numberOfOrder, // Guardar también el que enviamos por si acaso
                  karlopay_payment_url: karlopayPaymentUrl,
                  order_group_id: orderGroupId,
                  auto_completed: true, // Indicar que se completó automáticamente al crear
                }),
                karlopayCompletedAt,
              ]
            );
            
            console.log(`✅ [CHECKOUT] Transacción KarloPay guardada como 'completed':`, insertResult.rows[0].id);
          }
          
          // Verificar si todas las transacciones están completadas y actualizar payment_status
          // Esto aplica tanto para pagos solo con Karlopay como para wallet + Karlopay
          for (const order of createdOrders) {
            const allTransactionsResult = await dbPool.query(
              `SELECT COUNT(*) as total, 
                      COUNT(*) FILTER (WHERE status = 'completed') as completed,
                      SUM(amount) FILTER (WHERE status = 'completed') as total_completed_amount
               FROM orders.payment_transactions
               WHERE order_id = $1`,
              [order.id]
            );

            const { total, completed, total_completed_amount } = allTransactionsResult.rows[0];
            const totalCompleted = parseFloat(total_completed_amount || '0');
            const orderTotal = parseFloat(order.total_amount || '0');
            
            // Si todas las transacciones están completadas Y el monto coincide, marcar la orden como pagada
            if (parseInt(total) > 0 && parseInt(completed) === parseInt(total)) {
              if (totalCompleted >= orderTotal - 0.01) { // Tolerancia de centavos
                await dbPool.query(
                  `UPDATE orders.orders
                   SET payment_status = 'paid',
                       updated_at = CURRENT_TIMESTAMP
                   WHERE id = $1`,
                  [order.id]
                );
                console.log(`✅ [CHECKOUT] Orden ${order.id} marcada como 'paid' (todas las transacciones completadas)`);
              } else {
                console.warn(`⚠️ [CHECKOUT] Orden ${order.id} no marcada como 'paid': monto completado (${totalCompleted}) < total orden (${orderTotal})`);
              }
            }
          }

          console.log(`✅ Orden creada en KarloPay: ${numberOfOrder}, URL de pago: ${karlopayPaymentUrl}`);
          console.log(`✅ Transacciones de KarloPay guardadas en payment_transactions para ${createdOrders.length} órdenes`);
        } catch (karlopayError: any) {
          console.error('❌ Error creando orden en Karlopay:', karlopayError);
          // No fallar el checkout si hay error con Karlopay, solo loguear
          // El pedido ya está creado en la base de datos
        }
      }

      // 15. Obtener todas las órdenes creadas con sus items
      // Retornar la primera orden como principal (para compatibilidad con código existente)
      // pero incluir información del grupo
      const primaryOrder = await this.findOne(createdOrders[0].id, userId);
      
      // Agregar información del grupo a la respuesta
      const response: any = {
        ...primaryOrder,
        order_group_id: orderGroupId,
        related_orders_count: createdOrders.length,
        related_orders: createdOrders.map(o => ({ id: o.id, business_id: o.business_id, total_amount: o.total_amount })),
      };

      // Si se creó orden en Karlopay, agregar URL de pago
      if (karlopayPaymentUrl) {
        response.karlopay_payment_url = karlopayPaymentUrl;
      }

      return response;
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
   * Listar pedidos de un cliente (para admin)
   */
  async findAllByClient(clientId: string, businessId?: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      let businessIds: string[] = [];
      
      // Si se proporciona businessId, obtener todas las sucursales del grupo
      if (businessId) {
        try {
          // Obtener el grupo de la sucursal
          const businessResult = await dbPool.query(
            `SELECT group_id FROM core.businesses WHERE id = $1`,
            [businessId]
          );
          
          if (businessResult.rows.length > 0 && businessResult.rows[0].group_id) {
            const groupId = businessResult.rows[0].group_id;
            // Obtener todas las sucursales del grupo
            const groupBusinessesResult = await dbPool.query(
              `SELECT id FROM core.businesses WHERE group_id = $1`,
              [groupId]
            );
            businessIds = groupBusinessesResult.rows.map(row => row.id);
          } else {
            // Si no tiene grupo, solo usar el business_id proporcionado
            businessIds = [businessId];
          }
        } catch (error) {
          console.warn('Error obteniendo grupo de sucursal, usando solo business_id:', error);
          businessIds = [businessId];
        }
      }

      // Construir la consulta con filtro opcional
      let query = `SELECT 
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
          b.logo_url as business_logo_url,
          up.first_name as client_first_name,
          up.last_name as client_last_name,
          up.phone as client_phone,
          au.email as client_email,
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
        INNER JOIN core.businesses b ON o.business_id = b.id
        LEFT JOIN core.user_profiles up ON o.client_id = up.id
        LEFT JOIN auth.users au ON up.id = au.id
        WHERE o.client_id = $1`;
      
      const params: any[] = [clientId];
      
      // Si hay businessIds, agregar filtro
      if (businessIds.length > 0) {
        query += ` AND o.business_id = ANY($2)`;
        params.push(businessIds);
      }
      
      query += ` ORDER BY o.created_at DESC`;
      
      const result = await dbPool.query(query, params);

      return result.rows;
    } catch (error: any) {
      console.error('❌ Error obteniendo pedidos del cliente:', error);
      throw new ServiceUnavailableException(`Error al obtener pedidos del cliente: ${error.message}`);
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
          b.logo_url as business_logo_url,
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
        INNER JOIN core.businesses b ON o.business_id = b.id
        WHERE o.client_id = $1
        ORDER BY o.created_at DESC`,
        [userId]
      );

      console.log('📦 Pedidos encontrados en BD:', result.rows.length);
      if (result.rows.length > 0) {
        console.log('📦 Primer pedido (ejemplo):', {
          id: result.rows[0].id,
          item_count: result.rows[0].item_count,
          total_quantity: result.rows[0].total_quantity,
          status: result.rows[0].status,
        });
      }
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

      // Obtener items del pedido con imagen del producto
      const itemsResult = await dbPool.query(
        `SELECT 
          oi.id,
          oi.product_id,
          oi.item_name,
          oi.item_price,
          oi.quantity,
          oi.variant_selection,
          oi.item_subtotal,
          oi.special_instructions,
          oi.tax_breakdown,
          oi.created_at,
          -- Obtener la imagen principal del producto
          (
            SELECT pi.file_path
            FROM catalog.product_images pi
            WHERE pi.product_id = oi.product_id
            AND pi.is_active = TRUE
            ORDER BY pi.is_primary DESC, pi.display_order ASC
            LIMIT 1
          ) as product_image_path
        FROM orders.order_items oi
        WHERE oi.order_id = $1
        ORDER BY oi.created_at ASC`,
        [orderId]
      );

      // Parsear tax_breakdown si viene como string (JSONB de PostgreSQL)
      // Y generar URLs públicas de las imágenes
      const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET_PRODUCTS || 'products';
      const items = itemsResult.rows.map(item => {
        let product_image_url = null;
        if (item.product_image_path && supabaseAdmin) {
          try {
            // Normalizar el path por si contiene una URL completa
            const { normalizeStoragePath } = require('../../utils/storage.utils');
            const normalizedPath = normalizeStoragePath(item.product_image_path);
            if (normalizedPath) {
              const { data: urlData } = supabaseAdmin.storage
                .from(BUCKET_NAME)
                .getPublicUrl(normalizedPath);
              product_image_url = urlData.publicUrl;
            }
          } catch (error) {
            console.error('Error generando URL de imagen del producto:', error);
          }
        }

        return {
          ...item,
          tax_breakdown: typeof item.tax_breakdown === 'string' 
            ? JSON.parse(item.tax_breakdown) 
            : item.tax_breakdown,
          variant_selection: typeof item.variant_selection === 'string'
            ? JSON.parse(item.variant_selection)
            : item.variant_selection,
          product_image_url,
        };
      });

      // Obtener transacciones de pago para esta orden
      const paymentTransactionsResult = await dbPool.query(
        `SELECT 
          pt.*,
          pt.payment_data->>'cardType' as card_type,
          pt.payment_data->>'lastFour' as last_four,
          pt.payment_data->>'referenceNumber' as reference_number
        FROM orders.payment_transactions pt
        WHERE pt.order_id = $1
        ORDER BY pt.created_at ASC`,
        [orderId]
      );

      // Parsear payment_data si viene como string (JSONB de PostgreSQL)
      const paymentTransactions = paymentTransactionsResult.rows.map(transaction => ({
        ...transaction,
        payment_data: typeof transaction.payment_data === 'string' 
          ? JSON.parse(transaction.payment_data) 
          : transaction.payment_data,
      }));

      // Obtener guía de envío (shipping label) si existe
      let shippingLabel = null;
      try {
        const shippingLabelResult = await dbPool.query(
          `SELECT tracking_number, carrier_name, status, generated_at, picked_up_at, in_transit_at, delivered_at
           FROM orders.shipping_labels
           WHERE order_id = $1
           ORDER BY created_at DESC
           LIMIT 1`,
          [orderId]
        );
        
        if (shippingLabelResult.rows.length > 0) {
          shippingLabel = shippingLabelResult.rows[0];
        }
      } catch (shippingError: any) {
        // Si la tabla no existe o hay error, simplemente no incluir shipping_label
        console.warn('No se pudo obtener shipping label:', shippingError.message || shippingError);
      }

      return {
        ...order,
        items,
        payment_transactions: paymentTransactions,
        shipping_label: shippingLabel, // Guía de envío si existe
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
   * Obtener perfil de usuario
   */
  async getUserProfile(userId: string) {
    if (!dbPool) {
      return null;
    }

    try {
      const result = await dbPool.query(
        `SELECT role FROM core.user_profiles WHERE id = $1`,
        [userId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error obteniendo perfil de usuario:', error);
      return null;
    }
  }

  /**
   * Actualizar estado de pago (modo prueba)
   */
  async updatePaymentStatus(
    orderId: string,
    businessId: string,
    newPaymentStatus: string,
    metadata?: {
      changed_by_user_id?: string;
      changed_by_role?: string;
    }
  ) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const client = await dbPool.connect();
    
    try {
      await client.query('BEGIN');

      // Verificar que el pedido existe y pertenece al negocio
      const orderResult = await client.query(
        `SELECT id, payment_status FROM orders.orders WHERE id = $1 AND business_id = $2`,
        [orderId, businessId]
      );

      if (orderResult.rows.length === 0) {
        throw new NotFoundException('Pedido no encontrado');
      }

      const order = orderResult.rows[0];
      const currentPaymentStatus = order.payment_status;

      // Validar estados de pago permitidos
      const validPaymentStatuses = ['pending', 'paid', 'failed', 'refund_pending', 'refunded', 'partially_refunded'];
      if (!validPaymentStatuses.includes(newPaymentStatus)) {
        throw new BadRequestException(`Estado de pago inválido: ${newPaymentStatus}`);
      }

      // Actualizar estado de pago - SIMPLE Y DIRECTO
      const result = await client.query(
        `UPDATE orders.orders 
         SET payment_status = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND business_id = $2
         RETURNING *`,
        [orderId, businessId, newPaymentStatus]
      );

      if (result.rowCount === 0) {
        throw new Error('No se pudo actualizar el estado de pago');
      }

      const updatedOrder = result.rows[0];

      // Hacer COMMIT PRIMERO para asegurar que el cambio persista
      await client.query('COMMIT');
      
      // Registrar cambio en historial DESPUÉS del COMMIT (no crítico)
      // Usar una nueva conexión para no afectar la transacción principal
      try {
        const historyClient = await dbPool.connect();
        try {
          await historyClient.query(
            `INSERT INTO orders.order_status_history (
              order_id, previous_status, new_status, 
              changed_by_user_id, changed_by_role, change_reason
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              orderId,
              `payment_${currentPaymentStatus}`,
              `payment_${newPaymentStatus}`,
              metadata?.changed_by_user_id || null,
              metadata?.changed_by_role || null,
              metadata?.changed_by_user_id 
                ? `Cambio manual de estado de pago: ${currentPaymentStatus} → ${newPaymentStatus}`
                : `Cambio automático de estado de pago (pasarela): ${currentPaymentStatus} → ${newPaymentStatus}`
            ]
          );
        } finally {
          historyClient.release();
        }
      } catch (historyError) {
        // No crítico, solo loguear - el pago ya se actualizó
        console.warn('⚠️ No se pudo registrar en historial:', historyError);
      }
      
      return updatedOrder;
    } catch (error: any) {
      await client.query('ROLLBACK');
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('❌ Error actualizando estado de pago:', error);
      throw new ServiceUnavailableException(`Error al actualizar estado de pago: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Cancelar pedido (para clientes)
   */
  async cancel(orderId: string, userId: string, reason?: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const client = await dbPool.connect();
    
    try {
      await client.query('BEGIN');

      // Verificar que el pedido existe y pertenece al usuario
      const orderResult = await client.query(
        `SELECT id, status, payment_status, business_id FROM orders.orders WHERE id = $1 AND client_id = $2`,
        [orderId, userId]
      );

      if (orderResult.rows.length === 0) {
        throw new NotFoundException('Pedido no encontrado');
      }

      const order = orderResult.rows[0];

      // Validar que se puede cancelar según reglas de negocio
      // Cliente solo puede cancelar si está pending o confirmed
      if (!['pending', 'confirmed'].includes(order.status)) {
        throw new BadRequestException(
          `El pedido no se puede cancelar en su estado actual (${order.status}). Solo se puede cancelar cuando está pendiente o confirmado.`
        );
      }

      const currentStatus = order.status;

      // Actualizar pedido
      const updateFields = [
        'status = $1',
        'cancelled_at = CURRENT_TIMESTAMP',
        'updated_at = CURRENT_TIMESTAMP',
        'cancellation_reason = $2'
      ];
      const updateParams: any[] = ['cancelled', reason || null];

      // Si el pago ya fue procesado, cambiar payment_status
      if (order.payment_status === 'paid') {
        updateFields.push('payment_status = $3');
        updateParams.push('refund_pending');
      }

      const result = await client.query(
        `UPDATE orders.orders 
         SET ${updateFields.join(', ')}
         WHERE id = $4 AND client_id = $5
         RETURNING *`,
        [...updateParams, orderId, userId]
      );

      const cancelledOrder = result.rows[0];

      // Registrar en historial de estados
      try {
        const userProfile = await this.getUserProfile(userId);
        await client.query(
          `INSERT INTO orders.order_status_history (
            order_id, previous_status, new_status, 
            changed_by_user_id, changed_by_role, change_reason
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            orderId,
            currentStatus,
            'cancelled',
            userId,
            userProfile?.role || 'client',
            reason || null
          ]
        );
      } catch (historyError) {
        console.warn('⚠️ No se pudo registrar en historial:', historyError);
      }

      await client.query('COMMIT');
      return cancelledOrder;
    } catch (error: any) {
      await client.query('ROLLBACK');
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('❌ Error cancelando pedido:', error);
      throw new ServiceUnavailableException(`Error al cancelar pedido: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Actualizar estado de entrega (para repartidores)
   */
  async updateDeliveryStatus(orderId: string, repartidorId: string, newStatus: 'picked_up' | 'in_transit' | 'delivered') {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const client = await dbPool.connect();
    
    try {
      await client.query('BEGIN');

      // Verificar que el pedido existe y está asignado a este repartidor
      const deliveryResult = await client.query(
        `SELECT 
          d.order_id,
          d.repartidor_id,
          o.status,
          o.business_id,
          o.payment_status
        FROM orders.deliveries d
        INNER JOIN orders.orders o ON d.order_id = o.id
        WHERE d.order_id = $1 AND d.repartidor_id = $2`,
        [orderId, repartidorId]
      );

      if (deliveryResult.rows.length === 0) {
        throw new NotFoundException('Pedido no encontrado o no asignado a este repartidor');
      }

      const delivery = deliveryResult.rows[0];
      const currentStatus = delivery.status;

      // Validar transiciones permitidas para repartidores
      const validTransitions: { [key: string]: string[] } = {
        'assigned': ['picked_up'],
        'picked_up': ['in_transit'],
        'in_transit': ['delivered'],
      };

      if (!validTransitions[currentStatus]?.includes(newStatus)) {
        throw new BadRequestException(
          `No se puede cambiar el estado de entrega de "${currentStatus}" a "${newStatus}"`
        );
      }

      // Actualizar estado de entrega
      await client.query(
        `UPDATE orders.deliveries 
         SET status = $1, updated_at = CURRENT_TIMESTAMP
         WHERE order_id = $2 AND repartidor_id = $3`,
        [newStatus, orderId, repartidorId]
      );

      // Actualizar estado del pedido y timestamps
      const orderUpdateFields: string[] = ['updated_at = CURRENT_TIMESTAMP'];
      const orderUpdateParams: any[] = [orderId];
      let paramIndex = 2;

      if (newStatus === 'picked_up') {
        orderUpdateFields.push('status = $' + paramIndex);
        orderUpdateParams.push('picked_up');
        paramIndex++;
        orderUpdateFields.push('picked_up_at = CURRENT_TIMESTAMP');
      } else if (newStatus === 'in_transit') {
        orderUpdateFields.push('status = $' + paramIndex);
        orderUpdateParams.push('in_transit');
        paramIndex++;
        orderUpdateFields.push('in_transit_at = CURRENT_TIMESTAMP');
      } else if (newStatus === 'delivered') {
        orderUpdateFields.push('status = $' + paramIndex);
        orderUpdateParams.push('delivered');
        paramIndex++;
        orderUpdateFields.push('delivered_at = CURRENT_TIMESTAMP');
        // Calcular tiempo real de entrega
        const timeResult = await client.query(
          `SELECT EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at)) / 60 as minutes
           FROM orders.orders WHERE id = $1`,
          [orderId]
        );
        if (timeResult.rows[0]?.minutes) {
          orderUpdateFields.push(`actual_delivery_time = $${paramIndex}`);
          orderUpdateParams.push(Math.round(timeResult.rows[0].minutes));
          paramIndex++;
        }
      }

      const orderResult = await client.query(
        `UPDATE orders.orders 
         SET ${orderUpdateFields.join(', ')}
         WHERE id = $1
         RETURNING *`,
        orderUpdateParams
      );

      const updatedOrder = orderResult.rows[0];

      // Registrar en historial de estados
      try {
        const userProfile = await this.getUserProfile(repartidorId);
        await client.query(
          `INSERT INTO orders.order_status_history (
            order_id, previous_status, new_status, 
            changed_by_user_id, changed_by_role
          ) VALUES ($1, $2, $3, $4, $5)`,
          [
            orderId,
            delivery.status,
            newStatus,
            repartidorId,
            userProfile?.role || 'repartidor'
          ]
        );
      } catch (historyError) {
        console.warn('⚠️ No se pudo registrar en historial:', historyError);
      }

      await client.query('COMMIT');
      return updatedOrder;
    } catch (error: any) {
      await client.query('ROLLBACK');
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('❌ Error actualizando estado de entrega:', error);
      throw new ServiceUnavailableException(`Error al actualizar estado de entrega: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * ⚠️ TEMPORAL: Eliminar pedido físicamente de la base de datos
   * Este método es temporal y debe ser removido en producción
   */
  async deleteOrder(orderId: string, businessId: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const client = await dbPool.connect();
    
    try {
      await client.query('BEGIN');

      // Verificar que el pedido existe y pertenece al negocio
      const orderResult = await client.query(
        `SELECT id FROM orders.orders WHERE id = $1 AND business_id = $2`,
        [orderId, businessId]
      );

      if (orderResult.rows.length === 0) {
        throw new NotFoundException('Pedido no encontrado');
      }

      // Eliminar order_items primero (CASCADE debería hacerlo, pero por seguridad)
      await client.query(
        `DELETE FROM orders.order_items WHERE order_id = $1`,
        [orderId]
      );

      // Eliminar deliveries relacionados
      await client.query(
        `DELETE FROM orders.deliveries WHERE order_id = $1`,
        [orderId]
      );

      // Eliminar la orden
      await client.query(
        `DELETE FROM orders.orders WHERE id = $1`,
        [orderId]
      );

      await client.query('COMMIT');

      return { success: true, message: 'Pedido eliminado exitosamente' };
    } catch (error: any) {
      await client.query('ROLLBACK');
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('❌ Error eliminando pedido:', error);
      throw new ServiceUnavailableException(`Error al eliminar pedido: ${error.message}`);
    } finally {
      client.release();
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

          // Obtener información del último cambio de payment_status desde el historial
          let paymentStatusChangeInfo = null;
          try {
            const paymentHistoryResult = await dbPool.query(
              `SELECT 
                osh.previous_status,
                osh.new_status,
                osh.created_at as changed_at,
                osh.changed_by_user_id,
                osh.changed_by_role,
                osh.change_reason,
                up.first_name,
                up.last_name,
                au.email
              FROM orders.order_status_history osh
              LEFT JOIN core.user_profiles up ON osh.changed_by_user_id = up.id
              LEFT JOIN auth.users au ON osh.changed_by_user_id = au.id
              WHERE osh.order_id = $1 
                AND osh.new_status LIKE 'payment_%'
                AND osh.new_status = $2
              ORDER BY osh.created_at DESC
              LIMIT 1`,
              [order.id, `payment_${order.payment_status}`]
            );

            if (paymentHistoryResult.rows.length > 0) {
              const history = paymentHistoryResult.rows[0];
              paymentStatusChangeInfo = {
                changed_at: history.changed_at,
                changed_by_user_id: history.changed_by_user_id,
                changed_by_role: history.changed_by_role,
                changed_by_name: history.first_name && history.last_name 
                  ? `${history.first_name} ${history.last_name}` 
                  : history.email || 'Sistema',
                change_reason: history.change_reason,
                is_automatic: history.change_reason?.includes('pasarela') || 
                             history.change_reason?.includes('automático') ||
                             history.change_reason?.includes('webhook') ||
                             !history.changed_by_user_id,
              };
            }
          } catch (historyError: any) {
            // La tabla order_status_history puede no existir, solo loguear si es otro error
            if (historyError?.code === '42P01') {
              // Tabla no existe, ignorar silenciosamente
              // console.warn(`Tabla order_status_history no existe, ignorando historial para orden ${order.id}`);
            } else {
              console.warn(`No se pudo obtener historial de payment_status para orden ${order.id}:`, historyError.message || historyError);
            }
          }

          // Obtener transacciones de pago para esta orden
          const paymentTransactionsResult = await dbPool.query(
            `SELECT 
              pt.*,
              pt.payment_data->>'cardType' as card_type,
              pt.payment_data->>'lastFour' as last_four,
              pt.payment_data->>'referenceNumber' as reference_number
            FROM orders.payment_transactions pt
            WHERE pt.order_id = $1
            ORDER BY pt.created_at ASC`,
            [order.id]
          );

          return {
            ...order,
            items,
            payment_status_change_info: paymentStatusChangeInfo,
            payment_transactions: paymentTransactionsResult.rows,
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
      console.log('🔵 [FIND ONE BY BUSINESS] Buscando pedido:', {
        orderId,
        businessId,
      });
      
      // Primero verificar si el pedido existe (sin filtro de business_id)
      const orderExistsCheck = await dbPool.query(
        `SELECT id, business_id, status, payment_status 
         FROM orders.orders 
         WHERE id = $1`,
        [orderId]
      );
      
      console.log('🔵 [FIND ONE BY BUSINESS] Pedido encontrado (sin filtro business_id):', {
        found: orderExistsCheck.rows.length > 0,
        order: orderExistsCheck.rows[0] || null,
      });
      
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

      console.log('🔵 [FIND ONE BY BUSINESS] Resultado con filtro business_id:', {
        found: orderResult.rows.length > 0,
        order: orderResult.rows[0] || null,
      });

      if (orderResult.rows.length === 0) {
        // Si el pedido existe pero no pertenece al business_id, dar más información
        if (orderExistsCheck.rows.length > 0) {
          const actualOrder = orderExistsCheck.rows[0];
          console.error('❌ [FIND ONE BY BUSINESS] Pedido existe pero no pertenece al negocio:', {
            orderId,
            requestedBusinessId: businessId,
            actualBusinessId: actualOrder.business_id,
            match: actualOrder.business_id === businessId,
          });
          throw new NotFoundException(
            `Pedido no encontrado o no pertenece al negocio especificado. Pedido pertenece a: ${actualOrder.business_id}`
          );
        }
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
          COALESCE(original_quantity, quantity) as original_quantity,
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

      // Obtener información del último cambio de payment_status desde el historial
      let paymentStatusChangeInfo = null;
      try {
        const paymentHistoryResult = await dbPool.query(
          `SELECT 
            osh.previous_status,
            osh.new_status,
            osh.created_at as changed_at,
            osh.changed_by_user_id,
            osh.changed_by_role,
            osh.change_reason,
            up.first_name,
            up.last_name,
            au.email
          FROM orders.order_status_history osh
          LEFT JOIN core.user_profiles up ON osh.changed_by_user_id = up.id
          LEFT JOIN auth.users au ON osh.changed_by_user_id = au.id
          WHERE osh.order_id = $1 
            AND osh.new_status LIKE 'payment_%'
            AND osh.new_status = $2
          ORDER BY osh.created_at DESC
          LIMIT 1`,
          [orderId, `payment_${order.payment_status}`]
        );

        if (paymentHistoryResult.rows.length > 0) {
          const history = paymentHistoryResult.rows[0];
          paymentStatusChangeInfo = {
            changed_at: history.changed_at,
            changed_by_user_id: history.changed_by_user_id,
            changed_by_role: history.changed_by_role,
            changed_by_name: history.first_name && history.last_name 
              ? `${history.first_name} ${history.last_name}` 
              : history.email || 'Sistema',
            change_reason: history.change_reason,
            is_automatic: history.change_reason?.includes('pasarela') || 
                         history.change_reason?.includes('automático') ||
                         history.change_reason?.includes('webhook') ||
                         !history.changed_by_user_id,
          };
        }
      } catch (historyError: any) {
        // La tabla order_status_history puede no existir, solo loguear si es otro error
        if (historyError?.code === '42P01') {
          // Tabla no existe, ignorar silenciosamente
          // console.warn('Tabla order_status_history no existe, ignorando historial');
        } else {
          console.warn('No se pudo obtener historial de payment_status:', historyError.message || historyError);
        }
      }

      // Obtener transacciones de pago para esta orden
      const paymentTransactionsResult = await dbPool.query(
        `SELECT 
          pt.*,
          pt.payment_data->>'cardType' as card_type,
          pt.payment_data->>'lastFour' as last_four,
          pt.payment_data->>'referenceNumber' as reference_number
        FROM orders.payment_transactions pt
        WHERE pt.order_id = $1
        ORDER BY pt.created_at ASC`,
        [order.id]
      );

      console.log(`💰 [FIND ONE BY BUSINESS] Transacciones encontradas para orden ${order.id}:`, paymentTransactionsResult.rows.length);
      if (paymentTransactionsResult.rows.length > 0) {
        console.log(`💰 [FIND ONE BY BUSINESS] Detalles de transacciones:`, paymentTransactionsResult.rows.map(tx => ({
          id: tx.id,
          payment_method: tx.payment_method,
          amount: tx.amount,
          status: tx.status,
        })));
      }

      // Parsear payment_data si viene como string (JSONB de PostgreSQL)
      const paymentTransactions = paymentTransactionsResult.rows.map(transaction => ({
        ...transaction,
        payment_data: typeof transaction.payment_data === 'string' 
          ? JSON.parse(transaction.payment_data) 
          : transaction.payment_data,
      }));

      // Obtener guía de envío (shipping label) si existe
      let shippingLabel = null;
      try {
        const shippingLabelResult = await dbPool.query(
          `SELECT tracking_number, carrier_name, status, generated_at, picked_up_at, in_transit_at, delivered_at
           FROM orders.shipping_labels
           WHERE order_id = $1
           ORDER BY created_at DESC
           LIMIT 1`,
          [orderId]
        );
        
        if (shippingLabelResult.rows.length > 0) {
          shippingLabel = shippingLabelResult.rows[0];
        }
      } catch (shippingError: any) {
        // Si la tabla no existe o hay error, simplemente no incluir shipping_label
        console.warn('No se pudo obtener shipping label:', shippingError.message || shippingError);
      }

      return {
        ...order,
        items: itemsResult.rows,
        delivery,
        payment_status_change_info: paymentStatusChangeInfo,
        payment_transactions: paymentTransactions,
        shipping_label: shippingLabel, // Guía de envío si existe
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
  async updateStatus(
    orderId: string, 
    businessId: string, 
    newStatus: string, 
    metadata?: {
      estimated_delivery_time?: number;
      cancellation_reason?: string;
      changed_by_user_id?: string;
      changed_by_role?: string;
    }
  ) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const client = await dbPool.connect();
    
    try {
      await client.query('BEGIN');

      // Verificar que el pedido existe y pertenece al negocio
      const orderResult = await client.query(
        `SELECT id, status, payment_status FROM orders.orders WHERE id = $1 AND business_id = $2`,
        [orderId, businessId]
      );

      if (orderResult.rows.length === 0) {
        throw new NotFoundException('Pedido no encontrado');
      }

      const order = orderResult.rows[0];
      const currentStatus = order.status;
      const paymentStatus = order.payment_status;

      console.log('🟢 [UPDATE STATUS] Iniciando actualización:', {
        orderId,
        businessId,
        currentStatus,
        newStatus,
        paymentStatus,
      });

      // Validar transición de estado usando reglas de negocio (flujo simplificado)
      const validTransitions: { [key: string]: { allowed: string[]; requires?: { payment_status?: string } } } = {
        'pending': { 
          allowed: ['confirmed', 'cancelled'],
          requires: { payment_status: 'paid' } // Para confirmed
        },
        'confirmed': { 
          allowed: ['completed', 'cancelled']
        },
        'completed': { 
          allowed: ['in_transit', 'cancelled']
        },
        'in_transit': { 
          allowed: ['delivered', 'delivery_failed', 'cancelled']
        },
        'delivery_failed': { 
          allowed: ['in_transit', 'returned', 'cancelled']
        },
        'delivered': { 
          allowed: ['returned', 'refunded']
        },
        'returned': { 
          allowed: ['refunded']
        },
        'cancelled': { 
          allowed: ['refunded']
        },
        'refunded': { 
          allowed: [] // Estado final
        },
      };

      const transitionRules = validTransitions[currentStatus];
      if (!transitionRules || !transitionRules.allowed.includes(newStatus)) {
        throw new BadRequestException(
          `No se puede cambiar el estado de "${currentStatus}" a "${newStatus}"`
        );
      }

      // Validar requisitos adicionales
      if (newStatus === 'confirmed' && transitionRules.requires?.payment_status) {
        console.log('🟢 [UPDATE STATUS] Validando requisito de pago:', {
          paymentStatus,
          required: 'paid',
          isValid: paymentStatus === 'paid',
        });
        if (paymentStatus !== 'paid') {
          throw new BadRequestException(
            'No se puede confirmar el pedido sin pago verificado'
          );
        }
      }

      // Construir query de actualización
      const updateFields: string[] = ['status = $3', 'updated_at = CURRENT_TIMESTAMP'];
      const updateParams: any[] = [orderId, businessId, newStatus];
      let paramIndex = 4;

      // Actualizar timestamps según el estado (flujo simplificado)
      if (newStatus === 'confirmed') {
        updateFields.push('confirmed_at = CURRENT_TIMESTAMP');
      } else if (newStatus === 'completed') {
        updateFields.push('completed_at = CURRENT_TIMESTAMP');
      } else if (newStatus === 'in_transit') {
        updateFields.push('in_transit_at = CURRENT_TIMESTAMP');
      } else if (newStatus === 'delivery_failed') {
        updateFields.push('delivery_failed_at = CURRENT_TIMESTAMP');
      } else if (newStatus === 'delivered') {
        updateFields.push('delivered_at = CURRENT_TIMESTAMP');
        // Calcular tiempo real de entrega
        const timeResult = await client.query(
          `SELECT EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at)) / 60 as minutes
           FROM orders.orders WHERE id = $1`,
          [orderId]
        );
        if (timeResult.rows[0]?.minutes) {
          updateFields.push(`actual_delivery_time = $${paramIndex}`);
          updateParams.push(Math.round(timeResult.rows[0].minutes));
          paramIndex++;
        }
      } else if (newStatus === 'returned') {
        updateFields.push('returned_at = CURRENT_TIMESTAMP');
      } else if (newStatus === 'cancelled') {
        updateFields.push('cancelled_at = CURRENT_TIMESTAMP');
        if (metadata?.cancellation_reason) {
          updateFields.push(`cancellation_reason = $${paramIndex}`);
          updateParams.push(metadata.cancellation_reason);
          paramIndex++;
        }
        // Si el pago ya fue procesado, cambiar payment_status
        if (paymentStatus === 'paid') {
          updateFields.push(`payment_status = $${paramIndex}`);
          updateParams.push('refund_pending');
          paramIndex++;
        }
      } else if (newStatus === 'refunded') {
        updateFields.push('refunded_at = CURRENT_TIMESTAMP');
        updateFields.push(`payment_status = $${paramIndex}`);
        updateParams.push('refunded');
        paramIndex++;
      }

      // Actualizar tiempo estimado de entrega si se proporciona
      if (metadata?.estimated_delivery_time !== undefined) {
        updateFields.push(`estimated_delivery_time = $${paramIndex}`);
        updateParams.push(metadata.estimated_delivery_time);
        paramIndex++;
      }

      // Actualizar estado del pedido
      console.log('🟢 [UPDATE STATUS] Ejecutando UPDATE:', {
        updateFields: updateFields.join(', '),
        updateParams: updateParams.length,
      });

      const result = await client.query(
        `UPDATE orders.orders 
         SET ${updateFields.join(', ')}
         WHERE id = $1 AND business_id = $2
         RETURNING *`,
        updateParams
      );

      console.log('🟢 [UPDATE STATUS] Resultado del UPDATE:', {
        rowCount: result.rowCount,
        newStatus: result.rows[0]?.status,
      });

      if (result.rowCount === 0) {
        throw new Error('No se actualizó ninguna fila');
      }

      const updatedOrder = result.rows[0];

      // Hacer COMMIT PRIMERO para asegurar que el cambio persista
      await client.query('COMMIT');
      console.log('🟢 [UPDATE STATUS] COMMIT ejecutado. Estado final:', updatedOrder.status);
      
      // Registrar en historial DESPUÉS del COMMIT (no crítico)
      // Usar una nueva conexión para no afectar la transacción principal
      try {
        const historyClient = await dbPool.connect();
        try {
          await historyClient.query(
            `INSERT INTO orders.order_status_history (
              order_id, previous_status, new_status, 
              changed_by_user_id, changed_by_role, change_reason
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              orderId,
              currentStatus,
              newStatus,
              metadata?.changed_by_user_id || null,
              metadata?.changed_by_role || null,
              metadata?.cancellation_reason || `Cambio de estado: ${currentStatus} → ${newStatus}`
            ]
          );
        } finally {
          historyClient.release();
        }
      } catch (historyError) {
        // No crítico, solo loguear - el estado ya se actualizó
        console.warn('⚠️ No se pudo registrar en historial:', historyError);
      }
      
      return updatedOrder;
    } catch (error: any) {
      await client.query('ROLLBACK');
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('❌ Error actualizando estado de pedido:', error);
      throw new ServiceUnavailableException(`Error al actualizar estado: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Procesar preparación de pedido
   * Actualiza cantidades de items, stock de productos y procesa opciones de escasez
   */
  async prepareOrder(
    orderId: string,
    businessId: string,
    prepareDto: {
      items: Array<{ item_id: string; quantity: number }>;
      shortage_options?: Array<{
        product_id: string;
        option_type: 'refund' | 'other_branch' | 'wallet';
        alternative_branch_id?: string;
        shortage_quantity: number;
      }>;
    },
    metadata?: {
      changed_by_user_id?: string;
      changed_by_role?: string;
    }
  ) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const client = await dbPool.connect();

    try {
      await client.query('BEGIN');

      // Verificar que el pedido existe y pertenece al negocio
      const orderResult = await client.query(
        `SELECT id, client_id, status, payment_status FROM orders.orders WHERE id = $1 AND business_id = $2`,
        [orderId, businessId]
      );

      if (orderResult.rows.length === 0) {
        throw new NotFoundException('Pedido no encontrado');
      }

      const order = orderResult.rows[0];
      const clientId = order.client_id;
      
      if (order.status !== 'confirmed') {
        throw new BadRequestException(`El pedido debe estar en estado 'confirmed' para comenzar la preparación. Estado actual: ${order.status}`);
      }

      // 1. Actualizar cantidades de items del pedido y calcular diferencias para acreditar al wallet
      const itemsToCredit: Array<{ item_id: string; product_id: string; item_name: string; item_price: number; shortage_quantity: number }> = [];
      
      console.log('🔵 [PREPARE ORDER] Iniciando actualización de items. Total items:', prepareDto.items.length);
      
      for (const itemUpdate of prepareDto.items) {
        // Obtener el item actual con original_quantity para calcular diferencia
        const itemResult = await client.query(
          `SELECT id, product_id, item_price, item_name, quantity, COALESCE(original_quantity, quantity) as original_quantity 
           FROM orders.order_items WHERE id = $1 AND order_id = $2`,
          [itemUpdate.item_id, orderId]
        );

        if (itemResult.rows.length === 0) {
          throw new NotFoundException(`Item ${itemUpdate.item_id} no encontrado en el pedido`);
        }

        const item = itemResult.rows[0];
        const originalQuantity = parseInt(item.original_quantity) || parseInt(item.quantity);
        const newQuantity = itemUpdate.quantity;
        const shortageQuantity = originalQuantity - newQuantity;

        console.log(`🔵 [PREPARE ORDER] Item ${item.item_name}:`, {
          item_id: item.id,
          original_quantity: originalQuantity,
          new_quantity: newQuantity,
          shortage_quantity: shortageQuantity,
          product_id: item.product_id,
        });

        // Si hay diferencia, guardar para acreditar al wallet después
        if (shortageQuantity > 0 && item.product_id) {
          itemsToCredit.push({
            item_id: item.id,
            product_id: item.product_id,
            item_name: item.item_name,
            item_price: parseFloat(item.item_price),
            shortage_quantity: shortageQuantity,
          });
          console.log(`💰 [PREPARE ORDER] Item agregado para acreditar al wallet: ${item.item_name}, cantidad faltante: ${shortageQuantity}`);
        }

        const newSubtotal = parseFloat(item.item_price) * itemUpdate.quantity;

        // Actualizar cantidad y subtotal
        await client.query(
          `UPDATE orders.order_items 
           SET quantity = $1, item_subtotal = $2 
           WHERE id = $3 AND order_id = $4`,
          [itemUpdate.quantity, newSubtotal, itemUpdate.item_id, orderId]
        );
      }

      // 2. Actualizar stock de productos y procesar opciones de escasez
      if (prepareDto.shortage_options && prepareDto.shortage_options.length > 0) {
        for (const shortageOption of prepareDto.shortage_options) {
          const productId = shortageOption.product_id;
          const shortageQuantity = shortageOption.shortage_quantity;

          // Obtener el item del pedido para este producto
          const itemResult = await client.query(
            `SELECT id, quantity FROM orders.order_items 
             WHERE order_id = $1 AND product_id = $2 LIMIT 1`,
            [orderId, productId]
          );

          if (itemResult.rows.length === 0) {
            console.warn(`⚠️ No se encontró item para producto ${productId} en el pedido ${orderId}`);
            continue;
          }

          const item = itemResult.rows[0];
          const finalQuantity = item.quantity - shortageQuantity; // Cantidad que sí se puede surtir

          // Actualizar stock de la sucursal actual (reducir por la cantidad que sí se surte)
          if (finalQuantity > 0) {
            await client.query(
              `UPDATE catalog.product_branch_availability 
               SET stock = GREATEST(0, stock - $1), updated_at = CURRENT_TIMESTAMP
               WHERE product_id = $2 AND branch_id = $3 AND stock IS NOT NULL`,
              [finalQuantity, productId, businessId]
            );
          }

          // Procesar opción de escasez
          switch (shortageOption.option_type) {
            case 'wallet':
              // Acreditar saldo al wallet del cliente
              try {
                // Obtener precio del item para calcular monto a acreditar
                const itemPriceResult = await client.query(
                  `SELECT item_price, item_name FROM orders.order_items 
                   WHERE order_id = $1 AND product_id = $2 LIMIT 1`,
                  [orderId, productId]
                );

                if (itemPriceResult.rows.length > 0) {
                  const itemPrice = parseFloat(itemPriceResult.rows[0].item_price);
                  const itemName = itemPriceResult.rows[0].item_name;
                  const amountToCredit = itemPrice * shortageQuantity;

                  // Acreditar al wallet usando el servicio
                  await this.walletService.creditWallet(
                    clientId,
                    {
                      amount: amountToCredit,
                      reason: `Nota de crédito por falta de stock: ${shortageQuantity} unidad${shortageQuantity > 1 ? 'es' : ''} de ${itemName}`,
                      description: 'Acreditación automática por producto no surtido',
                      order_id: orderId,
                      order_item_id: item.id,
                    },
                    metadata?.changed_by_user_id,
                    metadata?.changed_by_role || 'admin',
                  );

                  console.log(`💰 Monedero: Acreditados $${amountToCredit.toFixed(2)} al wallet del cliente por ${shortageQuantity} unidad${shortageQuantity > 1 ? 'es' : ''} no surtidas de ${itemName}`);
                } else {
                  console.warn(`⚠️ No se pudo obtener precio del item para producto ${productId}`);
                }
              } catch (walletError: any) {
                console.error('❌ Error acreditando saldo al wallet:', walletError);
                // No lanzar error para no interrumpir el proceso de preparación
                // El saldo se puede acreditar manualmente después
              }
              break;

            case 'other_branch':
              if (shortageOption.alternative_branch_id) {
                // Reducir stock de la sucursal alternativa
                await client.query(
                  `UPDATE catalog.product_branch_availability 
                   SET stock = GREATEST(0, stock - $1), updated_at = CURRENT_TIMESTAMP
                   WHERE product_id = $2 AND branch_id = $3 AND stock IS NOT NULL`,
                  [shortageQuantity, productId, shortageOption.alternative_branch_id]
                );
                console.log(`🏪 Otra sucursal: ${shortageQuantity} unidades del producto ${productId} desde sucursal ${shortageOption.alternative_branch_id}`);
              }
              break;

            case 'refund':
              // TODO: Procesar devolución de dinero
              console.log(`💵 Devolución: Devolver dinero por ${shortageQuantity} unidades del producto ${productId}`);
              // Aquí se haría la devolución del dinero al cliente
              break;
          }
        }
      } else {
        // Si no hay opciones de escasez, solo actualizar stock por las cantidades ajustadas
        for (const itemUpdate of prepareDto.items) {
          const itemResult = await client.query(
            `SELECT product_id FROM orders.order_items WHERE id = $1`,
            [itemUpdate.item_id]
          );

          if (itemResult.rows.length > 0 && itemResult.rows[0].product_id) {
            const productId = itemResult.rows[0].product_id;
            // Reducir stock por la cantidad ajustada
            await client.query(
              `UPDATE catalog.product_branch_availability 
               SET stock = GREATEST(0, stock - $1), updated_at = CURRENT_TIMESTAMP
               WHERE product_id = $2 AND branch_id = $3 AND stock IS NOT NULL`,
              [itemUpdate.quantity, productId, businessId]
            );
          }
        }
      }

      // 3. Acreditar automáticamente al wallet por items no surtidos (si no se especificó otra opción)
      // Solo acreditar items que NO están en shortage_options (para no duplicar)
      const processedProductIds = new Set(
        (prepareDto.shortage_options || []).map(opt => opt.product_id)
      );

      console.log(`💰 [AUTO-WALLET] Items para acreditar: ${itemsToCredit.length}`);
      console.log(`💰 [AUTO-WALLET] Productos procesados en shortage_options:`, Array.from(processedProductIds));
      console.log(`💰 [AUTO-WALLET] Client ID: ${clientId}`);

      for (const itemToCredit of itemsToCredit) {
        // Si este producto ya fue procesado en shortage_options, saltarlo
        if (processedProductIds.has(itemToCredit.product_id)) {
          console.log(`💰 [AUTO-WALLET] Saltando ${itemToCredit.product_id} porque ya fue procesado en shortage_options`);
          continue;
        }

        // Acreditar automáticamente al wallet
        try {
          const amountToCredit = itemToCredit.item_price * itemToCredit.shortage_quantity;
          
          console.log(`💰 [AUTO-WALLET] Intentando acreditar $${amountToCredit.toFixed(2)} al wallet del cliente ${clientId}...`);
          
          const transaction = await this.walletService.creditWallet(
            clientId,
            {
              amount: amountToCredit,
              reason: `Nota de crédito por falta de stock: ${itemToCredit.shortage_quantity} unidad${itemToCredit.shortage_quantity > 1 ? 'es' : ''} de ${itemToCredit.item_name}`,
              description: 'Acreditación automática por producto no surtido',
              order_id: orderId,
              order_item_id: itemToCredit.item_id,
            },
            metadata?.changed_by_user_id,
            metadata?.changed_by_role || 'admin',
          );

          console.log(`✅ [AUTO-WALLET] Acreditados $${amountToCredit.toFixed(2)} al wallet del cliente por ${itemToCredit.shortage_quantity} unidad${itemToCredit.shortage_quantity > 1 ? 'es' : ''} no surtidas de ${itemToCredit.item_name}`);
          console.log(`✅ [AUTO-WALLET] Transacción creada:`, transaction.id);
        } catch (walletError: any) {
          console.error('❌ [AUTO-WALLET] Error acreditando saldo al wallet:', walletError);
          console.error('❌ [AUTO-WALLET] Error completo:', JSON.stringify(walletError, null, 2));
          // No lanzar error para no interrumpir el proceso de preparación
        }
      }

      // 3. No cambiar el estado aquí, solo guardar las cantidades
      // El cambio de estado se hará cuando se marque como completado desde el frontend
      const updatedOrderResult = await client.query(
        `SELECT * FROM orders.orders WHERE id = $1 AND business_id = $2`,
        [orderId, businessId]
      );

      await client.query('COMMIT');

      return updatedOrderResult.rows[0];
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('❌ Error procesando preparación de pedido:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new ServiceUnavailableException(`Error al procesar preparación: ${error.message}`);
    } finally {
      client.release();
    }
  }
}

