import { apiRequest } from './api';

export interface ProductCollection {
  id: string;
  business_id: string;
  name: string;
  slug: string;
  status?: 'active' | 'inactive';
  image_url?: string | null;
  description?: string | null;
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
  description?: string;
}

export interface UpdateCollectionData {
  name?: string;
  slug?: string;
  status?: 'active' | 'inactive';
  image_url?: string;
  description?: string;
}

type CollectionListResponse = {
  data: ProductCollection[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
};

export interface CollectionProductRow {
  id: string;
  name: string;
  sku?: string;
  price?: number;
  is_available?: boolean;
  image_url?: string | null;
  status?: 'active' | 'inactive';
}

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

  async listProducts(collectionId: string, businessId: string): Promise<{ data: CollectionProductRow[] }> {
    const params = new URLSearchParams();
    params.append('businessId', businessId);
    return apiRequest<{ data: CollectionProductRow[] }>(
      `/catalog/collections/${collectionId}/products?${params.toString()}`,
      { method: 'GET' },
    );
  },

  async removeProduct(collectionId: string, productId: string, businessId: string): Promise<{ product_id: string }> {
    const params = new URLSearchParams();
    params.append('businessId', businessId);
    return apiRequest<{ product_id: string }>(
      `/catalog/collections/${collectionId}/products/${productId}?${params.toString()}`,
      { method: 'DELETE' },
    );
  },

  async addProduct(collectionId: string, productId: string, businessId: string): Promise<{ product_id: string }> {
    const params = new URLSearchParams();
    params.append('businessId', businessId);
    return apiRequest<{ product_id: string }>(
      `/catalog/collections/${collectionId}/products?${params.toString()}`,
      {
        method: 'POST',
        body: JSON.stringify({ productId }),
      },
    );
  },

  async searchAvailableProducts(
    businessId: string,
    search: string,
    limit: number = 10,
  ): Promise<{ data: CollectionProductRow[] }> {
    const params = new URLSearchParams();
    params.append('businessId', businessId);
    params.append('search', search);
    params.append('limit', limit.toString());
    return apiRequest<{ data: CollectionProductRow[] }>(
      `/catalog/collections/available-products?${params.toString()}`,
      { method: 'GET' },
    );
  },
};
