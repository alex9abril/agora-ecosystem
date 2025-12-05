/**
 * Servicio para obtener categorías de productos
 */

import { apiRequest } from './api';

export interface ProductCategory {
  id: string;
  business_id?: string | null;
  business_name?: string | null;
  name: string;
  description?: string | null;
  icon_url?: string | null;
  parent_category_id?: string | null;
  parent_category_name?: string | null;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  total_products?: number;
}

export interface CategoriesResponse {
  data: ProductCategory[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ListCategoriesParams {
  page?: number;
  limit?: number;
  businessId?: string;
  globalOnly?: boolean;
  isActive?: boolean;
  parentCategoryId?: string | null;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Servicio de categorías
 */
export const categoriesService = {
  /**
   * Obtener todas las categorías
   */
  async getCategories(params: ListCategoriesParams = {}): Promise<CategoriesResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.businessId) queryParams.append('businessId', params.businessId);
    if (params.globalOnly !== undefined) queryParams.append('globalOnly', params.globalOnly.toString());
    if (params.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    if (params.parentCategoryId !== undefined) {
      if (params.parentCategoryId === null) {
        queryParams.append('parentCategoryId', 'null');
      } else {
        queryParams.append('parentCategoryId', params.parentCategoryId);
      }
    }
    if (params.search) queryParams.append('search', params.search);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const queryString = queryParams.toString();
    const url = `/catalog/categories${queryString ? `?${queryString}` : ''}`;
    
    return apiRequest<CategoriesResponse>(url, { method: 'GET' });
  },

  /**
   * Obtener una categoría por ID
   */
  async getCategoryById(id: string): Promise<ProductCategory> {
    return apiRequest<ProductCategory>(`/catalog/categories/${id}`, { method: 'GET' });
  },

  /**
   * Obtener categorías raíz (sin padre)
   */
  async getRootCategories(params: Omit<ListCategoriesParams, 'parentCategoryId'> = {}): Promise<CategoriesResponse> {
    return this.getCategories({
      ...params,
      parentCategoryId: null,
    });
  },

  /**
   * Obtener subcategorías de una categoría
   */
  async getSubcategories(parentCategoryId: string, params: Omit<ListCategoriesParams, 'parentCategoryId'> = {}): Promise<CategoriesResponse> {
    return this.getCategories({
      ...params,
      parentCategoryId,
    });
  },
};

