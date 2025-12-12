/**
 * Servicio para obtener grupos empresariales
 */

import { apiRequest } from './api';
import { BusinessGroup } from '@/contexts/StoreContext';

export interface BusinessGroupResponse {
  data: BusinessGroup[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ListBusinessGroupsParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

/**
 * Servicio de grupos empresariales
 */
export const businessGroupsService = {
  /**
   * Obtener todos los grupos empresariales
   */
  async getGroups(params: ListBusinessGroupsParams = {}): Promise<BusinessGroupResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());

    const queryString = queryParams.toString();
    const url = `/businesses/groups${queryString ? `?${queryString}` : ''}`;
    
    return apiRequest<BusinessGroupResponse>(url, { method: 'GET' });
  },

  /**
   * Obtener un grupo por slug
   */
  async getGroupBySlug(slug: string): Promise<BusinessGroup> {
    return apiRequest<BusinessGroup>(`/businesses/groups/slug/${slug}`, { method: 'GET' });
  },

  /**
   * Obtener un grupo por ID
   */
  async getGroupById(id: string): Promise<BusinessGroup> {
    return apiRequest<BusinessGroup>(`/businesses/groups/id/${id}`, { method: 'GET' });
  },
};

