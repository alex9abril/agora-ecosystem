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
  /** Si la tienda se muestra embebida (iframe/subdominio); cuando es true se oculta el footer en el store-front. */
  embed_mode?: boolean;
  /** Con contenido embebido: full_width o contained (contenedor centrado). */
  embed_layout?: 'full_width' | 'contained';
  /** En modo embebido: si se muestra el logotipo de la tienda en el header (por defecto true). Si el sitio que embebe ya tiene logo, conviene false. */
  embed_show_logo?: boolean;
}

class BrandingService {
  /**
   * Asegura que un valor de color sea una cadena no vacía (hex o válida).
   */
  private toValidColor(value: any): string | undefined {
    if (value == null) return undefined;
    const s = String(value).trim();
    return s.length > 0 ? s : undefined;
  }

  /**
   * Normalizar colores: convertir primary_color -> primary, etc.
   * Acepta las claves que guarda web-admin (snake_case) y devuelve siempre valores válidos.
   */
  private normalizeColors(colors: any): Branding['colors'] | undefined {
    if (!colors || typeof colors !== 'object') return undefined;

    const primary = this.toValidColor(colors.primary_color ?? colors.primary);
    const secondary = this.toValidColor(colors.secondary_color ?? colors.secondary);
    const accent = this.toValidColor(colors.accent_color ?? colors.accent);
    const background = this.toValidColor(colors.background_color ?? colors.background);
    const text = this.toValidColor(colors.text_color ?? colors.text ?? colors.text_primary);

    if (!primary && !secondary && !accent && !background && !text) return undefined;

    return {
      primary,
      secondary,
      accent,
      background,
      text,
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
      embed_mode: branding.embed_mode === true,
      embed_layout: branding.embed_layout === 'contained' || branding.embed_layout === 'full_width'
        ? branding.embed_layout
        : undefined,
      embed_show_logo: branding.embed_show_logo,
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

  /**
   * Obtener branding de la tienda global (Agora global - MultiTienda)
   * Usado en store-front cuando el contexto es global (sin grupo/sucursal/marca)
   */
  async getGlobalBranding(): Promise<Branding | null> {
    try {
      const result = await apiRequest<{ branding: any }>(
        `/settings/branding/global`,
        { method: 'GET' }
      );
      const normalized = this.normalizeBranding(result?.branding);
      if (normalized) {
        console.log('🎨 [BrandingService] Branding tienda global cargado:', normalized);
      }
      return normalized ?? null;
    } catch (error) {
      console.error('Error obteniendo branding tienda global:', error);
      return null;
    }
  }

  /**
   * Obtener branding por marca de vehículo (vehicle_brand_id)
   * Usado en store-front cuando el contexto es /brand/:code
   */
  async getVehicleBrandBranding(vehicleBrandId: string): Promise<Branding | null> {
    try {
      const result = await apiRequest<{ branding: any }>(
        `/settings/branding/vehicle-brand/${vehicleBrandId}`,
        { method: 'GET' }
      );
      const normalized = this.normalizeBranding(result?.branding);
      if (normalized) {
        console.log('🎨 [BrandingService] Branding por marca cargado:', normalized);
      }
      return normalized ?? null;
    } catch (error) {
      console.error('Error obteniendo branding por marca:', error);
      return null;
    }
  }
}

export const brandingService = new BrandingService();

