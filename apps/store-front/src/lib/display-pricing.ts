import { branchesService, BranchTaxSettings } from './branches';
import { taxesService } from './taxes';

const DEFAULT_BRANCH_TAX_SETTINGS: BranchTaxSettings = {
  included_in_price: false,
  display_tax_breakdown: true,
  show_tax_included_label: true,
};

const branchTaxSettingsCache = new Map<string, Promise<BranchTaxSettings>>();
const resolvedPriceCache = new Map<string, Promise<number>>();

export interface ResolveDisplayPriceInput {
  productId: string;
  basePrice: number | null | undefined;
  businessId?: string | null;
  branchTaxSettings?: BranchTaxSettings | null;
  precomputedTaxedPrice?: number | null;
}

export function normalizePrice(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(normalized) ? normalized : null;
}

export function calculateDiscountPercentage(
  displayPrice: number | null | undefined,
  compareAtPrice: number | null | undefined,
): number | null {
  const current = normalizePrice(displayPrice);
  const original = normalizePrice(compareAtPrice);

  if (current === null || original === null || original <= 0 || current >= original) {
    return null;
  }

  return (1 - current / original) * 100;
}

export async function getBranchTaxSettingsCached(businessId?: string | null): Promise<BranchTaxSettings> {
  if (!businessId) {
    return DEFAULT_BRANCH_TAX_SETTINGS;
  }

  const cacheKey = businessId;
  const cached = branchTaxSettingsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const request = branchesService
    .getBranchTaxSettings(businessId)
    .then((settings) => settings || DEFAULT_BRANCH_TAX_SETTINGS)
    .catch((error) => {
      console.warn('[display-pricing] No se pudo cargar configuracion de impuestos:', error);
      return DEFAULT_BRANCH_TAX_SETTINGS;
    });

  branchTaxSettingsCache.set(cacheKey, request);
  return request;
}

export async function resolveProductDisplayPrice({
  productId,
  basePrice,
  businessId,
  branchTaxSettings,
  precomputedTaxedPrice,
}: ResolveDisplayPriceInput): Promise<number> {
  const normalizedBasePrice = normalizePrice(basePrice) ?? 0;
  const normalizedTaxedPrice = normalizePrice(precomputedTaxedPrice);

  if (normalizedTaxedPrice !== null) {
    return normalizedTaxedPrice;
  }

  const cacheKey = JSON.stringify({
    productId,
    basePrice: normalizedBasePrice,
    businessId: businessId || null,
    includedInPrice:
      branchTaxSettings?.included_in_price === undefined ? 'auto' : branchTaxSettings.included_in_price,
  });

  const cached = resolvedPriceCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const request = (async () => {
    const settings = branchTaxSettings || (await getBranchTaxSettingsCached(businessId));

    if (settings.included_in_price) {
      return normalizedBasePrice;
    }

    const taxBreakdown = await taxesService.calculateProductTaxes(productId, normalizedBasePrice);
    return normalizedBasePrice + (normalizePrice(taxBreakdown?.total_tax) ?? 0);
  })().catch((error) => {
    console.warn('[display-pricing] No se pudo resolver el precio final:', error);
    return normalizedBasePrice;
  });

  resolvedPriceCache.set(cacheKey, request);
  return request;
}
