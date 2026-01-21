import { apiRequest } from './api';

export interface ProductCollection {
  id: string;
  business_id: string;
  name: string;
  slug: string;
  status?: 'active' | 'inactive';
  image_url?: string | null;
  total_products?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateCollectionData {
  business_id: string;
  name: string;
  slug: string;
  status?: 'active' | 'inactive';
  image_url?: string;
}

export interface UpdateCollectionData {
  name?: string;
  slug?: string;
  status?: 'active' | 'inactive';
  image_url?: string;
}

type CollectionListResponse = {
  data: ProductCollection[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
};

export const productCollectionsService = {
  async list(
    businessId: string,
    options?: { search?: string; status?: 'active' | 'inactive' | 'all' },
  ): Promise<CollectionListResponse> {
    const params = new URLSearchParams();
    params.append('businessId', businessId);
    if (options?.search) {
      params.append('search', options.search);
    }
    if (options?.status) {
      params.append('status', options.status);
    }

    const response = await apiRequest<CollectionListResponse | ProductCollection[]>(
      `/catalog/collections?${params.toString()}`,
      { method: 'GET' },
    );

    if (Array.isArray(response)) {
      return { data: response, pagination: undefined };
    }

    return {
      data: response?.data || [],
      pagination: response?.pagination,
    };
  },

  async get(id: string): Promise<ProductCollection> {
    return apiRequest<ProductCollection>(`/catalog/collections/${id}`, {
      method: 'GET',
    });
  },

  async create(data: CreateCollectionData): Promise<ProductCollection> {
    return apiRequest<ProductCollection>('/catalog/collections', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: UpdateCollectionData): Promise<ProductCollection> {
    return apiRequest<ProductCollection>(`/catalog/collections/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async remove(id: string): Promise<{ id: string }> {
    return apiRequest<{ id: string }>(`/catalog/collections/${id}`, {
      method: 'DELETE',
    });
  },
};
