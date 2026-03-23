import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { dbPool } from '../../config/database.config';
import type { Store } from '../stores/stores.service';

export interface EligibilityResult {
  unitPrice: number;
  productBusinessId: string;
  branchIdResolved: string | null;
}

@Injectable()
export class StoreProductEligibilityService {
  /**
   * Valida que el producto pueda venderse en el contexto de la tienda (store)
   * y devuelve el precio unitario efectivo (snapshot para el carrito).
   */
  async assertProductEligible(
    store: Store,
    productId: string,
    branchIdInput: string | null | undefined,
  ): Promise<EligibilityResult> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    if (!store.is_active || store.archived_at) {
      throw new BadRequestException('La tienda no está disponible');
    }

    const productResult = await dbPool.query(
      `SELECT p.*, b.id AS owner_business_id
       FROM catalog.products p
       INNER JOIN core.businesses b ON p.business_id = b.id
       WHERE p.id = $1`,
      [productId],
    );

    if (productResult.rows.length === 0) {
      throw new NotFoundException('Producto no encontrado');
    }

    const product = productResult.rows[0];
    const basePrice = product.price != null ? parseFloat(String(product.price)) : 0;
    if (basePrice <= 0) {
      throw new BadRequestException('Este producto no está disponible para compra');
    }
    if (!product.is_available) {
      throw new BadRequestException('El producto no está disponible');
    }

    const productType = product.product_type != null ? String(product.product_type) : null;
    let branchIdResolved: string | null = branchIdInput?.trim() || null;

    switch (store.type) {
      case 'branch': {
        const expected = store.business_id;
        if (!expected) {
          throw new BadRequestException('Tienda sucursal mal configurada');
        }
        branchIdResolved = branchIdResolved || expected;
        if (branchIdResolved !== expected) {
          throw new BadRequestException('La sucursal no coincide con la tienda (branch)');
        }
        await this.assertBranchActive(branchIdResolved);
        await this.assertPbaIfPresent(productId, branchIdResolved, true);
        const unitPrice = await this.resolveUnitPrice(productId, branchIdResolved, basePrice);
        return { unitPrice, productBusinessId: product.owner_business_id, branchIdResolved };
      }
      case 'group':
      case 'group_brand': {
        if (!branchIdResolved) {
          throw new BadRequestException('branchId es obligatorio para esta tienda');
        }
        if (!store.business_group_id) {
          throw new BadRequestException('Tienda de grupo mal configurada');
        }
        await this.assertBranchInGroup(branchIdResolved, store.business_group_id);
        await this.assertPbaIfPresent(productId, branchIdResolved, true);
        if (store.type === 'group_brand' && store.vehicle_brand_id) {
          await this.assertBrandCompatibilityIfNeeded(productId, productType, store.vehicle_brand_id);
        }
        const unitPrice = await this.resolveUnitPrice(productId, branchIdResolved, basePrice);
        return { unitPrice, productBusinessId: product.owner_business_id, branchIdResolved };
      }
      case 'global_brand': {
        if (!branchIdResolved) {
          throw new BadRequestException('branchId es obligatorio para esta tienda');
        }
        if (!store.vehicle_brand_id) {
          throw new BadRequestException('Tienda marca global mal configurada');
        }
        await this.assertBranchActive(branchIdResolved);
        await this.assertPbaIfPresent(productId, branchIdResolved, true);
        await this.assertBrandCompatibilityIfNeeded(productId, productType, store.vehicle_brand_id);
        const unitPrice = await this.resolveUnitPrice(productId, branchIdResolved, basePrice);
        return { unitPrice, productBusinessId: product.owner_business_id, branchIdResolved };
      }
      case 'global':
      default: {
        if (branchIdResolved) {
          await this.assertBranchActive(branchIdResolved);
          await this.assertPbaIfPresent(productId, branchIdResolved, false);
          const unitPrice = await this.resolveUnitPrice(productId, branchIdResolved, basePrice);
          return { unitPrice, productBusinessId: product.owner_business_id, branchIdResolved };
        }
        return { unitPrice: basePrice, productBusinessId: product.owner_business_id, branchIdResolved: null };
      }
    }
  }

  private async assertBranchActive(branchId: string): Promise<void> {
    if (!dbPool) return;
    const r = await dbPool.query(
      `SELECT id FROM core.businesses WHERE id = $1 AND is_active = TRUE`,
      [branchId],
    );
    if (r.rows.length === 0) {
      throw new NotFoundException('Sucursal no encontrada o inactiva');
    }
  }

  private async assertBranchInGroup(branchId: string, groupId: string): Promise<void> {
    if (!dbPool) return;
    const r = await dbPool.query(
      `SELECT id FROM core.businesses WHERE id = $1 AND business_group_id = $2 AND is_active = TRUE`,
      [branchId, groupId],
    );
    if (r.rows.length === 0) {
      throw new BadRequestException('La sucursal no pertenece al grupo de esta tienda');
    }
  }

  /** Si hay fila PBA, debe estar habilitada. Si strictRow y no hay fila, rechazar. */
  private async assertPbaIfPresent(
    productId: string,
    branchId: string,
    requireRow: boolean,
  ): Promise<void> {
    if (!dbPool) return;
    const r = await dbPool.query(
      `SELECT is_enabled FROM catalog.product_branch_availability
       WHERE product_id = $1 AND branch_id = $2 AND COALESCE(is_active, TRUE) = TRUE`,
      [productId, branchId],
    );
    if (r.rows.length === 0) {
      if (requireRow) {
        throw new BadRequestException('El producto no está disponible en esta sucursal');
      }
      return;
    }
    if (!r.rows[0].is_enabled) {
      throw new BadRequestException('El producto no está disponible en esta sucursal');
    }
  }

  private async resolveUnitPrice(
    productId: string,
    branchId: string,
    fallback: number,
  ): Promise<number> {
    if (!dbPool) return fallback;
    const r = await dbPool.query(
      `SELECT price FROM catalog.product_branch_availability
       WHERE product_id = $1 AND branch_id = $2 AND COALESCE(is_active, TRUE) = TRUE`,
      [productId, branchId],
    );
    if (r.rows.length > 0 && r.rows[0].price != null) {
      return parseFloat(String(r.rows[0].price));
    }
    return fallback;
  }

  private async assertBrandCompatibilityIfNeeded(
    productId: string,
    productType: string | null,
    vehicleBrandId: string,
  ): Promise<void> {
    if (!productType || !['refaccion', 'accesorio'].includes(productType)) {
      return;
    }
    if (!dbPool) return;
    try {
      const r = await dbPool.query(
        `SELECT catalog.product_matches_vehicle_brand($1::uuid, $2::uuid) AS ok`,
        [productId, vehicleBrandId],
      );
      const raw = r.rows[0]?.ok;
      const ok = raw === true || raw === 't' || raw === 'true';
      if (!ok) {
        throw new BadRequestException('El producto no aplica a la marca de esta tienda');
      }
    } catch (e: unknown) {
      if (e instanceof BadRequestException) throw e;
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('product_matches_vehicle_brand') || msg.includes('does not exist')) {
        throw new ServiceUnavailableException(
          'Validación de marca no disponible (función catalog.product_matches_vehicle_brand)',
        );
      }
      throw e;
    }
  }
}
