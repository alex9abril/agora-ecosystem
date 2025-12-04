/**
 * Servicio para manejar direcciones
 */

import { apiRequest } from './api';

export interface Address {
  id: string;
  label?: string;
  street: string;
  street_number?: string;
  interior_number?: string;
  neighborhood: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  longitude: number;
  latitude: number;
  additional_references?: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAddressDto {
  label?: string;
  street: string;
  street_number?: string;
  interior_number?: string;
  neighborhood: string;
  city?: string;
  state?: string;
  postal_code: string;
  country?: string;
  longitude: number;
  latitude: number;
  additional_references?: string;
  is_default?: boolean;
}

export interface UpdateAddressDto {
  label?: string;
  street?: string;
  street_number?: string;
  interior_number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  longitude?: number;
  latitude?: number;
  additional_references?: string;
  is_default?: boolean;
}

class AddressesService {
  async findAll(): Promise<Address[]> {
    try {
      const result = await apiRequest<Address[]>('/addresses', {
        method: 'GET',
      });
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error obteniendo direcciones:', error);
      throw error;
    }
  }

  async findOne(id: string): Promise<Address> {
    try {
      return await apiRequest<Address>(`/addresses/${id}`, {
        method: 'GET',
      });
    } catch (error) {
      console.error('Error obteniendo dirección:', error);
      throw error;
    }
  }

  async create(createDto: CreateAddressDto): Promise<Address> {
    try {
      return await apiRequest<Address>('/addresses', {
        method: 'POST',
        body: JSON.stringify(createDto),
      });
    } catch (error) {
      console.error('Error creando dirección:', error);
      throw error;
    }
  }

  async update(id: string, updateDto: UpdateAddressDto): Promise<Address> {
    try {
      return await apiRequest<Address>(`/addresses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updateDto),
      });
    } catch (error) {
      console.error('Error actualizando dirección:', error);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await apiRequest(`/addresses/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error eliminando dirección:', error);
      throw error;
    }
  }

  async setDefault(id: string): Promise<Address> {
    try {
      return await apiRequest<Address>(`/addresses/${id}/set-default`, {
        method: 'PATCH',
      });
    } catch (error) {
      console.error('Error estableciendo dirección predeterminada:', error);
      throw error;
    }
  }
}

export const addressesService = new AddressesService();

