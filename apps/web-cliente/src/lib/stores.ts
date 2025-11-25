/**
 * Servicio para obtener tiendas (público)
 */

import { apiRequest } from './api';

export interface Business {
  id: string;
  name: string;
  legal_name?: string;
  description?: string;
  category: string;
  is_active: boolean;
  is_verified: boolean;
  rating_average: number | string | null;
  total_reviews: number;
  total_orders: number;
  phone?: string;
  email?: string;
  created_at: string;
  longitude?: number;
  latitude?: number;
  image_url?: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_country?: string;
}

export interface BusinessesResponse {
  data: Business[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ListStoresParams {
  page?: number;
  limit?: number;
  isActive?: boolean;
  category?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Servicio de tiendas
 */
export const storesService = {
  /**
   * Obtener todas las tiendas (público, no requiere autenticación)
   */
  async getStores(params: ListStoresParams = {}): Promise<BusinessesResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
      if (params.category) queryParams.append('category', params.category);
      if (params.search) queryParams.append('search', params.search);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      const response = await apiRequest<BusinessesResponse>(
        `/businesses?${queryParams.toString()}`,
        { method: 'GET' }
      );
      
      return response;
    } catch (error: any) {
      console.error('Error obteniendo tiendas:', error);
      throw error;
    }
  },

  /**
   * Obtener una tienda por ID (público)
   */
  async getStore(storeId: string): Promise<Business> {
    try {
      const response = await apiRequest<Business>(`/businesses/${storeId}`, {
        method: 'GET',
      });
      return response;
    } catch (error: any) {
      console.error('Error obteniendo tienda:', error);
      throw error;
    }
  },

  /**
   * Obtener productos de una tienda (público)
   */
  async getStoreProducts(storeId: string, params: {
    page?: number;
    limit?: number;
    categoryId?: string;
    search?: string;
  } = {}): Promise<any> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('businessId', storeId);
      
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.categoryId) queryParams.append('categoryId', params.categoryId);
      if (params.search) queryParams.append('search', params.search);

      const response = await apiRequest(
        `/catalog/products?${queryParams.toString()}`,
        { method: 'GET' }
      );
      
      return response;
    } catch (error: any) {
      console.error('Error obteniendo productos de tienda:', error);
      throw error;
    }
  },
};

