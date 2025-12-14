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
  accepts_pickup?: boolean;
  slug?: string;
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
  // Campos de grupo empresarial
  business_group_id?: string; // ID del grupo empresarial al que pertenece
  business_group_name?: string; // Nombre del grupo empresarial (para mostrar)
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
  slug?: string;
  accepts_pickup?: boolean;
  is_active?: boolean;
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

export interface BusinessGroup {
  id: string;
  owner_id: string;
  name: string;
  legal_name?: string;
  description?: string;
  slug: string;
  logo_url?: string;
  website_url?: string;
  tax_id?: string;
  settings?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateBusinessGroupData {
  name: string;
  legal_name?: string;
  description?: string;
  slug?: string;
  logo_url?: string;
  website_url?: string;
  tax_id?: string;
  settings?: Record<string, any>;
  is_active?: boolean;
}

export interface UpdateBusinessGroupData {
  name?: string;
  legal_name?: string;
  description?: string;
  slug?: string;
  logo_url?: string;
  website_url?: string;
  tax_id?: string;
  settings?: Record<string, any>;
  is_active?: boolean;
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
    slug?: string;
    accepts_pickup?: boolean;
    is_active?: boolean;
  }): Promise<Business> {
    return apiRequest<Business>(`/businesses/${businessId}`, {
      method: 'PATCH',
      body: JSON.stringify(businessData),
    });
  },

  /**
   * Obtener todas las sucursales (tiendas) del usuario actual
   */
  async getAllBranches(userId: string): Promise<Business[]> {
    try {
      // Usar el endpoint de business-users para obtener todas las tiendas del usuario
      const summary = await apiRequest<Array<{
        business_id: string;
        business_name: string;
        role: string;
        is_active: boolean;
      }>>(`/business-users/user/${userId}/summary`, {
        method: 'GET',
      });

      // Obtener los detalles completos de cada sucursal
      const branches = await Promise.all(
        summary.map(async (item) => {
          try {
            return await this.getMyBusiness(item.business_id);
          } catch (error) {
            console.error(`Error obteniendo detalles de sucursal ${item.business_id}:`, error);
            return null;
          }
        })
      );

      return branches.filter((b): b is Business => b !== null);
    } catch (error: any) {
      console.error('Error obteniendo sucursales:', error);
      throw error;
    }
  },

  /**
   * Obtener todas las marcas de vehículos disponibles
   */
  async getAvailableVehicleBrands(): Promise<Array<{ id: string; name: string; code: string; display_order: number }>> {
    try {
      console.log('[BusinessService] Obteniendo marcas disponibles...');
      const brands = await apiRequest<Array<{ id: string; name: string; code: string; display_order: number }>>(
        '/businesses/vehicle-brands/available',
        { method: 'GET' }
      );
      console.log('[BusinessService] Marcas disponibles obtenidas:', brands.length);
      return brands;
    } catch (error: any) {
      console.error('[BusinessService] Error obteniendo marcas disponibles:', error);
      throw error;
    }
  },

  /**
   * Obtener las marcas asignadas a una sucursal
   */
  async getBusinessVehicleBrands(businessId: string): Promise<Array<{ brand_id: string; brand_name: string; brand_code: string; display_order: number }>> {
    try {
      console.log('[BusinessService] Obteniendo marcas de la sucursal:', businessId);
      const brands = await apiRequest<Array<{ brand_id: string; brand_name: string; brand_code: string; display_order: number }>>(
        `/businesses/${businessId}/vehicle-brands`,
        { method: 'GET' }
      );
      console.log('[BusinessService] Marcas de la sucursal obtenidas:', brands.length);
      return brands;
    } catch (error: any) {
      console.error('[BusinessService] Error obteniendo marcas de la sucursal:', error);
      // Si es 404, puede que la función SQL no exista, retornar array vacío
      if (error.statusCode === 404) {
        console.warn('[BusinessService] Endpoint no encontrado, retornando array vacío');
        return [];
      }
      throw error;
    }
  },

  /**
   * Agregar una marca a una sucursal
   */
  async addVehicleBrandToBusiness(businessId: string, brandId: string): Promise<Array<{ brand_id: string; brand_name: string; brand_code: string; display_order: number }>> {
    try {
      const brands = await apiRequest<Array<{ brand_id: string; brand_name: string; brand_code: string; display_order: number }>>(
        `/businesses/${businessId}/vehicle-brands/${brandId}`,
        { method: 'POST' }
      );
      return brands;
    } catch (error: any) {
      console.error('[BusinessService] Error agregando marca:', error);
      throw error;
    }
  },

  /**
   * Quitar una marca de una sucursal
   */
  async removeVehicleBrandFromBusiness(businessId: string, brandId: string): Promise<Array<{ brand_id: string; brand_name: string; brand_code: string; display_order: number }>> {
    try {
      const brands = await apiRequest<Array<{ brand_id: string; brand_name: string; brand_code: string; display_order: number }>>(
        `/businesses/${businessId}/vehicle-brands/${brandId}`,
        { method: 'DELETE' }
      );
      return brands;
    } catch (error: any) {
      console.error('[BusinessService] Error quitando marca:', error);
      throw error;
    }
  },

  // ============================================================================
  // BUSINESS GROUPS (Grupos Empresariales)
  // ============================================================================

  /**
   * Obtener el grupo empresarial del usuario actual
   */
  async getMyBusinessGroup(): Promise<BusinessGroup | null> {
    try {
      const group = await apiRequest<BusinessGroup>('/businesses/my-business-group', {
        method: 'GET',
      });
      return group;
    } catch (error: any) {
      // Si es 404, significa que no tiene grupo empresarial
      if (error.statusCode === 404) {
        console.log('[BusinessService] Usuario no tiene grupo empresarial (404)');
        return null;
      }
      // Si es 401, el token es inválido - dejar que el error se propague
      if (error.statusCode === 401) {
        console.error('[BusinessService] Token inválido o expirado');
        throw error;
      }
      // Otros errores
      console.error('[BusinessService] Error obteniendo grupo empresarial:', error);
      throw error;
    }
  },

  /**
   * Crear un nuevo grupo empresarial
   */
  async createBusinessGroup(data: CreateBusinessGroupData): Promise<BusinessGroup> {
    return apiRequest<BusinessGroup>('/businesses/business-groups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Actualizar un grupo empresarial
   */
  async updateBusinessGroup(groupId: string, data: UpdateBusinessGroupData): Promise<BusinessGroup> {
    return apiRequest<BusinessGroup>(`/businesses/business-groups/${groupId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Obtener sucursales con filtros (público)
   */
  async getBranches(filters?: {
    groupId?: string;
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ data: Business[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    try {
      const params = new URLSearchParams();
      if (filters?.groupId) params.append('groupId', filters.groupId);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString());
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const queryString = params.toString();
      const url = `/businesses/branches${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiRequest<{
        data: Business[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>(url, {
        method: 'GET',
      });

      return response;
    } catch (error: any) {
      console.error('Error obteniendo sucursales:', error);
      throw error;
    }
  },

  /**
   * Obtener sucursales sin grupo empresarial asignado
   */
  async getBranchesWithoutGroup(userId: string): Promise<Business[]> {
    try {
      const allBranches = await this.getAllBranches(userId);
      // Filtrar sucursales que no tienen business_group_id
      return allBranches.filter(branch => !(branch as any).business_group_id);
    } catch (error: any) {
      console.error('[BusinessService] Error obteniendo sucursales sin grupo:', error);
      throw error;
    }
  },

  /**
   * Actualizar el grupo empresarial de una sucursal
   */
  async updateBranchGroup(branchId: string, businessGroupId: string | null): Promise<Business> {
    return apiRequest<Business>(`/businesses/${branchId}`, {
      method: 'PATCH',
      body: JSON.stringify({ business_group_id: businessGroupId }),
    });
  },
};

