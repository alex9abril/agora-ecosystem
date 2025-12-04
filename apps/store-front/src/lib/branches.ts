/**
 * Servicio para obtener sucursales (branches)
 */

import { apiRequest } from './api';
import { Business } from '@/contexts/StoreContext';

export interface BusinessResponse {
  data: Business[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ListBranchesParams {
  page?: number;
  limit?: number;
  groupId?: string;
  search?: string;
  isActive?: boolean;
  latitude?: number;
  longitude?: number;
  radius?: number; // en metros
}

/**
 * Servicio de sucursales
 */
export const branchesService = {
  /**
   * Obtener todas las sucursales
   */
  async getBranches(params: ListBranchesParams = {}): Promise<BusinessResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.groupId) queryParams.append('groupId', params.groupId);
    if (params.search) queryParams.append('search', params.search);
    if (params.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    if (params.latitude) queryParams.append('latitude', params.latitude.toString());
    if (params.longitude) queryParams.append('longitude', params.longitude.toString());
    if (params.radius) queryParams.append('radius', params.radius.toString());

    const queryString = queryParams.toString();
    const url = `/businesses/branches${queryString ? `?${queryString}` : ''}`;
    
    return apiRequest<BusinessResponse>(url, { method: 'GET' });
  },

  /**
   * Obtener una sucursal por slug
   */
  async getBranchBySlug(slug: string): Promise<Business> {
    return apiRequest<Business>(`/businesses/branches/${slug}`, { method: 'GET' });
  },

  /**
   * Obtener una sucursal por ID
   */
  async getBranchById(id: string): Promise<Business> {
    return apiRequest<Business>(`/businesses/branches/id/${id}`, { method: 'GET' });
  },

  /**
   * Obtener sucursales cercanas por ubicación
   */
  async getNearbyBranches(latitude: number, longitude: number, radius: number = 5000): Promise<BusinessResponse> {
    return this.getBranches({
      latitude,
      longitude,
      radius,
      isActive: true,
    });
  },

  /**
   * Obtener sucursales de un grupo
   */
  async getBranchesByGroup(groupId: string, params: Omit<ListBranchesParams, 'groupId'> = {}): Promise<BusinessResponse> {
    return this.getBranches({
      ...params,
      groupId,
    });
  },
};

