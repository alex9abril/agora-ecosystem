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
  children?: ProductCategory[];
  level?: number;
}

export interface CategoriesResponse {
  data: ProductCategory[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CategoryFilters {
  page?: number;
  limit?: number;
  businessId?: string;
  globalOnly?: boolean;
  isActive?: boolean;
  search?: string;
  parentCategoryId?: string;
}

export interface CategoryPayload {
  business_id?: string;
  name: string;
  description?: string;
  icon_url?: string | null;
  parent_category_id?: string;
  display_order?: number;
  is_active?: boolean;
}

function buildQuery(filters: CategoryFilters = {}): string {
  const params = new URLSearchParams();
  params.append('page', String(filters.page ?? 1));
  params.append('limit', String(filters.limit ?? 100));
  if (filters.businessId) params.append('businessId', filters.businessId);
  if (filters.globalOnly) params.append('globalOnly', 'true');
  if (filters.isActive !== undefined) params.append('isActive', String(filters.isActive));
  if (filters.search) params.append('search', filters.search);
  if (filters.parentCategoryId) params.append('parentCategoryId', filters.parentCategoryId);
  return params.toString();
}

export const categoriesService = {
  async list(filters: CategoryFilters = {}): Promise<CategoriesResponse> {
    return apiRequest<CategoriesResponse>(`/catalog/categories?${buildQuery(filters)}`, {
      method: 'GET',
    });
  },

  async listAll(filters: Omit<CategoryFilters, 'page' | 'limit'> = {}): Promise<ProductCategory[]> {
    const all: ProductCategory[] = [];
    let page = 1;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const response = await this.list({ ...filters, page, limit });
      all.push(...(response.data || []));
      if ((response.data || []).length < limit || page >= (response.pagination?.totalPages || 1)) {
        hasMore = false;
      } else {
        page += 1;
      }
    }

    return all;
  },

  async getById(id: string): Promise<ProductCategory> {
    return apiRequest<ProductCategory>(`/catalog/categories/${id}`, { method: 'GET' });
  },

  async create(payload: CategoryPayload): Promise<ProductCategory> {
    return apiRequest<ProductCategory>('/catalog/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async update(id: string, payload: Partial<CategoryPayload>): Promise<ProductCategory> {
    return apiRequest<ProductCategory>(`/catalog/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async remove(id: string): Promise<void> {
    await apiRequest(`/catalog/categories/${id}`, { method: 'DELETE' });
  },

  async uploadImage(categoryId: string, file: File): Promise<{ url: string; path: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return apiRequest<{ url: string; path: string }>(`/catalog/categories/${categoryId}/upload-image`, {
      method: 'POST',
      body: formData,
      headers: {},
    });
  },
};
