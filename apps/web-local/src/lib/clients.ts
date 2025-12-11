/**
 * Servicio para gestión de clientes
 */

import { apiRequest } from './api';

export interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  phone_verified?: boolean;
  profile_image_url?: string;
  is_active: boolean;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
  last_sign_in_at?: string;
  total_orders: number;
  total_spent: number;
  avg_rating_given: number;
  total_reviews_given: number;
  completed_orders: number;
  cancelled_orders: number;
}

export interface ClientFilters {
  search?: string;
  is_active?: boolean;
  is_blocked?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ClientsResponse {
  data: Client[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const clientsService = {
  /**
   * Listar clientes con filtros y paginación
   */
  async getClients(filters?: ClientFilters): Promise<ClientsResponse> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    if (filters?.is_blocked !== undefined) params.append('is_blocked', filters.is_blocked.toString());
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

    const queryString = params.toString();
    return apiRequest<ClientsResponse>(`/clients${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Obtener detalle de un cliente
   */
  async getClient(clientId: string): Promise<Client> {
    return apiRequest<Client>(`/clients/${clientId}`);
  },
};

