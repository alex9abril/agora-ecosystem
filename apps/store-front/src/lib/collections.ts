import { apiRequest } from './api';

export interface StoreCollection {
  id: string;
  business_id: string;
  name: string;
  slug: string;
  status?: 'active' | 'inactive';
  image_url?: string | null;
}

export const collectionsService = {
  async list(businessId: string): Promise<{ data: StoreCollection[] }> {
    const params = new URLSearchParams();
    params.append('businessId', businessId);
    params.append('status', 'active');
    return apiRequest<{ data: StoreCollection[] }>(
      `/catalog/collections?${params.toString()}`,
      { method: 'GET' },
    );
  },
};
