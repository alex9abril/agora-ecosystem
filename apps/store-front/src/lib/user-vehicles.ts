/**
 * Servicio para gestión de vehículos de usuarios
 */

import { apiRequest } from './api';

export interface UserVehicle {
  id: string;
  user_id: string;
  vehicle_brand_id: string;
  vehicle_model_id: string | null;
  vehicle_year_id: string | null;
  vehicle_spec_id: string | null;
  nickname: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Información relacionada (joins)
  brand_name?: string;
  model_name?: string | null;
  year_start?: number | null;
  year_end?: number | null;
  generation?: string | null;
  engine_code?: string | null;
  transmission_type?: string | null;
  drivetrain?: string | null;
  body_type?: string | null;
}

export interface CreateUserVehicleDto {
  vehicle_brand_id: string;
  vehicle_model_id?: string;
  vehicle_year_id?: string;
  vehicle_spec_id?: string;
  nickname?: string;
  is_default?: boolean;
}

export interface UpdateUserVehicleDto {
  vehicle_brand_id?: string;
  vehicle_model_id?: string;
  vehicle_year_id?: string;
  vehicle_spec_id?: string;
  nickname?: string;
  is_default?: boolean;
}

export const userVehiclesService = {
  /**
   * Obtener todos los vehículos del usuario autenticado
   */
  async getUserVehicles(): Promise<UserVehicle[]> {
    try {
      const vehicles = await apiRequest<UserVehicle[]>('/user-vehicles', {
        method: 'GET',
      });
      return vehicles || [];
    } catch (error: any) {
      console.error('[UserVehiclesService] Error obteniendo vehículos:', error);
      return [];
    }
  },

  /**
   * Obtener el vehículo predeterminado del usuario
   */
  async getDefaultVehicle(): Promise<UserVehicle | null> {
    try {
      const vehicle = await apiRequest<UserVehicle>('/user-vehicles/default', {
        method: 'GET',
      });
      return vehicle || null;
    } catch (error: any) {
      console.error('[UserVehiclesService] Error obteniendo vehículo predeterminado:', error);
      return null;
    }
  },

  /**
   * Obtener un vehículo específico
   */
  async getUserVehicle(id: string): Promise<UserVehicle | null> {
    try {
      const vehicle = await apiRequest<UserVehicle>(`/user-vehicles/${id}`, {
        method: 'GET',
      });
      return vehicle || null;
    } catch (error: any) {
      console.error('[UserVehiclesService] Error obteniendo vehículo:', error);
      return null;
    }
  },

  /**
   * Crear un nuevo vehículo para el usuario
   */
  async createUserVehicle(dto: CreateUserVehicleDto): Promise<UserVehicle> {
    const vehicle = await apiRequest<UserVehicle>('/user-vehicles', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return vehicle;
  },

  /**
   * Actualizar un vehículo del usuario
   */
  async updateUserVehicle(id: string, dto: UpdateUserVehicleDto): Promise<UserVehicle> {
    const vehicle = await apiRequest<UserVehicle>(`/user-vehicles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
    return vehicle;
  },

  /**
   * Establecer un vehículo como predeterminado
   */
  async setDefaultVehicle(id: string): Promise<UserVehicle> {
    const vehicle = await apiRequest<UserVehicle>(`/user-vehicles/${id}/set-default`, {
      method: 'PUT',
    });
    return vehicle;
  },

  /**
   * Eliminar un vehículo del usuario
   */
  async deleteUserVehicle(id: string): Promise<void> {
    await apiRequest(`/user-vehicles/${id}`, {
      method: 'DELETE',
    });
  },
};

