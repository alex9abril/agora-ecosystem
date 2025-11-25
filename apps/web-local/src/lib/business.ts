/**
 * Servicio para gestión de negocios/tiendas
 */

import { apiRequest } from './api';

export interface Business {
  id: string;
  owner_id: string;
  name: string;
  legal_name?: string;
  description?: string;
  category: string;
  tags?: string[];
  phone?: string;
  email?: string;
  website_url?: string;
  address_id?: string;
  location: {
    longitude: number;
    latitude: number;
  };
  is_active: boolean;
  is_verified: boolean;
  accepts_orders: boolean;
  commission_rate: number;
  uses_eco_packaging: boolean;
  opening_hours?: any;
  created_at: string;
  updated_at: string;
  // Campos del sistema de roles
  user_role?: 'superadmin' | 'admin' | 'operations_staff' | 'kitchen_staff';
  user_is_active_in_business?: boolean;
  // Campos de dirección
  business_address?: string;
  street?: string;
  street_number?: string;
  neighborhood?: string;
  address_city?: string;
  address_state?: string;
  postal_code?: string;
  address_country?: string;
}

export interface CreateBusinessData {
  name: string;
  legal_name?: string;
  description?: string;
  category: string;
  tags?: string[];
  phone?: string;
  email?: string;
  website_url?: string;
  longitude: number;
  latitude: number;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  opening_hours?: any;
  uses_eco_packaging?: boolean;
}

export interface BusinessCategory {
  id?: string;
  name: string;
  description?: string;
  icon_url?: string;
  display_order?: number;
  is_active?: boolean;
}

export interface ServiceRegion {
  id: string;
  name: string;
  description?: string;
  city: string;
  state: string;
  country: string;
  center_longitude: number;
  center_latitude: number;
  max_delivery_radius_meters: number;
  min_order_amount: number;
  coverage_area_geojson: string; // GeoJSON del polígono
}

export interface LocationValidation {
  isValid: boolean;
  region?: ServiceRegion;
  message?: string;
}

export const businessService = {
  /**
   * Obtener el negocio del usuario actual
   * Si se proporciona businessId, obtiene esa tienda específica
   */
  async getMyBusiness(businessId?: string): Promise<Business | null> {
    try {
      const url = businessId 
        ? `/businesses/my-business?businessId=${businessId}`
        : '/businesses/my-business';
      
      const business = await apiRequest<Business>(url, {
        method: 'GET',
      });
      return business;
    } catch (error: any) {
      // Si es 404, significa que no tiene negocio
      if (error.statusCode === 404) {
        console.log('[BusinessService] Usuario no tiene negocio (404)');
        return null;
      }
      // Si es 401, el token es inválido - dejar que el error se propague
      if (error.statusCode === 401) {
        console.error('[BusinessService] Token inválido o expirado');
        throw error;
      }
      // Otros errores
      console.error('[BusinessService] Error obteniendo negocio:', error);
      throw error;
    }
  },

  /**
   * Obtener catálogo de categorías de negocios
   */
  async getCategories(): Promise<BusinessCategory[]> {
    return apiRequest<BusinessCategory[]>('/businesses/categories', {
      method: 'GET',
    });
  },

  /**
   * Crear un nuevo negocio
   */
  async createBusiness(data: CreateBusinessData): Promise<Business> {
    return apiRequest<Business>('/businesses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Obtener la región activa de servicio
   */
  async getActiveRegion(): Promise<ServiceRegion | null> {
    try {
      return await apiRequest<ServiceRegion>('/businesses/active-region', {
        method: 'GET',
      });
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Validar si una ubicación está dentro de la región activa y obtener la zona específica
   */
  async validateLocation(longitude: number, latitude: number): Promise<LocationValidation & { regionName?: string }> {
    return apiRequest<LocationValidation & { regionName?: string }>(
      `/businesses/validate-location?longitude=${longitude}&latitude=${latitude}`,
      {
        method: 'GET',
      }
    );
  },

  /**
   * Actualizar la dirección de un negocio
   */
  async updateAddress(businessId: string, addressData: {
    longitude: number;
    latitude: number;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  }): Promise<Business> {
    return apiRequest<Business>(`/businesses/${businessId}/address`, {
      method: 'PATCH',
      body: JSON.stringify(addressData),
    });
  },

  /**
   * Actualizar información básica de un negocio
   */
  async updateBusiness(businessId: string, businessData: {
    name?: string;
    legal_name?: string;
    description?: string;
    category?: string;
    category_id?: string;
    phone?: string;
    email?: string;
    website_url?: string;
    tags?: string[];
  }): Promise<Business> {
    return apiRequest<Business>(`/businesses/${businessId}`, {
      method: 'PATCH',
      body: JSON.stringify(businessData),
    });
  },
};

