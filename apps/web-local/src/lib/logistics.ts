/**
 * Servicio para gestión de logística y guías de envío
 */

import { apiRequest } from './api';

export interface ShippingLabel {
  id: string;
  order_id: string;
  tracking_number: string;
  carrier_name: string;
  status: 'generated' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  origin_address: string;
  destination_address: string;
  destination_name: string;
  destination_phone: string;
  package_weight?: number;
  package_dimensions?: string;
  declared_value?: number;
  pdf_url?: string;
  pdf_path?: string;
  metadata?: unknown;
  /** Derivados en API (GET/POST guía); sirven para UI sin leer metadata */
  pdf_ready?: boolean;
  tracking_is_pending?: boolean;
  skydropx_workflow_status?: string | null;
  generated_at: string;
  picked_up_at?: string;
  in_transit_at?: string;
  delivered_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TrackingEvent {
  id?: string;
  status: string;
  description: string;
  location?: string;
  timestamp: string;
  date?: string;
}

export interface ShipmentTracking {
  shipment_id: string;
  tracking_number: string | null;
  status: string;
  carrier: string | null;
  service: string | null;
  estimated_delivery?: string | null;
  current_location?: string | null;
  tracking_events: TrackingEvent[];
  tracking_url?: string | null;
  metadata?: any; // Metadatos adicionales de Skydropx (opcional)
}

export interface CreateShippingLabelData {
  orderId: string;
  packageWeight?: number;
  packageDimensions?: string;
  declaredValue?: number;
}

export const logisticsService = {
  /**
   * Crear guía de envío para una orden
   */
  async createShippingLabel(data: CreateShippingLabelData): Promise<ShippingLabel> {
    const response = await apiRequest<ShippingLabel>('/logistics/shipping-labels', {
      method: 'POST',
      body: JSON.stringify({
        orderId: data.orderId,
        packageWeight: data.packageWeight,
        packageDimensions: data.packageDimensions,
        declaredValue: data.declaredValue,
      }),
    });

    return response;
  },

  /**
   * Re-sincronizar guía existente con Skydropx (tracking, metadata, descarga de PDF si hay URL).
   */
  async syncShippingLabelByOrder(orderId: string): Promise<ShippingLabel> {
    return apiRequest<ShippingLabel>(`/logistics/shipping-labels/order/${orderId}/sync`, {
      method: 'POST',
    });
  },

  /**
   * Obtener guía de envío por ID de orden
   */
  async getShippingLabelByOrderId(orderId: string): Promise<ShippingLabel | null> {
    try {
      const response = await apiRequest<ShippingLabel>(
        `/logistics/shipping-labels/order/${orderId}`,
        {
          method: 'GET',
        }
      );
      return response;
    } catch (error: any) {
      // Si es 404, no hay guía aún
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Obtener guía de envío por número de seguimiento (público)
   */
  async getShippingLabelByTrackingNumber(trackingNumber: string): Promise<ShippingLabel> {
    const response = await apiRequest<ShippingLabel>(
      `/logistics/shipping-labels/tracking/${trackingNumber}`,
      {
        method: 'GET',
      }
    );

    return response;
  },

  /**
   * Descargar PDF de guía de envío
   */
  async downloadShippingLabelPDF(orderId: string): Promise<Blob> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
    const url = `${API_URL}/logistics/shipping-labels/${orderId}/pdf`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      const contentType = response.headers.get('Content-Type') || '';
      let message = `No se pudo descargar el PDF (${response.status}).`;

      if (contentType.includes('application/json')) {
        try {
          const body = await response.json();
          const extracted =
            (typeof body?.message === 'string' && body.message) ||
            (Array.isArray(body?.message) && body.message.join(', ')) ||
            (typeof body?.error === 'string' && body.error);
          if (extracted) message = extracted;
        } catch {
          /* ignore */
        }
      } else {
        const errorText = await response.text();
        try {
          const parsed = JSON.parse(errorText) as { message?: string; error?: string };
          if (parsed?.message) message = parsed.message;
          else if (parsed?.error) message = parsed.error;
          else if (errorText) message = errorText.slice(0, 400);
        } catch {
          if (errorText) message = errorText.slice(0, 400);
        }
      }

      throw new Error(message);
    }

    return response.blob();
  },

  /**
   * Descargar PDF de etiqueta para recoger en tienda (pedido pickup).
   * Tamaño estándar 4x6 para imprimir como etiqueta.
   */
  async downloadPickupLabelPDF(orderId: string): Promise<Blob> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
    const url = `${API_URL}/logistics/pickup-label/${orderId}/pdf`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error descargando etiqueta pickup: ${errorText}`);
    }

    return response.blob();
  },

  /**
   * Obtener estado de seguimiento de envío desde Skydropx
   */
  async getShipmentTracking(orderId: string): Promise<ShipmentTracking> {
    const response = await apiRequest<{ success: boolean; data: ShipmentTracking; timestamp: string }>(
      `/logistics/shipments/${orderId}/tracking`,
      {
        method: 'GET',
      }
    );

    return response.data;
  },

  /**
   * Obtener eventos de tracking detallados para mostrar en timeline
   */
  async getTrackingEvents(orderId: string): Promise<TrackingEvent[]> {
    const response = await apiRequest<{ success: boolean; data: { events: TrackingEvent[]; count: number } }>(
      `/logistics/shipments/${orderId}/tracking-events`,
      {
        method: 'GET',
      }
    );

    return response.data.events;
  },
};

