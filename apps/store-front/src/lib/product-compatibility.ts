/**
 * Servicio para verificar compatibilidad de productos con vehículos
 */

import { apiRequest } from './api';

export interface CompatibilityCheckParams {
  brandId?: string;
  modelId?: string;
  yearId?: string;
  specId?: string;
}

export interface CompatibilityCheckResponse {
  is_compatible: boolean;
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
    
    if (params.brandId) queryParams.append('brandId', params.brandId);
    if (params.modelId) queryParams.append('modelId', params.modelId);
    if (params.yearId) queryParams.append('yearId', params.yearId);
    if (params.specId) queryParams.append('specId', params.specId);
    
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

