import type { StoreContextType } from '@/contexts/StoreContext';
import type { Product, ProductBranchAvailability } from './products';
import { branchesService, type BranchTaxSettings } from './branches';
import { taxesService } from './taxes';

export const DEFAULT_BRANCH_TAX_SETTINGS: BranchTaxSettings = {
  included_in_price: false,
  display_tax_breakdown: true,
  show_tax_included_label: true,
};

const taxSettingsCache = new Map<string, Promise<BranchTaxSettings>>();
const resolvedPriceCache = new Map<string, Promise<number>>();

export function isValidPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function toSafePrice(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function getProductBasePrice(
  product: Pick<Product, 'price' | 'branch_price'> | { price?: number | null; branch_price?: number | null },
  contextType: StoreContextType,
): number {
  const branchPrice = toSafePrice(product.branch_price);
  const productPrice = toSafePrice(product.price);

  if (contextType === 'sucursal' && branchPrice !== null) {
    return branchPrice;
  }

  return productPrice ?? 0;
}

export function getAvailabilityDisplayPrice(
  availability: Pick<ProductBranchAvailability, 'price' | 'taxed_price'>,
  fallbackPrice: number,
): number {
  const taxedPrice = toSafePrice(availability.taxed_price);
  if (taxedPrice !== null && taxedPrice > 0) {
    return taxedPrice;
  }

  const basePrice = toSafePrice(availability.price);
  if (basePrice !== null) {
    return basePrice;
  }

  return fallbackPrice;
}

export async function getBranchTaxSettingsCached(
  businessId?: string | null,
): Promise<BranchTaxSettings> {
  if (!businessId) {
    return DEFAULT_BRANCH_TAX_SETTINGS;
  }

  const cached = taxSettingsCache.get(businessId);
  if (cached) {
    return cached;
  }

  const request = branchesService
    .getBranchTaxSettings(businessId)
    .then((settings) => settings || DEFAULT_BRANCH_TAX_SETTINGS)
    .catch(() => DEFAULT_BRANCH_TAX_SETTINGS);

  taxSettingsCache.set(businessId, request);
  return request;
}

export async function resolveDisplayPrice(params: {
  productId: string;
  basePrice: number;
  taxSettings?: BranchTaxSettings | null;
}): Promise<number> {
  const { productId, basePrice, taxSettings } = params;

  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    return Number.isFinite(basePrice) ? basePrice : 0;
  }

  if (taxSettings?.included_in_price) {
    return basePrice;
  }

  const cacheKey = `${productId}:${basePrice.toFixed(4)}:${taxSettings?.included_in_price ? 1 : 0}`;
  const cached = resolvedPriceCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const request = taxesService
    .calculateProductTaxes(productId, basePrice)
    .then((taxBreakdown) => basePrice + (taxBreakdown?.total_tax || 0))
    .catch(() => basePrice);

  resolvedPriceCache.set(cacheKey, request);
  return request;
}
