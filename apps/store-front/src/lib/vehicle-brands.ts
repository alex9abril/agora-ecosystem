/**
 * Servicio para interactuar con la API de marcas de vehículos
 */

import { apiRequest } from './api';

export interface VehicleBrand {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
}

class VehicleBrandsService {
  /**
   * Obtener todas las marcas de vehículos activas
   */
  async getBrands(): Promise<VehicleBrand[]> {
    try {
      const response = await apiRequest<VehicleBrand[]>('/catalog/vehicles/brands');
      return response;
    } catch (error) {
      console.error('Error obteniendo marcas de vehículos:', error);
      throw error;
    }
  }

  /**
   * Obtener una marca por su código
   */
  async getBrandByCode(code: string): Promise<VehicleBrand | null> {
    try {
      const brands = await this.getBrands();
      return brands.find(b => b.code.toLowerCase() === code.toLowerCase()) || null;
    } catch (error) {
      console.error('Error obteniendo marca por código:', error);
      throw error;
    }
  }

  /**
   * Obtener una marca por su ID
   */
  async getBrandById(id: string): Promise<VehicleBrand | null> {
    try {
      const brands = await this.getBrands();
      return brands.find(b => b.id === id) || null;
    } catch (error) {
      console.error('Error obteniendo marca por ID:', error);
      throw error;
    }
  }
}

export const vehicleBrandsService = new VehicleBrandsService();

