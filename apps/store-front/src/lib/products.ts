/**
 * Servicio para obtener productos con soporte para contexto (global/grupo/sucursal)
 */

import { apiRequest } from './api';

export interface ProductVariant {
  variant_id: string;
  variant_name: string;
  description?: string;
  price_adjustment?: number;
  absolute_price?: number;
  is_available: boolean;
  display_order: number;
}

export interface ProductVariantGroup {
  variant_group_id: string;
  variant_group_name: string;
  description?: string;
  is_required: boolean;
  selection_type: 'single' | 'multiple';
  display_order: number;
  variants: ProductVariant[];
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  image_url?: string;
  price: number;
  product_type: 'food' | 'medicine' | 'non_food';
  category_id?: string;
  category_name?: string;
  category_display_order?: number;
  is_available: boolean;
  is_featured: boolean;
  display_order: number;
  variant_groups?: ProductVariantGroup[];
  variants?: any; // Legacy format
  allergens?: string[];
  nutritional_info?: any;
  requires_prescription?: boolean;
  age_restriction?: number;
  max_quantity_per_order?: number;
  requires_pharmacist_validation?: boolean;
  // Campos específicos por sucursal (cuando se filtra por branchId)
  branch_price?: number;
  branch_stock?: number;
  branch_is_enabled?: boolean;
}

export interface ProductsResponse {
  data: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ListProductsParams {
  page?: number;
  limit?: number;
  groupId?: string;      // Filtro por grupo empresarial
  branchId?: string;     // Filtro por sucursal específica
  brandId?: string;      // Filtro por marca de vehículo (alias para vehicleBrandId)
  vehicleBrandId?: string; // Filtro por marca de vehículo
  categoryId?: string;
  isAvailable?: boolean;
  isFeatured?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ProductBranchAvailability {
  branch_id: string;
  branch_name: string;
  branch_slug?: string;
  branch_address?: string;
  branch_phone?: string;
  is_enabled: boolean;
  price: number | null;
  stock: number | null;
  is_active: boolean;
}

/**
 * Servicio de productos
 */
export const productsService = {
  /**
   * Obtener todos los productos (público, no requiere autenticación)
   * Soporta filtros por contexto (groupId, branchId)
   */
  async getProducts(params: ListProductsParams = {}): Promise<ProductsResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.groupId) queryParams.append('groupId', params.groupId);
    if (params.branchId) queryParams.append('branchId', params.branchId);
    if (params.vehicleBrandId) queryParams.append('vehicleBrandId', params.vehicleBrandId);
    if (params.brandId) queryParams.append('vehicleBrandId', params.brandId); // Alias para brandId
    if (params.categoryId) queryParams.append('categoryId', params.categoryId);
    if (params.isAvailable !== undefined) queryParams.append('isAvailable', params.isAvailable.toString());
    if (params.isFeatured !== undefined) queryParams.append('isFeatured', params.isFeatured.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const queryString = queryParams.toString();
    const url = `/catalog/products${queryString ? `?${queryString}` : ''}`;
    
    return apiRequest<ProductsResponse>(url, { method: 'GET' });
  },

  /**
   * Obtener un producto por ID
   * Si se proporciona branchId, incluye precio y stock específicos de la sucursal
   */
  async getProduct(productId: string, branchId?: string): Promise<Product> {
    const queryParams = new URLSearchParams();
    if (branchId) {
      queryParams.append('branchId', branchId);
    }
    
    const queryString = queryParams.toString();
    const url = `/catalog/products/${productId}${queryString ? `?${queryString}` : ''}`;
    
    return apiRequest<Product>(url, { method: 'GET' });
  },

  /**
   * Obtener disponibilidad de un producto en todas las sucursales
   * @param productId ID del producto
   * @param groupId Opcional: filtrar por grupo empresarial
   * @param brandId Opcional: filtrar por marca de vehículo
   */
  async getProductBranchAvailability(
    productId: string,
    groupId?: string,
    brandId?: string
  ): Promise<{
    availabilities: ProductBranchAvailability[];
  }> {
    const queryParams = new URLSearchParams();
    if (groupId) queryParams.append('groupId', groupId);
    if (brandId) queryParams.append('brandId', brandId);
    
    const queryString = queryParams.toString();
    const url = `/catalog/products/${productId}/branch-availability${queryString ? `?${queryString}` : ''}`;
    
    console.log('🌐 [productsService] getProductBranchAvailability called:', {
      productId,
      groupId,
      brandId,
      url,
    });
    
    try {
      const response = await apiRequest<{ availabilities: ProductBranchAvailability[] }>(url, { method: 'GET' });
      console.log('✅ [productsService] getProductBranchAvailability response:', {
        count: response.availabilities?.length || 0,
        availabilities: response.availabilities?.map(a => ({
          branch_id: a.branch_id,
          branch_name: a.branch_name,
          price: a.price,
          stock: a.stock,
          is_enabled: a.is_enabled,
          is_active: a.is_active,
        })),
      });
      return response;
    } catch (error) {
      console.error('❌ [productsService] getProductBranchAvailability error:', error);
      throw error;
    }
  },
};

