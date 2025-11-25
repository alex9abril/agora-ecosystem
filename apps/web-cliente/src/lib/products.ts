/**
 * Servicio para obtener productos (público)
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
  businessId?: string;
  categoryId?: string;
  isAvailable?: boolean;
  isFeatured?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Servicio de productos
 */
export const productsService = {
  /**
   * Obtener todos los productos (público, no requiere autenticación)
   */
  async getProducts(params: ListProductsParams = {}): Promise<ProductsResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.businessId) queryParams.append('businessId', params.businessId);
      if (params.categoryId) queryParams.append('categoryId', params.categoryId);
      if (params.isAvailable !== undefined) queryParams.append('isAvailable', params.isAvailable.toString());
      if (params.isFeatured !== undefined) queryParams.append('isFeatured', params.isFeatured.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      const response = await apiRequest<ProductsResponse>(
        `/catalog/products?${queryParams.toString()}`,
        { method: 'GET' }
      );
      
      return response;
    } catch (error: any) {
      console.error('Error obteniendo productos:', error);
      throw error;
    }
  },

  /**
   * Obtener un producto por ID (público)
   */
  async getProduct(productId: string): Promise<Product> {
    try {
      const response = await apiRequest<Product>(`/catalog/products/${productId}`, {
        method: 'GET',
      });
      return response;
    } catch (error: any) {
      console.error('Error obteniendo producto:', error);
      throw error;
    }
  },

  /**
   * Obtener categorías de productos (público)
   */
  async getCategories(): Promise<any[]> {
    try {
      const response = await apiRequest<{ data: any[] }>('/catalog/categories?limit=100&isActive=true', {
        method: 'GET',
      });
      return response.data || [];
    } catch (error: any) {
      console.error('Error obteniendo categorías:', error);
      throw error;
    }
  },
};

