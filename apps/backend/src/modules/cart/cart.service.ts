import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
  ConflictException,
} from '@nestjs/common';
import { dbPool } from '../../config/database.config';
import { supabaseAdmin } from '../../config/supabase.config';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  private readonly BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET_PRODUCTS || 'products';
  /**
   * Obtener o crear el carrito del usuario
   */
  async getOrCreateCart(userId: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      // Intentar obtener carrito existente
      const existingCart = await dbPool.query(
        `SELECT * FROM orders.shopping_cart WHERE user_id = $1`,
        [userId]
      );

      if (existingCart.rows.length > 0) {
        return existingCart.rows[0];
      }

      // Crear nuevo carrito
      const newCart = await dbPool.query(
        `INSERT INTO orders.shopping_cart (user_id, expires_at)
         VALUES ($1, CURRENT_TIMESTAMP + INTERVAL '30 days')
         RETURNING *`,
        [userId]
      );

      return newCart.rows[0];
    } catch (error: any) {
      console.error('❌ Error obteniendo/creando carrito:', error);
      throw new ServiceUnavailableException(`Error al obtener carrito: ${error.message}`);
    }
  }

  /**
   * Obtener el carrito completo con items
   */
  async getCart(userId: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      // Obtener carrito
      const cartResult = await dbPool.query(
        `SELECT * FROM orders.shopping_cart WHERE user_id = $1`,
        [userId]
      );

      if (cartResult.rows.length === 0) {
        return null;
      }

      const cart = cartResult.rows[0];

      // Obtener items del carrito con información del producto
      // Incluir imagen principal de product_images si está disponible
      // Si hay branch_id, usar ese business_id para obtener el nombre de la sucursal
      const itemsResult = await dbPool.query(
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
          sci.created_at,
          sci.updated_at,
          p.name as product_name,
          p.description as product_description,
          p.image_url as product_image_url_fallback,
          p.is_available as product_is_available,
          -- Usar branch_id si existe, sino usar el business_id del producto
          COALESCE(branch_b.id, p.business_id) as business_id,
          COALESCE(branch_b.name, b.name) as business_name,
          pi_main.file_path as primary_image_path
        FROM orders.shopping_cart_items sci
        INNER JOIN catalog.products p ON sci.product_id = p.id
        INNER JOIN core.businesses b ON p.business_id = b.id
        -- LEFT JOIN para obtener información de la sucursal si branch_id está presente
        LEFT JOIN core.businesses branch_b ON sci.branch_id = branch_b.id
        -- LEFT JOIN para obtener la imagen principal (primera imagen activa ordenada por is_primary y display_order)
        LEFT JOIN LATERAL (
          SELECT pi_lat.file_path
          FROM catalog.product_images pi_lat
          WHERE pi_lat.product_id = p.id
          AND pi_lat.is_active = TRUE
          ORDER BY pi_lat.is_primary DESC, pi_lat.display_order ASC
          LIMIT 1
        ) pi_main ON TRUE
        WHERE sci.cart_id = $1
        ORDER BY sci.created_at ASC`,
        [cart.id]
      );

      // Procesar items para agregar URLs de imágenes
      const processedItems = itemsResult.rows.map((item) => {
        let productImageUrl = item.product_image_url_fallback;
        
        // Si hay una imagen principal de product_images, generar su URL pública
        if (item.primary_image_path && supabaseAdmin) {
          try {
            const { data: urlData } = supabaseAdmin.storage
              .from(this.BUCKET_NAME)
              .getPublicUrl(item.primary_image_path);
            productImageUrl = urlData.publicUrl;
          } catch (error) {
            console.error('Error generando URL de imagen principal en carrito:', error);
            // Mantener el fallback si hay error
          }
        }

        return {
          ...item,
          product_image_url: productImageUrl,
        };
      });

      // Calcular totales
      const subtotal = processedItems.reduce((sum, item) => sum + parseFloat(item.item_subtotal), 0);
      const itemCount = processedItems.length;
      const totalQuantity = processedItems.reduce((sum, item) => sum + item.quantity, 0);

      return {
        ...cart,
        items: processedItems,
        subtotal: subtotal.toFixed(2),
        itemCount,
        totalQuantity,
      };
    } catch (error: any) {
      console.error('❌ Error obteniendo carrito:', error);
      throw new ServiceUnavailableException(`Error al obtener carrito: ${error.message}`);
    }
  }

  /**
   * Agregar item al carrito
   */
  async addItem(userId: string, addItemDto: AddCartItemDto) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const client = await dbPool.connect();

    try {
      await client.query('BEGIN');

      // Obtener o crear carrito
      const cart = await this.getOrCreateCart(userId);

      // Verificar que el producto existe y obtener información
      const productResult = await client.query(
        `SELECT p.*, b.id as business_id 
         FROM catalog.products p
         INNER JOIN core.businesses b ON p.business_id = b.id
         WHERE p.id = $1`,
        [addItemDto.productId]
      );

      if (productResult.rows.length === 0) {
        throw new NotFoundException('Producto no encontrado');
      }

      const product = productResult.rows[0];

      // Determinar el business_id a usar
      // Si se proporciona branchId, usarlo (en contexto global con sucursal seleccionada)
      // Si no, usar el business_id del producto
      let targetBusinessId = product.business_id;
      
      if (addItemDto.branchId) {
        // Verificar que la sucursal existe y obtener su business_id
        const branchResult = await client.query(
          `SELECT id, business_group_id FROM core.businesses WHERE id = $1 AND is_active = TRUE`,
          [addItemDto.branchId]
        );
        
        if (branchResult.rows.length === 0) {
          throw new NotFoundException('Sucursal no encontrada o inactiva');
        }
        
        targetBusinessId = addItemDto.branchId; // La sucursal ES el business_id
      }

      // Verificar disponibilidad del producto en la sucursal seleccionada
      if (addItemDto.branchId) {
        const availabilityResult = await client.query(
          `SELECT is_enabled, stock, price 
           FROM catalog.product_branch_availability 
           WHERE product_id = $1 AND branch_id = $2 AND COALESCE(is_active, TRUE) = TRUE`,
          [addItemDto.productId, addItemDto.branchId]
        );
        
        if (availabilityResult.rows.length > 0) {
          const availability = availabilityResult.rows[0];
          if (!availability.is_enabled) {
            throw new BadRequestException('El producto no está disponible en esta sucursal');
          }
        }
      } else {
        // Verificar disponibilidad general
        if (!product.is_available) {
          throw new BadRequestException('El producto no está disponible');
        }
      }

      // Permitir múltiples grupos de tiendas en el mismo carrito
      // Si el carrito ya tiene un business_id diferente, establecerlo a NULL
      // para indicar que el carrito contiene productos de múltiples tiendas
      // Los items se agruparán por business_id en el frontend
      if (cart.business_id && cart.business_id !== targetBusinessId) {
        // El carrito tiene productos de diferentes tiendas
        // Establecer business_id a NULL para indicar múltiples tiendas
        await client.query(
          `UPDATE orders.shopping_cart SET business_id = NULL WHERE id = $1`,
          [cart.id]
        );
        cart.business_id = null;
      } else if (!cart.business_id && targetBusinessId) {
        // Si no tiene business_id y este es el primer producto, establecerlo
        await client.query(
          `UPDATE orders.shopping_cart SET business_id = $1 WHERE id = $2`,
          [targetBusinessId, cart.id]
        );
        cart.business_id = targetBusinessId;
      }

      // Calcular precio de variantes
      let variantPriceAdjustment = 0;
      const variantSelections = addItemDto.variantSelections || {};

      if (Object.keys(variantSelections).length > 0) {
        // Obtener ajustes de precio de las variantes seleccionadas
        // Filtrar solo UUIDs válidos (excluir IDs legacy como "legacy-0-1")
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const variantIds: string[] = [];
        
        Object.values(variantSelections).forEach((value) => {
          if (Array.isArray(value)) {
            variantIds.push(...value.filter(id => uuidRegex.test(id)));
          } else if (uuidRegex.test(value)) {
            variantIds.push(value);
          }
        });

        if (variantIds.length > 0) {
          const variantPriceResult = await client.query(
            `SELECT 
              COALESCE(absolute_price, (SELECT price FROM catalog.products WHERE id = $1) + price_adjustment) as final_price,
              price_adjustment,
              absolute_price
            FROM catalog.product_variants
            WHERE id = ANY($2::uuid[])
            AND is_available = TRUE`,
            [addItemDto.productId, variantIds]
          );

          // Calcular ajuste total
          variantPriceAdjustment = variantPriceResult.rows.reduce((sum, variant) => {
            if (variant.absolute_price !== null) {
              return variant.absolute_price - parseFloat(product.price);
            }
            return sum + parseFloat(variant.price_adjustment || 0);
          }, 0);
        } else {
          // Si no hay UUIDs válidos, las variantes son legacy y no tienen precio adicional
          // El precio será el precio base del producto
          console.log('⚠️  Variantes legacy detectadas, usando precio base del producto');
        }
      }

      // Determinar el precio a usar
      // Si hay branchId y tiene precio personalizado, usarlo; sino usar precio global
      let unitPrice = parseFloat(product.price);
      
      if (addItemDto.branchId) {
        const availabilityResult = await client.query(
          `SELECT price FROM catalog.product_branch_availability 
           WHERE product_id = $1 AND branch_id = $2 AND COALESCE(is_active, TRUE) = TRUE`,
          [addItemDto.productId, addItemDto.branchId]
        );
        
        if (availabilityResult.rows.length > 0 && availabilityResult.rows[0].price !== null) {
          unitPrice = parseFloat(availabilityResult.rows[0].price);
        }
      }
      
      const itemSubtotal = (unitPrice + variantPriceAdjustment) * addItemDto.quantity;

      // Normalizar variant_selections para el constraint UNIQUE
      const variantSelectionsJson = JSON.stringify(variantSelections);
      const specialInstructionsNormalized = addItemDto.specialInstructions || '';

      // Intentar encontrar item idéntico existente
      // Usar operadores JSONB para comparación correcta
      // También considerar branch_id para no agrupar items de diferentes sucursales
      const existingItemResult = await client.query(
        `SELECT * FROM orders.shopping_cart_items
         WHERE cart_id = $1
           AND product_id = $2
           AND variant_selections @> $3::jsonb
           AND variant_selections <@ $3::jsonb
           AND special_instructions_normalized = $4
           AND (branch_id IS NOT DISTINCT FROM $5::uuid)`,
        [cart.id, addItemDto.productId, variantSelectionsJson, specialInstructionsNormalized, addItemDto.branchId || null]
      );

      if (existingItemResult.rows.length > 0) {
        // Item idéntico existe, actualizar cantidad
        const existingItem = existingItemResult.rows[0];
        const newQuantity = existingItem.quantity + addItemDto.quantity;
        const newSubtotal = (unitPrice + variantPriceAdjustment) * newQuantity;

        await client.query(
          `UPDATE orders.shopping_cart_items
           SET quantity = $1, item_subtotal = $2, updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [newQuantity, newSubtotal, existingItem.id]
        );

        // Actualizar business_id del carrito si es necesario
        if (!cart.business_id) {
          await client.query(
            `UPDATE orders.shopping_cart SET business_id = $1 WHERE id = $2`,
            [targetBusinessId, cart.id]
          );
        }

        await client.query('COMMIT');

        return await this.getCart(userId);
      }

      // Item nuevo, insertar
      await client.query(
        `INSERT INTO orders.shopping_cart_items (
          cart_id, product_id, variant_selections, quantity,
          unit_price, variant_price_adjustment, item_subtotal, special_instructions, branch_id
        ) VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9)`,
        [
          cart.id,
          addItemDto.productId,
          variantSelectionsJson,
          addItemDto.quantity,
          unitPrice,
          variantPriceAdjustment,
          itemSubtotal,
          addItemDto.specialInstructions || null,
          addItemDto.branchId || null, // Guardar branch_id si está disponible
        ]
      );

      // Actualizar business_id del carrito si es necesario
      if (!cart.business_id) {
        await client.query(
          `UPDATE orders.shopping_cart SET business_id = $1 WHERE id = $2`,
          [product.business_id, cart.id]
        );
      }

      await client.query('COMMIT');

      return await this.getCart(userId);
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('❌ Error agregando item al carrito:', error);

      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }

      throw new ServiceUnavailableException(`Error al agregar item al carrito: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Actualizar item del carrito
   */
  async updateItem(userId: string, itemId: string, updateItemDto: UpdateCartItemDto) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      // Verificar que el item pertenece al carrito del usuario
      const itemResult = await dbPool.query(
        `SELECT sci.* FROM orders.shopping_cart_items sci
         INNER JOIN orders.shopping_cart sc ON sci.cart_id = sc.id
         WHERE sci.id = $1 AND sc.user_id = $2`,
        [itemId, userId]
      );

      if (itemResult.rows.length === 0) {
        throw new NotFoundException('Item no encontrado en tu carrito');
      }

      const item = itemResult.rows[0];
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updateItemDto.quantity !== undefined) {
        updates.push(`quantity = $${paramIndex}`);
        values.push(updateItemDto.quantity);
        paramIndex++;

        // Recalcular subtotal
        const newSubtotal = (parseFloat(item.unit_price) + parseFloat(item.variant_price_adjustment || 0)) * updateItemDto.quantity;
        updates.push(`item_subtotal = $${paramIndex}`);
        values.push(newSubtotal);
        paramIndex++;
      }

      if (updateItemDto.specialInstructions !== undefined) {
        updates.push(`special_instructions = $${paramIndex}`);
        values.push(updateItemDto.specialInstructions || null);
        paramIndex++;
      }

      if (updates.length === 0) {
        return await this.getCart(userId);
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(itemId);

      await dbPool.query(
        `UPDATE orders.shopping_cart_items
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex}`,
        values
      );

      return await this.getCart(userId);
    } catch (error: any) {
      console.error('❌ Error actualizando item del carrito:', error);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new ServiceUnavailableException(`Error al actualizar item: ${error.message}`);
    }
  }

  /**
   * Eliminar item del carrito
   */
  async removeItem(userId: string, itemId: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      // Verificar que el item pertenece al carrito del usuario
      const itemResult = await dbPool.query(
        `SELECT sci.*, sc.id as cart_id FROM orders.shopping_cart_items sci
         INNER JOIN orders.shopping_cart sc ON sci.cart_id = sc.id
         WHERE sci.id = $1 AND sc.user_id = $2`,
        [itemId, userId]
      );

      if (itemResult.rows.length === 0) {
        throw new NotFoundException('Item no encontrado en tu carrito');
      }

      const cartId = itemResult.rows[0].cart_id;

      // Eliminar item
      await dbPool.query(`DELETE FROM orders.shopping_cart_items WHERE id = $1`, [itemId]);

      // Verificar si el carrito queda vacío y eliminarlo
      const remainingItems = await dbPool.query(
        `SELECT COUNT(*) as count FROM orders.shopping_cart_items WHERE cart_id = $1`,
        [cartId]
      );

      if (parseInt(remainingItems.rows[0].count) === 0) {
        await dbPool.query(`DELETE FROM orders.shopping_cart WHERE id = $1`, [cartId]);
        return null;
      }

      return await this.getCart(userId);
    } catch (error: any) {
      console.error('❌ Error eliminando item del carrito:', error);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new ServiceUnavailableException(`Error al eliminar item: ${error.message}`);
    }
  }

  /**
   * Vaciar carrito
   */
  async clearCart(userId: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      const cartResult = await dbPool.query(
        `SELECT id FROM orders.shopping_cart WHERE user_id = $1`,
        [userId]
      );

      if (cartResult.rows.length === 0) {
        return null;
      }

      const cartId = cartResult.rows[0].id;

      // Eliminar todos los items y el carrito
      await dbPool.query(`DELETE FROM orders.shopping_cart WHERE id = $1`, [cartId]);

      return null;
    } catch (error: any) {
      console.error('❌ Error vaciando carrito:', error);
      throw new ServiceUnavailableException(`Error al vaciar carrito: ${error.message}`);
    }
  }
}

