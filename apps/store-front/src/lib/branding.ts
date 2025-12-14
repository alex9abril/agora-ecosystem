/**
 * Servicio para obtener configuración de branding
 */

import { apiRequest } from './api';

export interface Branding {
  logo_url?: string;
  logo_light_url?: string;
  logo_dark_url?: string;
  favicon_url?: string;
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    text?: string;
  };
  fonts?: {
    primary?: string;
    secondary?: string;
  };
  texts?: {
    tagline?: string;
    welcome_message?: string;
  };
  social_media?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    whatsapp?: string;
  };
  custom_css?: string;
  custom_js?: string;
}

class BrandingService {
  /**
   * Normalizar colores: convertir primary_color -> primary, etc.
   */
  private normalizeColors(colors: any): Branding['colors'] | undefined {
    if (!colors) return undefined;
    
    return {
      primary: colors.primary_color || colors.primary,
      secondary: colors.secondary_color || colors.secondary,
      accent: colors.accent_color || colors.accent,
      background: colors.background_color || colors.background,
      text: colors.text_color || colors.text,
    };
  }

  /**
   * Normalizar branding: convertir estructura de la BD a estructura esperada
   */
  private normalizeBranding(branding: any): Branding | null {
    if (!branding) return null;

    return {
      logo_url: branding.logo_url,
      logo_light_url: branding.logo_light_url,
      logo_dark_url: branding.logo_dark_url,
      favicon_url: branding.favicon_url,
      colors: this.normalizeColors(branding.colors),
      fonts: branding.fonts,
      texts: branding.texts,
      social_media: branding.social_media,
      custom_css: branding.custom_css,
      custom_js: branding.custom_js,
    };
  }

  /**
   * Obtener branding de un grupo empresarial
   */
  async getGroupBranding(groupId: string): Promise<Branding | null> {
    try {
      const result = await apiRequest<{ branding: any }>(
        `/businesses/groups/${groupId}/branding`,
        {
          method: 'GET',
        }
      );
      console.log('🎨 [BrandingService] Respuesta completa del grupo:', result);
      console.log('🎨 [BrandingService] Branding raw:', result.branding);
      
      const normalized = this.normalizeBranding(result.branding);
      console.log('🎨 [BrandingService] Branding normalizado:', normalized);
      console.log('🎨 [BrandingService] Colores normalizados:', normalized?.colors);
      
      return normalized;
    } catch (error) {
      console.error('Error obteniendo branding del grupo:', error);
      return null;
    }
  }

  /**
   * Obtener branding de una sucursal
   */
  async getBusinessBranding(businessId: string): Promise<Branding | null> {
    try {
      const result = await apiRequest<{ branding: any }>(
        `/businesses/${businessId}/branding`,
        {
          method: 'GET',
        }
      );
      console.log('🎨 [BrandingService] Respuesta completa de la sucursal:', result);
      console.log('🎨 [BrandingService] Branding raw:', result.branding);
      
      const normalized = this.normalizeBranding(result.branding);
      console.log('🎨 [BrandingService] Branding normalizado:', normalized);
      console.log('🎨 [BrandingService] Colores normalizados:', normalized?.colors);
      
      return normalized;
    } catch (error) {
      console.error('Error obteniendo branding de la sucursal:', error);
      return null;
    }
  }
}

export const brandingService = new BrandingService();

