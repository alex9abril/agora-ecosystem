/**
 * Servicio para gestión de logística y guías de envío
 */

import { apiRequest } from './api';

export interface ShippingLabel {
  id: string;
  order_id: string;
  tracking_number: string;
  carrier_name: string;
  status: 'generated' | 'picked_up' | 'in_transit' | 'delivered';
  origin_address: string;
  destination_address: string;
  destination_name: string;
  destination_phone: string;
  package_weight?: number;
  package_dimensions?: string;
  declared_value?: number;
  pdf_url?: string;
  pdf_path?: string;
  generated_at: string;
  picked_up_at?: string;
  in_transit_at?: string;
  delivered_at?: string;
  created_at: string;
  updated_at: string;
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
      const errorText = await response.text();
      throw new Error(`Error descargando PDF: ${errorText}`);
    }

    return response.blob();
  },
};

