import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { QueryResult } from 'pg';
import { dbPool } from '../../config/database.config';
import { supabaseAdmin } from '../../config/supabase.config';
import { StoresService } from '../stores/stores.service';
import { StoreProductEligibilityService } from './store-product-eligibility.service';
import { AddIntegrationCartItemDto } from './dto/add-integration-cart-item.dto';
import { PatchIntegrationCartItemDto } from './dto/patch-integration-cart-item.dto';
import { normalizeStoragePath } from '../../utils/storage.utils';
import {
  signIntegrationCartLinkToken,
  INTEGRATION_CART_LINK_TOKEN_V,
} from './integration-cart-link.util';
import { CreateIntegrationCartLinkDto } from './dto/create-integration-cart-link.dto';

@Injectable()
export class IntegrationCartService {
  private readonly BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET_PRODUCTS || 'products';

  constructor(
    private readonly storesService: StoresService,
    private readonly eligibility: StoreProductEligibilityService,
  ) {}

  async createCart(storeId: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }
    const st = await this.storesService.findById(storeId);
    if (!st.is_active || st.archived_at) {
      throw new BadRequestException('La tienda no está disponible');
    }
    try {
      const r = await dbPool.query(
        `INSERT INTO orders.integration_carts (store_id, expires_at)
         VALUES ($1, CURRENT_TIMESTAMP + INTERVAL '30 days')
         RETURNING id, store_id, expires_at, created_at, updated_at`,
        [storeId],
      );
      return r.rows[0];
    } catch (e) {
      this.rethrowIntegrationCartDbError(e);
    }
  }

  async getCart(cartId: string) {
    const { cart } = await this.loadOpenCart(cartId);
    return this.buildCartPayload(cart as Record<string, unknown>);
  }

  async deleteCart(cartId: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }
    await this.loadOpenCart(cartId);
    await dbPool.query(`DELETE FROM orders.integration_carts WHERE id = $1`, [cartId]);
    return { deleted: true, cartId };
  }

  async addItem(cartId: string, dto: AddIntegrationCartItemDto) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const { cart } = await this.loadOpenCart(cartId);
    const storeRow = await this.storesService.findById(cart.store_id as string);

    const { unitPrice, branchIdResolved } = await this.eligibility.assertProductEligible(
      storeRow,
      dto.productId,
      dto.branchId ?? null,
    );

    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');

      const productResult = await client.query(`SELECT * FROM catalog.products WHERE id = $1`, [dto.productId]);
      const product = productResult.rows[0];

      let variantPriceAdjustment = 0;
      const variantSelections = dto.variantSelections || {};
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const variantIds: string[] = [];
      Object.values(variantSelections).forEach((value) => {
        if (Array.isArray(value)) {
          variantIds.push(...value.filter((id) => uuidRegex.test(id)));
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
          [dto.productId, variantIds],
        );
        variantPriceAdjustment = variantPriceResult.rows.reduce((sum, variant) => {
          if (variant.absolute_price !== null) {
            return variant.absolute_price - parseFloat(product.price);
          }
          return sum + parseFloat(variant.price_adjustment || 0);
        }, 0);
      }

      const variantSelectionsJson = JSON.stringify(variantSelections);
      const specialInstructionsNormalized = dto.specialInstructions || '';
      const itemSubtotal = (unitPrice + variantPriceAdjustment) * dto.quantity;

      const existingItemResult = await client.query(
        `SELECT * FROM orders.integration_cart_items
         WHERE cart_id = $1
           AND product_id = $2
           AND variant_selections @> $3::jsonb
           AND variant_selections <@ $3::jsonb
           AND special_instructions_normalized = $4
           AND (branch_id IS NOT DISTINCT FROM $5::uuid)`,
        [cart.id, dto.productId, variantSelectionsJson, specialInstructionsNormalized, branchIdResolved || null],
      );

      if (existingItemResult.rows.length > 0) {
        const existingItem = existingItemResult.rows[0];
        const newQuantity = existingItem.quantity + dto.quantity;
        const newSubtotal = (unitPrice + variantPriceAdjustment) * newQuantity;
        await client.query(
          `UPDATE orders.integration_cart_items
           SET quantity = $1, unit_price = $2, variant_price_adjustment = $3, item_subtotal = $4, updated_at = CURRENT_TIMESTAMP
           WHERE id = $5`,
          [newQuantity, unitPrice, variantPriceAdjustment, newSubtotal, existingItem.id],
        );
      } else {
        await client.query(
          `INSERT INTO orders.integration_cart_items (
            cart_id, product_id, variant_selections, quantity,
            unit_price, variant_price_adjustment, item_subtotal, special_instructions, branch_id
          ) VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9)`,
          [
            cart.id,
            dto.productId,
            variantSelectionsJson,
            dto.quantity,
            unitPrice,
            variantPriceAdjustment,
            itemSubtotal,
            dto.specialInstructions || null,
            branchIdResolved || null,
          ],
        );
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      this.rethrowIntegrationCartDbError(e);
    } finally {
      client.release();
    }

    return this.buildCartPayload(cart);
  }

  async patchItem(cartId: string, itemId: string, dto: PatchIntegrationCartItemDto) {
    if (dto.quantity === undefined && dto.quantityDelta === undefined) {
      throw new BadRequestException('Debe enviar quantity o quantityDelta');
    }

    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const { cart } = await this.loadOpenCart(cartId);

    const itemResult = await dbPool.query(
      `SELECT * FROM orders.integration_cart_items WHERE id = $1 AND cart_id = $2`,
      [itemId, cart.id],
    );
    if (itemResult.rows.length === 0) {
      throw new NotFoundException('Ítem no encontrado en el carrito');
    }
    const item = itemResult.rows[0];

    let newQuantity: number;
    if (dto.quantity !== undefined && dto.quantityDelta !== undefined) {
      newQuantity = dto.quantity + dto.quantityDelta;
    } else if (dto.quantity !== undefined) {
      newQuantity = dto.quantity;
    } else {
      newQuantity = item.quantity + (dto.quantityDelta as number);
    }

    if (newQuantity <= 0) {
      await dbPool.query(`DELETE FROM orders.integration_cart_items WHERE id = $1`, [itemId]);
      const remaining = await dbPool.query(
        `SELECT COUNT(*)::int AS c FROM orders.integration_cart_items WHERE cart_id = $1`,
        [cart.id],
      );
      if (remaining.rows[0].c === 0) {
        await dbPool.query(`DELETE FROM orders.integration_carts WHERE id = $1`, [cart.id]);
        return null;
      }
      return this.buildCartPayload(cart);
    }

    const unit = parseFloat(item.unit_price);
    const adj = parseFloat(item.variant_price_adjustment || 0);
    const newSubtotal = (unit + adj) * newQuantity;

    await dbPool.query(
      `UPDATE orders.integration_cart_items
       SET quantity = $1, item_subtotal = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [newQuantity, newSubtotal, itemId],
    );

    return this.buildCartPayload(cart);
  }

  async removeItem(cartId: string, itemId: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }
    const { cart } = await this.loadOpenCart(cartId);
    const del = await dbPool.query(
      `DELETE FROM orders.integration_cart_items WHERE id = $1 AND cart_id = $2 RETURNING id`,
      [itemId, cart.id],
    );
    if (del.rowCount === 0) {
      throw new NotFoundException('Ítem no encontrado en el carrito');
    }
    const remaining = await dbPool.query(
      `SELECT COUNT(*)::int AS c FROM orders.integration_cart_items WHERE cart_id = $1`,
      [cart.id],
    );
    if (remaining.rows[0].c === 0) {
      await dbPool.query(`DELETE FROM orders.integration_carts WHERE id = $1`, [cart.id]);
      return null;
    }
    return this.buildCartPayload(cart);
  }

  /**
   * Enlace público para el sitio (WhatsApp → navegador). Firma HMAC; el front validará `t` con un endpoint futuro o leerá el cartId tras verificar.
   */
  async createShareLink(cartId: string, dto: CreateIntegrationCartLinkDto = {}) {
    const { cart } = await this.loadOpenCart(cartId);
    const secret = this.resolveLinkSigningSecret();
    const base = this.resolveFrontendBaseUrl();
    const path = this.resolveWebPath(dto.path);

    const ttlMin = 60;
    const ttlMax = 30 * 24 * 3600;
    let ttl = dto.ttlSeconds ?? 7 * 24 * 3600;
    if (ttl < ttlMin) ttl = ttlMin;
    if (ttl > ttlMax) ttl = ttlMax;

    const cartExpMs = cart.expires_at ? new Date(cart.expires_at as string).getTime() : null;
    const nowSec = Math.floor(Date.now() / 1000);
    const expByTtl = nowSec + ttl;
    const exp = cartExpMs != null ? Math.min(expByTtl, Math.floor(cartExpMs / 1000)) : expByTtl;
    if (exp <= nowSec) {
      throw new HttpException('El carrito ya expiró', HttpStatus.GONE);
    }

    const id = cart.id as string;
    const token = signIntegrationCartLinkToken({ v: INTEGRATION_CART_LINK_TOKEN_V, cartId: id, exp }, secret);
    const fullBase = `${base}${path.startsWith('/') ? path : `/${path}`}`;
    const url = this.appendQueryParam(fullBase, 't', token);

    return {
      url,
      token,
      cart_id: id,
      link_expires_at: new Date(exp * 1000).toISOString(),
      path: path.startsWith('/') ? path : `/${path}`,
    };
  }

  private resolveLinkSigningSecret(): string {
    const dedicated = process.env.INTEGRATION_CART_LINK_SECRET?.trim();
    if (dedicated) return dedicated;
    const webhook = process.env.INTEGRATION_CART_WEBHOOK_SECRET?.trim();
    if (webhook) return webhook;
    throw new ServiceUnavailableException(
      'Configure INTEGRATION_CART_LINK_SECRET (recomendado) o INTEGRATION_CART_WEBHOOK_SECRET para firmar enlaces de carrito',
    );
  }

  private resolveFrontendBaseUrl(): string {
    const raw = (process.env.FRONTEND_URL || '').trim().replace(/\/+$/, '');
    if (!raw) {
      throw new ServiceUnavailableException(
        'Configure FRONTEND_URL (URL pública del sitio) para generar enlaces de carrito de integración',
      );
    }
    return raw;
  }

  private resolveWebPath(override?: string): string {
    const fromEnv = process.env.INTEGRATION_CART_WEB_PATH?.trim() || '/carrito/integracion';
    const raw = override?.trim() || fromEnv;
    const p = raw.startsWith('/') ? raw : `/${raw}`;
    return p || '/carrito/integracion';
  }

  private appendQueryParam(url: string, key: string, value: string): string {
    const enc = encodeURIComponent(value);
    return url.includes('?') ? `${url}&${key}=${enc}` : `${url}?${key}=${enc}`;
  }

  private async loadOpenCart(cartId: string): Promise<{ cart: Record<string, unknown> }> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }
    try {
      const r = await dbPool.query(
        `SELECT ic.id, ic.store_id, ic.expires_at, ic.created_at, ic.updated_at
         FROM orders.integration_carts ic
         WHERE ic.id = $1`,
        [cartId],
      );
      if (r.rows.length === 0) {
        throw new NotFoundException('Carrito no encontrado');
      }
      const cart = r.rows[0];
      const exp = cart.expires_at ? new Date(cart.expires_at) : null;
      if (exp && exp.getTime() < Date.now()) {
        throw new HttpException('El carrito expiró', HttpStatus.GONE);
      }
      return { cart };
    } catch (e) {
      if (e instanceof NotFoundException || e instanceof HttpException) {
        throw e;
      }
      this.rethrowIntegrationCartDbError(e);
    }
  }

  private async buildCartPayload(cart: Record<string, unknown>) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }
    const cartId = cart.id as string;

    let itemsResult!: QueryResult;
    try {
      itemsResult = await dbPool.query(
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
          COALESCE(branch_b.id, p.business_id) as business_id,
          COALESCE(branch_b.name, b.name) as business_name,
          pi_main.file_path as primary_image_path
        FROM orders.integration_cart_items sci
        INNER JOIN catalog.products p ON sci.product_id = p.id
        INNER JOIN core.businesses b ON p.business_id = b.id
        LEFT JOIN core.businesses branch_b ON sci.branch_id = branch_b.id
        LEFT JOIN LATERAL (
          SELECT pi_lat.file_path
          FROM catalog.product_images pi_lat
          WHERE pi_lat.product_id = p.id
          AND pi_lat.is_active = TRUE
          ORDER BY pi_lat.is_primary DESC, pi_lat.display_order ASC, pi_lat.created_at ASC
          LIMIT 1
        ) pi_main ON TRUE
        WHERE sci.cart_id = $1
        ORDER BY sci.created_at ASC`,
        [cartId],
      );
    } catch (e) {
      this.rethrowIntegrationCartDbError(e);
    }

    const processedItems = itemsResult.rows.map((item) => {
      let productImageUrl: string | null = null;
      const sourcePath = item.primary_image_path || item.product_image_url_fallback || null;
      if (sourcePath && supabaseAdmin) {
        try {
          const normalized = normalizeStoragePath(
            sourcePath.startsWith('http') && sourcePath.includes('/object/public/http')
              ? sourcePath.replace(/^[^]*?\/object\/public\//, '')
              : sourcePath,
          );
          if (normalized && !normalized.startsWith('http') && normalized.includes('/')) {
            const { data } = supabaseAdmin.storage.from(this.BUCKET_NAME).getPublicUrl(normalized);
            productImageUrl = data.publicUrl;
          } else if (normalized && normalized.startsWith('http')) {
            productImageUrl = normalized;
          } else if (
            item.product_image_url_fallback?.includes('/storage/v1/object/public/') &&
            !item.product_image_url_fallback.includes('/object/public/http')
          ) {
            productImageUrl = item.product_image_url_fallback;
          }
        } catch {
          /* ignore */
        }
      }
      return { ...item, product_image_url: productImageUrl };
    });

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
  }

  /** 42P01 sobre integration_carts / integration_cart_items → mensaje para ejecutar migración SQL. */
  private rethrowIntegrationCartDbError(err: unknown): never {
    const e = err as { code?: string; message?: string };
    if (e?.code === '42P01' && /integration_cart/i.test(String(e.message || ''))) {
      throw new ServiceUnavailableException(
        'Faltan tablas del carrito de integración (orders.integration_carts / orders.integration_cart_items). ' +
          'En Supabase SQL Editor, ejecute el script completo database/agora/migration_integration_cart.sql en el mismo proyecto que DATABASE_URL de este backend.',
      );
    }
    throw err;
  }
}
