/**
 * Servicio para gestión de vehículos y compatibilidad
 */

import { apiRequest } from './api';

export interface VehicleBrand {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface VehicleModel {
  id: string;
  brand_id: string;
  name: string;
  code: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface VehicleYear {
  id: string;
  model_id: string;
  year_start: number;
  year_end: number | null;
  generation: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VehicleSpec {
  id: string;
  year_id: string;
  engine_code: string | null;
  engine_displacement: string | null;
  engine_cylinders: number | null;
  transmission_type: string | null;
  transmission_speeds: number | null;
  drivetrain: string | null;
  body_type: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserVehicle {
  brand_id: string;
  brand_name?: string;
  model_id?: string;
  model_name?: string;
  year_id?: string;
  year_start?: number;
  year_end?: number | null;
  generation?: string | null;
  spec_id?: string;
  engine_code?: string | null;
  transmission_type?: string | null;
}

export interface ProductCompatibility {
  id: string;
  product_id: string;
  vehicle_spec_id: string | null;
  vehicle_year_id: string | null;
  vehicle_model_id: string | null;
  vehicle_brand_id: string | null;
  is_universal: boolean;
  notes: string | null;
  is_active: boolean;
  brand_name?: string;
  model_name?: string;
  year_start?: number;
  year_end?: number | null;
  generation?: string | null;
  engine_code?: string | null;
  transmission_type?: string | null;
}

export const vehiclesService = {
  /**
   * Obtener todas las marcas de vehículos
   */
  async getBrands(): Promise<VehicleBrand[]> {
    try {
      const brands = await apiRequest<VehicleBrand[]>('/catalog/vehicles/brands', {
        method: 'GET',
      });
      return brands || [];
    } catch (error: any) {
      console.error('[VehiclesService] Error obteniendo marcas:', error);
      return [];
    }
  },

  /**
   * Obtener modelos por marca
   */
  async getModelsByBrand(brandId: string): Promise<VehicleModel[]> {
    try {
      const models = await apiRequest<VehicleModel[]>(`/catalog/vehicles/brands/${brandId}/models`, {
        method: 'GET',
      });
      return models || [];
    } catch (error: any) {
      console.error('[VehiclesService] Error obteniendo modelos:', error);
      return [];
    }
  },

  /**
   * Obtener años/generaciones por modelo
   */
  async getYearsByModel(modelId: string): Promise<VehicleYear[]> {
    try {
      const years = await apiRequest<VehicleYear[]>(`/catalog/vehicles/models/${modelId}/years`, {
        method: 'GET',
      });
      return years || [];
    } catch (error: any) {
      console.error('[VehiclesService] Error obteniendo años:', error);
      return [];
    }
  },

  /**
   * Obtener especificaciones por año
   */
  async getSpecsByYear(yearId: string): Promise<VehicleSpec[]> {
    try {
      const specs = await apiRequest<VehicleSpec[]>(`/catalog/vehicles/years/${yearId}/specs`, {
        method: 'GET',
      });
      return specs || [];
    } catch (error: any) {
      console.error('[VehiclesService] Error obteniendo especificaciones:', error);
      return [];
    }
  },

  /**
   * Verificar compatibilidad de un producto con un vehículo
   */
  async checkProductCompatibility(
    productId: string,
    vehicle: UserVehicle
  ): Promise<boolean> {
    try {
      const params = new URLSearchParams();
      if (vehicle.brand_id) params.append('brandId', vehicle.brand_id);
      if (vehicle.model_id) params.append('modelId', vehicle.model_id);
      if (vehicle.year_id) params.append('yearId', vehicle.year_id);
      if (vehicle.spec_id) params.append('specId', vehicle.spec_id);

      const result = await apiRequest<{ is_compatible: boolean }>(
        `/catalog/vehicles/products/${productId}/compatibility?${params.toString()}`,
        { method: 'GET' }
      );
      return result?.is_compatible || false;
    } catch (error: any) {
      console.error('[VehiclesService] Error verificando compatibilidad:', error);
      return false;
    }
  },

  /**
   * Obtener compatibilidades de un producto
   */
  async getProductCompatibilities(productId: string): Promise<ProductCompatibility[]> {
    try {
      const compatibilities = await apiRequest<ProductCompatibility[]>(
        `/catalog/vehicles/products/${productId}/compatibilities`,
        { method: 'GET' }
      );
      return compatibilities || [];
    } catch (error: any) {
      console.error('[VehiclesService] Error obteniendo compatibilidades:', error);
      return [];
    }
  },

  /**
   * Agregar compatibilidad a un producto
   */
  async addProductCompatibility(
    productId: string,
    data: {
      vehicle_brand_id?: string;
      vehicle_model_id?: string;
      vehicle_year_id?: string;
      vehicle_spec_id?: string;
      is_universal?: boolean;
      notes?: string;
    }
  ): Promise<ProductCompatibility> {
    const compatibility = await apiRequest<ProductCompatibility>(
      `/catalog/vehicles/products/${productId}/compatibility`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return compatibility;
  },

  /**
   * Eliminar compatibilidad de un producto
   */
  async removeProductCompatibility(compatibilityId: string): Promise<void> {
    await apiRequest(`/catalog/vehicles/compatibility/${compatibilityId}`, {
      method: 'DELETE',
    });
  },
};

