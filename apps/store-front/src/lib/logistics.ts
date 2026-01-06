/**
 * Servicio para integración con logística (Skydropx)
 */

import { apiRequest } from './api';

export interface Address {
  name: string;
  street: string;
  number: string;
  district?: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  phone: string;
  email?: string;
}

export interface Parcel {
  weight: number;
  distance_unit?: 'CM' | 'IN';
  mass_unit?: 'KG' | 'LB';
  height: number;
  width: number;
  length: number;
}

export interface QuotationRequest {
  origin: Address;
  destination: Address;
  parcels: Parcel[];
}

export interface Quotation {
  id: string;
  carrier: string;
  service: string;
  price: number;
  currency: string;
  estimated_delivery?: string;
  estimated_days?: number;
}

export interface QuotationResponse {
  quotations: Quotation[];
}

class LogisticsService {
  /**
   * Obtener cotizaciones de envío desde Skydropx
   */
  async getQuotations(request: QuotationRequest): Promise<QuotationResponse> {
    try {
      const response = await apiRequest<QuotationResponse>('/logistics/quotations', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      return response;
    } catch (error: any) {
      console.error('[LogisticsService] Error obteniendo cotizaciones:', error);
      throw error;
    }
  }
}

export const logisticsService = new LogisticsService();

