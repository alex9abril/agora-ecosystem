/**
 * Servicio para gestión de sliders del landing page
 */

import { apiRequest } from './api';

export enum RedirectType {
  CATEGORY = 'category',
  PROMOTION = 'promotion',
  BRANCH = 'branch',
  URL = 'url',
  NONE = 'none',
}

export interface LandingSlider {
  id: string;
  business_group_id: string | null;
  business_id: string | null;
  content: {
    imageUrl?: string;
    imageAlt?: string;
    backgroundColor?: string;
    gradientColors?: string[];
    overlay?: {
      position?: 'left' | 'center' | 'right';
      title?: string;
      titleHighlight?: string;
      subtitle?: string;
      description?: string;
      badge?: string;
      badgeColor?: string;
      badgePosition?: 'top-left' | 'top-right' | 'top-center';
      ctaText?: string;
      ctaLink?: string;
      ctaColor?: string;
      secondaryText?: string;
      discountCode?: string;
      validUntil?: string;
      termsText?: string;
    };
    productImages?: Array<{
      url: string;
      alt?: string;
      position?: { top?: string; left?: string; right?: string; bottom?: string };
      size?: string;
      rotation?: number;
      zIndex?: number;
    }>;
    decorativeElements?: boolean;
  };
  redirect_type: RedirectType | null;
  redirect_target_id: string | null;
  redirect_url: string | null;
  display_order: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CreateLandingSliderData {
  business_group_id?: string;
  business_id?: string;
  content: Record<string, any>;
  redirect_type?: RedirectType;
  redirect_target_id?: string;
  redirect_url?: string;
  display_order?: number;
  is_active?: boolean;
  start_date?: string;
  end_date?: string;
}

export interface UpdateLandingSliderData {
  business_group_id?: string;
  business_id?: string;
  content?: Record<string, any>;
  redirect_type?: RedirectType;
  redirect_target_id?: string;
  redirect_url?: string;
  display_order?: number;
  is_active?: boolean;
  start_date?: string;
  end_date?: string;
}

export interface ListLandingSlidersFilters {
  business_group_id?: string;
  business_id?: string;
  only_active?: boolean;
  page?: number;
  limit?: number;
}

export interface ListLandingSlidersResponse {
  data: LandingSlider[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const landingSlidersService = {
  /**
   * Crear un nuevo slider
   */
  async create(data: CreateLandingSliderData): Promise<LandingSlider> {
    return apiRequest<LandingSlider>('/landing-sliders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Listar sliders con filtros
   */
  async list(
    filters?: ListLandingSlidersFilters,
  ): Promise<ListLandingSlidersResponse | LandingSlider[]> {
    const params = new URLSearchParams();
    if (filters?.business_group_id) params.append('business_group_id', filters.business_group_id);
    if (filters?.business_id) params.append('business_id', filters.business_id);
    if (filters?.only_active !== undefined) params.append('only_active', filters.only_active.toString());
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = `/landing-sliders${queryString ? `?${queryString}` : ''}`;

    return apiRequest<ListLandingSlidersResponse>(url, {
      method: 'GET',
    });
  },

  /**
   * Obtener un slider por ID
   */
  async getById(id: string): Promise<LandingSlider> {
    return apiRequest<LandingSlider>(`/landing-sliders/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Actualizar un slider
   */
  async update(id: string, data: UpdateLandingSliderData): Promise<LandingSlider> {
    return apiRequest<LandingSlider>(`/landing-sliders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Eliminar un slider
   */
  async delete(id: string): Promise<void> {
    return apiRequest<void>(`/landing-sliders/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Obtener sliders activos para un contexto (público)
   */
  async getActiveSliders(businessGroupId?: string, businessId?: string): Promise<LandingSlider[]> {
    const params = new URLSearchParams();
    if (businessGroupId) params.append('business_group_id', businessGroupId);
    if (businessId) params.append('business_id', businessId);

    const queryString = params.toString();
    const url = `/landing-sliders/public${queryString ? `?${queryString}` : ''}`;

    return apiRequest<LandingSlider[]>(url, {
      method: 'GET',
    });
  },
};

