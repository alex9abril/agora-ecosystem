import { apiRequest } from './api';

export interface ProductClassification {
  id: string;
  business_id: string;
  name: string;
  slug: string;
  total_products?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateClassificationData {
  business_id: string;
  name: string;
  slug: string;
}

export interface UpdateClassificationData {
  name?: string;
  slug?: string;
}

type ClassificationListResponse = {
  data: ProductClassification[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
};

export const productClassificationsService = {
  async list(
    businessId: string,
    options?: { search?: string }
  ): Promise<ClassificationListResponse> {
    const params = new URLSearchParams();
    params.append('businessId', businessId);
    if (options?.search) {
      params.append('search', options.search);
    }

    const response = await apiRequest<ClassificationListResponse | ProductClassification[]>(
      `/catalog/classifications?${params.toString()}`,
      { method: 'GET' }
    );

    if (Array.isArray(response)) {
      return { data: response, pagination: undefined };
    }

    return {
      data: response?.data || [],
      pagination: response?.pagination,
    };
  },

  async create(data: CreateClassificationData): Promise<ProductClassification> {
    return apiRequest<ProductClassification>('/catalog/classifications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: UpdateClassificationData): Promise<ProductClassification> {
    return apiRequest<ProductClassification>(`/catalog/classifications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};
