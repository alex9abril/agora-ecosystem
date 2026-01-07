/**
 * Servicio para obtener sliders de landing page desde el backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export interface LandingSlider {
  id: string;
  business_group_id: string | null;
  business_id: string | null;
  content: {
    imageUrl?: string;
    backgroundColor?: string;
    overlay?: {
      position?: 'left' | 'center' | 'right';
      title?: string;
      subtitle?: string;
      description?: string;
      ctaText?: string;
      ctaLink?: string;
    };
  };
  redirect_type: string | null;
  redirect_target_id: string | null;
  redirect_url: string | null;
  display_order: number;
  is_active: boolean;
  start_date: Date | null;
  end_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

export const landingSlidersService = {
  /**
   * Obtener sliders activos para un contexto (público, sin autenticación)
   */
  async getActiveSliders(
    businessGroupId?: string,
    businessId?: string,
  ): Promise<LandingSlider[]> {
    try {
      const params = new URLSearchParams();
      if (businessGroupId) {
        params.append('business_group_id', businessGroupId);
      }
      if (businessId) {
        params.append('business_id', businessId);
      }

      const url = `${API_URL}/landing-sliders/public?${params.toString()}`;
      console.log('🔍 [getActiveSliders] Llamando a:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('🔍 [getActiveSliders] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [getActiveSliders] Error response:', errorText);
        throw new Error(`Error al obtener sliders: ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('🔍 [getActiveSliders] Data recibida completa:', responseData);
      
      // El backend devuelve {success: true, data: [...]} o directamente un array
      let sliders: LandingSlider[] = [];
      if (Array.isArray(responseData)) {
        sliders = responseData;
      } else if (responseData.data && Array.isArray(responseData.data)) {
        sliders = responseData.data;
      } else if (responseData.success && Array.isArray(responseData.data)) {
        sliders = responseData.data;
      }
      
      console.log('🔍 [getActiveSliders] Sliders extraídos:', sliders);
      return sliders;
    } catch (error) {
      console.error('❌ Error obteniendo sliders:', error);
      return [];
    }
  },
};

