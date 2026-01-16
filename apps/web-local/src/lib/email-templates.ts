/**
 * Servicio para gestionar templates de correo electrónico
 */

import { apiRequest } from './api';

export type EmailTriggerType = 'user_registration' | 'order_confirmation' | 'order_status_change';

export type EmailTemplateLevel = 'global' | 'group' | 'business';

export interface EmailTemplate {
  id: string;
  trigger_type: EmailTriggerType;
  name: string;
  description?: string;
  subject: string;
  template_html: string;
  template_text?: string;
  available_variables: string[];
  is_active: boolean;
  level: EmailTemplateLevel;
  // Campos específicos por nivel
  business_group_id?: string;
  business_id?: string;
  global_template_id?: string;
  group_template_id?: string;
  inherit_from_global?: boolean;
  inherit_from_group?: boolean;
  logo_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateEmailTemplateData {
  trigger_type: EmailTriggerType;
  name: string;
  description?: string;
  subject: string;
  template_html: string;
  template_text?: string;
  available_variables?: string[];
  is_active?: boolean;
  // Para templates de grupo
  business_group_id?: string;
  inherit_from_global?: boolean;
  // Para templates de sucursal
  business_id?: string;
  inherit_from_group?: boolean;
  inherit_from_global?: boolean;
}

export interface UpdateEmailTemplateData {
  name?: string;
  description?: string;
  subject?: string;
  template_html?: string;
  template_text?: string;
  available_variables?: string[];
  is_active?: boolean;
  inherit_from_global?: boolean;
  inherit_from_group?: boolean;
}

/**
 * Servicio de templates de correo
 */
export const emailTemplatesService = {
  /**
   * Obtener templates según el nivel
   * @param level - Nivel del template: 'global', 'group', o 'business'
   * @param filters - Filtros opcionales (business_group_id, business_id)
   */
  async list(
    level: EmailTemplateLevel,
    filters?: {
      business_group_id?: string;
      business_id?: string;
    }
  ): Promise<EmailTemplate[]> {
    const params = new URLSearchParams();
    params.append('level', level);
    
    if (filters?.business_group_id) {
      params.append('business_group_id', filters.business_group_id);
    }
    if (filters?.business_id) {
      params.append('business_id', filters.business_id);
    }

    const response = await apiRequest<{ data: EmailTemplate[] }>(
      `/email-templates?${params.toString()}`,
      {
        method: 'GET',
      }
    );

    return response.data || [];
  },

  /**
   * Obtener un template específico por ID
   */
  async getById(
    id: string,
    level: EmailTemplateLevel
  ): Promise<EmailTemplate> {
    const response = await apiRequest<{ data: EmailTemplate }>(
      `/email-templates/${id}?level=${level}`,
      {
        method: 'GET',
      }
    );

    return response.data;
  },

  /**
   * Obtener template por trigger_type y nivel
   */
  async getByTrigger(
    triggerType: EmailTriggerType,
    level: EmailTemplateLevel,
    filters?: {
      business_group_id?: string;
      business_id?: string;
    }
  ): Promise<EmailTemplate | null> {
    const params = new URLSearchParams();
    params.append('trigger_type', triggerType);
    params.append('level', level);
    
    if (filters?.business_group_id) {
      params.append('business_group_id', filters.business_group_id);
    }
    if (filters?.business_id) {
      params.append('business_id', filters.business_id);
    }

    try {
      const response = await apiRequest<{ data: EmailTemplate }>(
        `/email-templates/by-trigger?${params.toString()}`,
        {
          method: 'GET',
        }
      );
      return response.data || null;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Crear un nuevo template
   */
  async create(
    level: EmailTemplateLevel,
    data: CreateEmailTemplateData
  ): Promise<EmailTemplate> {
    const response = await apiRequest<{ data: EmailTemplate }>(
      `/email-templates?level=${level}`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );

    return response.data;
  },

  /**
   * Actualizar un template existente
   */
  async update(
    id: string,
    level: EmailTemplateLevel,
    data: UpdateEmailTemplateData
  ): Promise<EmailTemplate> {
    const response = await apiRequest<{ data: EmailTemplate }>(
      `/email-templates/${id}?level=${level}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );

    return response.data;
  },

  /**
   * Eliminar un template (solo para templates personalizados, no globales)
   */
  async delete(id: string, level: EmailTemplateLevel): Promise<void> {
    await apiRequest(`/email-templates/${id}?level=${level}`, {
      method: 'DELETE',
    });
  },

  /**
   * Activar/desactivar un template
   */
  async toggleActive(
    id: string,
    level: EmailTemplateLevel,
    isActive: boolean
  ): Promise<EmailTemplate> {
    return this.update(id, level, { is_active: isActive });
  },

  /**
   * Obtener el template resuelto (usando la función de resolución del backend)
   */
  async getResolvedTemplate(
    triggerType: EmailTriggerType,
    businessId?: string,
    businessGroupId?: string
  ): Promise<EmailTemplate> {
    const params = new URLSearchParams();
    params.append('trigger_type', triggerType);
    
    if (businessId) {
      params.append('business_id', businessId);
    }
    if (businessGroupId) {
      params.append('business_group_id', businessGroupId);
    }

    const response = await apiRequest<{ data: EmailTemplate }>(
      `/email-templates/resolved?${params.toString()}`,
      {
        method: 'GET',
      }
    );

    return response.data;
  },

  /**
   * Subir logo para un template
   */
  async uploadLogo(
    id: string,
    level: EmailTemplateLevel,
    file: File
  ): Promise<{ url: string; path: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiRequest<{ data: { url: string; path: string } }>(
      `/email-templates/${id}/upload-logo?level=${level}`,
      {
        method: 'POST',
        body: formData,
        headers: {}, // No establecer Content-Type, el navegador lo hará automáticamente con FormData
      }
    );

    return response.data;
  },
};

