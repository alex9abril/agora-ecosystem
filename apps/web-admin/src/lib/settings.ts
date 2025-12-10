import { apiRequest } from './api';

export interface SiteSetting {
  id: string;
  key: string;
  value: any;
  category: string;
  label: string;
  description: string | null;
  help_text: string | null;
  value_type: string;
  validation: any;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface UpdateSettingDto {
  value: any;
  label?: string;
  description?: string;
  help_text?: string;
}

export interface BulkUpdateSettingsDto {
  updates: Array<{ key: string; value: any }>;
}

export interface TaxSettings {
  included_in_price: boolean;
  display_tax_breakdown: boolean;
  show_tax_included_label: boolean;
}

export const settingsService = {
  /**
   * Obtener todas las configuraciones agrupadas por categoría
   */
  async getAll(includeInactive: boolean = false): Promise<Record<string, SiteSetting[]>> {
    return apiRequest<Record<string, SiteSetting[]>>(
      `/settings?includeInactive=${includeInactive}`,
      { method: 'GET' }
    );
  },

  /**
   * Obtener categorías disponibles
   */
  async getCategories(): Promise<string[]> {
    return apiRequest<string[]>(`/settings/categories`, { method: 'GET' });
  },

  /**
   * Obtener configuraciones por categoría
   */
  async getByCategory(category: string, includeInactive: boolean = false): Promise<SiteSetting[]> {
    return apiRequest<SiteSetting[]>(
      `/settings/category/${category}?includeInactive=${includeInactive}`,
      { method: 'GET' }
    );
  },

  /**
   * Obtener una configuración por clave
   */
  async getByKey(key: string): Promise<SiteSetting> {
    return apiRequest<SiteSetting>(`/settings/${key}`, { method: 'GET' });
  },

  /**
   * Obtener configuración de impuestos
   */
  async getTaxSettings(): Promise<TaxSettings> {
    return apiRequest<TaxSettings>(`/settings/taxes`, { method: 'GET' });
  },

  /**
   * Actualizar una configuración por clave
   */
  async updateByKey(key: string, updateDto: UpdateSettingDto): Promise<SiteSetting> {
    return apiRequest<SiteSetting>(`/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify(updateDto),
    });
  },

  /**
   * Actualizar múltiples configuraciones
   */
  async bulkUpdate(bulkUpdateDto: BulkUpdateSettingsDto): Promise<Array<{ key: string; value: any }>> {
    return apiRequest<Array<{ key: string; value: any }>>(`/settings/bulk-update`, {
      method: 'POST',
      body: JSON.stringify(bulkUpdateDto),
    });
  },
};



