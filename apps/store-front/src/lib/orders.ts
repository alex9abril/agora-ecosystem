/**
 * Servicio para manejar pedidos
 */

import { apiRequest } from './api';

export interface TaxDetail {
  tax_type_id: string;
  tax_name: string;
  tax_code?: string;
  rate: number;
  rate_type: 'percentage' | 'fixed';
  amount: number;
  applied_to: 'subtotal' | 'delivery' | 'tip';
}

export interface TaxBreakdown {
  taxes: TaxDetail[];
  total_tax: number;
}

export interface OrderItem {
  id: string;
  product_id: string;
  item_name: string;
  item_price: number | string;
  quantity: number;
  variant_selection?: Record<string, string | string[]>;
  item_subtotal: number | string;
  special_instructions?: string;
  tax_breakdown?: TaxBreakdown;
  created_at: string;
}

export interface Order {
  id: string;
  client_id: string;
  business_id: string;
  status: string;
  delivery_address_text?: string;
  subtotal: number | string;
  tax_amount: number | string;
  delivery_fee: number | string;
  discount_amount: number | string;
  tip_amount: number | string;
  total_amount: number | string;
  payment_method: string;
  payment_status: string;
  estimated_delivery_time?: number;
  delivery_notes?: string;
  created_at: string;
  updated_at: string;
  confirmed_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  business_name?: string;
  business_logo_url?: string;
  delivery_longitude?: number;
  delivery_latitude?: number;
  items?: OrderItem[];
}

export interface CheckoutDto {
  addressId: string;
  deliveryNotes?: string;
  tipAmount?: number;
}

class OrdersService {
  async checkout(checkoutDto: CheckoutDto): Promise<Order> {
    try {
      const result = await apiRequest<Order>('/orders/checkout', {
        method: 'POST',
        body: JSON.stringify(checkoutDto),
      });
      
      if (!result || !result.id) {
        throw new Error('El pedido no se creó correctamente. Falta el ID del pedido.');
      }
      
      return result;
    } catch (error) {
      console.error('Error en checkout:', error);
      throw error;
    }
  }

  async findAll(): Promise<Order[]> {
    try {
      const result = await apiRequest<Order[]>('/orders', {
        method: 'GET',
      });
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error obteniendo pedidos:', error);
      throw error;
    }
  }

  async findOne(id: string): Promise<Order> {
    try {
      return await apiRequest<Order>(`/orders/${id}`, {
        method: 'GET',
      });
    } catch (error) {
      console.error('Error obteniendo pedido:', error);
      throw error;
    }
  }

  async cancel(id: string, reason?: string): Promise<Order> {
    try {
      return await apiRequest<Order>(`/orders/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    } catch (error) {
      console.error('Error cancelando pedido:', error);
      throw error;
    }
  }
}

export const ordersService = new OrdersService();

