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

