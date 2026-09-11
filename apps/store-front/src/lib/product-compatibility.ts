/**
 * Servicio para verificar compatibilidad de productos con vehículos
 */

import { apiRequest } from './api';

export interface CompatibilityCheckParams {
  vehicleVariantId?: string;
  brandId?: string;
  modelId?: string;
  yearId?: string;
  specId?: string;
}

export interface CompatibilityCheckResponse {
  is_compatible: boolean;
}

/** Una compatibilidad de producto (vehicle_variants / product_vehicle_compatibility) */
export interface ProductCompatibilityItem {
  id: string;
  product_id: string;
  vehicle_variant_id?: string | null;
  is_universal: boolean;
  notes?: string | null;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  body_trim?: string | null;
  engine_transmission?: string | null;
}

export interface GroupedCompatibilityRow {
  id: string;
  is_universal: boolean;
  make: string | null;
  model: string | null;
  year_label: string;
  body_trim: string | null;
  engine_transmission: string | null;
}

function normalizeCompatPart(value?: string | null): string {
  return (value || '').trim().toLowerCase();
}

/**
 * Agrupa años consecutivos del mismo make/model/versión/motor solo para vista.
 * Toyota Tacoma 2016, 2017... 2023 → Toyota Tacoma 2016-2023.
 */
export function groupCompatibilitiesForDisplay(
  items: ProductCompatibilityItem[],
): GroupedCompatibilityRow[] {
  const universals = items.filter((item) => item.is_universal);
  const specific = items.filter((item) => !item.is_universal);
  const groups = new Map<string, ProductCompatibilityItem[]>();

  for (const item of specific) {
    const key = [
      normalizeCompatPart(item.make),
      normalizeCompatPart(item.model),
      normalizeCompatPart(item.body_trim),
      normalizeCompatPart(item.engine_transmission),
    ].join('|');
    const list = groups.get(key) || [];
    list.push(item);
    groups.set(key, list);
  }

  const rows: GroupedCompatibilityRow[] = [];

  for (const item of universals) {
    rows.push({
      id: item.id,
      is_universal: true,
      make: null,
      model: null,
      year_label: '—',
      body_trim: null,
      engine_transmission: null,
    });
  }

  for (const list of groups.values()) {
    const years = Array.from(
      new Set(list.map((item) => Number(item.year)).filter((year) => Number.isFinite(year))),
    ).sort((a, b) => a - b);

    const ranges: Array<{ start: number; end: number }> = [];
    for (const year of years) {
      const last = ranges[ranges.length - 1];
      if (last && last.end + 1 === year) {
        last.end = year;
      } else {
        ranges.push({ start: year, end: year });
      }
    }

    const sample = list[0];
    const yearLabel =
      ranges.length === 0
        ? '—'
        : ranges.map((range) => (range.start === range.end ? `${range.start}` : `${range.start}-${range.end}`)).join(', ');

    rows.push({
      id: list.map((item) => item.id).join('-'),
      is_universal: false,
      make: sample.make ?? null,
      model: sample.model ?? null,
      year_label: yearLabel,
      body_trim: sample.body_trim ?? null,
      engine_transmission: sample.engine_transmission ?? null,
    });
  }

  return rows.sort((a, b) => {
    if (a.is_universal !== b.is_universal) return a.is_universal ? -1 : 1;
    const makeCmp = (a.make || '').localeCompare(b.make || '');
    if (makeCmp !== 0) return makeCmp;
    const modelCmp = (a.model || '').localeCompare(b.model || '');
    if (modelCmp !== 0) return modelCmp;
    return a.year_label.localeCompare(b.year_label);
  });
}

/**
 * Verificar si un producto es compatible con un vehículo
 */
export async function checkProductCompatibility(
  productId: string,
  params: CompatibilityCheckParams
): Promise<boolean> {
  try {
    const queryParams = new URLSearchParams();
    if (params.vehicleVariantId) {
      queryParams.append('vehicleVariantId', params.vehicleVariantId);
    } else {
      if (params.brandId) queryParams.append('brandId', params.brandId);
      if (params.modelId) queryParams.append('modelId', params.modelId);
      if (params.yearId) queryParams.append('yearId', params.yearId);
      if (params.specId) queryParams.append('specId', params.specId);
    }
    const queryString = queryParams.toString();
    const url = `/catalog/vehicles/products/${productId}/compatibility${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiRequest<CompatibilityCheckResponse>(url, {
      method: 'GET',
    });
    
    return response.is_compatible || false;
  } catch (error: any) {
    console.error('[ProductCompatibility] Error verificando compatibilidad:', error);
    // En caso de error, retornar false para ser conservador
    return false;
  }
}

/**
 * Obtener la lista de compatibilidades de un producto (vehicle_variants)
 */
export async function getProductCompatibilities(
  productId: string
): Promise<ProductCompatibilityItem[]> {
  try {
    const data = await apiRequest<ProductCompatibilityItem[]>(
      `/catalog/vehicles/products/${productId}/compatibilities`,
      { method: 'GET' }
    );
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    console.error('[ProductCompatibility] Error obteniendo compatibilidades:', error);
    return [];
  }
}

