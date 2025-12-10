/**
 * Servicio para gestión de pedidos
 */

import { apiRequest } from './api';

export interface Order {
  id: string;
  client_id: string;
  business_id: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled' | 'refunded';
  delivery_address_text: string;
  subtotal: number;
  tax_amount: number;
  delivery_fee: number;
  discount_amount: number;
  tip_amount: number;
  total_amount: number;
  payment_method: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | 'overcharged';
  estimated_delivery_time?: number;
  actual_delivery_time?: number;
  delivery_notes?: string;
  created_at: string;
  updated_at: string;
  confirmed_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  client_first_name?: string;
  client_last_name?: string;
  client_phone?: string;
  client_email?: string;
  item_count?: number;
  total_quantity?: number;
  items?: OrderItem[];
  delivery?: Delivery;
  payment_status_change_info?: {
    changed_at: string;
    changed_by_user_id?: string;
    changed_by_role?: string;
    changed_by_name: string;
    change_reason?: string;
    is_automatic: boolean;
  };
}

export interface OrderItem {
  id: string;
  product_id?: string;
  collection_id?: string;
  item_name: string;
  item_price: number;
  quantity: number;
  variant_selection?: any;
  item_subtotal: number;
  special_instructions?: string;
  created_at: string;
}

export interface Delivery {
  id: string;
  order_id: string;
  repartidor_id?: string;
  status: 'available' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  distance_km?: number;
  estimated_time_minutes?: number;
  actual_time_minutes?: number;
  assigned_at?: string;
  picked_up_at?: string;
  delivered_at?: string;
  repartidor_first_name?: string;
  repartidor_last_name?: string;
  repartidor_phone?: string;
}

export interface OrderFilters {
  status?: string;
  payment_status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface UpdateOrderStatusData {
  status: string;
  estimated_delivery_time?: number;
  cancellation_reason?: string;
}

export interface UpdatePaymentStatusData {
  payment_status: string;
}

export const ordersService = {
  /**
   * Obtener pedidos de un negocio
   */
  async getOrders(businessId: string, filters?: OrderFilters): Promise<Order[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.payment_status) params.append('payment_status', filters.payment_status);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.search) params.append('search', filters.search);

    const queryString = params.toString();
    const url = `/orders/business/${businessId}${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiRequest<Order[]>(url, {
      method: 'GET',
    });

    return response;
  },

  /**
   * Obtener detalle de un pedido
   */
  async getOrder(businessId: string, orderId: string): Promise<Order> {
    const response = await apiRequest<Order>(`/orders/business/${businessId}/${orderId}`, {
      method: 'GET',
    });

    return response;
  },

  /**
   * Actualizar estado de pago (modo prueba)
   */
  async updatePaymentStatus(
    businessId: string,
    orderId: string,
    data: UpdatePaymentStatusData
  ): Promise<Order> {
    console.log('🔵 [ORDERS SERVICE] Actualizando payment_status:', {
      businessId,
      orderId,
      data,
    });
    
    const response = await apiRequest<Order>(`/orders/business/${businessId}/${orderId}/payment-status`, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    console.log('🔵 [ORDERS SERVICE] Respuesta recibida (tipo):', typeof response);
    console.log('🔵 [ORDERS SERVICE] Respuesta recibida (contenido):', JSON.stringify(response, null, 2));
    
    // apiRequest ya extrae data.data, así que response debería ser directamente el Order
    // Pero verificamos por si acaso
    if (response && typeof response === 'object') {
      // Si tiene la estructura { success, data }, extraer data
      if ('data' in response && !('id' in response)) {
        console.log('🔵 [ORDERS SERVICE] Extrayendo data de la respuesta anidada');
        const extracted = (response as any).data;
        console.log('🔵 [ORDERS SERVICE] Data extraída:', extracted);
        return extracted as Order;
      }
      // Si ya es un Order (tiene id, payment_status, etc.)
      if ('id' in response && 'payment_status' in response) {
        console.log('🔵 [ORDERS SERVICE] Respuesta ya es un Order válido');
        return response as Order;
      }
    }
    
    console.warn('⚠️ [ORDERS SERVICE] Respuesta con formato inesperado:', response);
    return response as Order;
  },

  /**
   * Actualizar estado de un pedido
   */
  async updateOrderStatus(
    businessId: string,
    orderId: string,
    data: UpdateOrderStatusData
  ): Promise<Order> {
    const response = await apiRequest<Order>(`/orders/business/${businessId}/${orderId}/status`, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    return response;
  },

  /**
   * ⚠️ TEMPORAL: Eliminar pedido físicamente
   */
  async deleteOrder(businessId: string, orderId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiRequest<{ success: boolean; message: string }>(
      `/orders/business/${businessId}/${orderId}`,
      {
        method: 'DELETE',
      }
    );

    return response;
  },
};

