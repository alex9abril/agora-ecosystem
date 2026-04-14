/**
 * Servicio para gestión de pedidos
 */

import { apiRequest } from './api';

export interface Order {
  id: string;
  order_number?: string; // Número de orden legible (opcional, puede venir del backend)
  client_id: string;
  business_id: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'completed' | 'cancelled' | 'refunded';
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
  /** Canal de venta (ej. web, app). Si no viene del API, el front asume `web`. */
  sales_channel?: string;
  has_shipping_label?: boolean;
  tracking_number?: string | null;
  shipping_label_status?: string | null;
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
  payment_transactions?: PaymentTransaction[];
  is_read?: boolean;
  read_at?: string;
  viewed_at?: string | null;
}

export interface PaymentTransaction {
  id: string;
  order_id: string;
  payment_method: string;
  transaction_id?: string;
  external_reference?: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  payment_data?: any;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  card_type?: string;
  last_four?: string;
  reference_number?: string;
  webhook_payload?: Record<string, unknown> | null;
  webhook_received_at?: string | null;
}

export interface OrderItem {
  id: string;
  product_id?: string;
  collection_id?: string;
  item_name: string;
  item_price: number;
  quantity: number; // Cantidad surtida (puede ser diferente a original_quantity después de prepareOrder)
  original_quantity?: number; // Cantidad original solicitada
  variant_selection?: any;
  item_subtotal: number;
  special_instructions?: string;
  quotation_id?: string; // ID de cotización de Skydropx
  shipping_carrier?: string; // Paquetería seleccionada (ej: "FEDEX", "DHL", "ESTAFETA")
  shipping_service?: string; // Tipo de servicio seleccionado (ej: "Express Saver", "Standard Overnight")
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

export interface DashboardStatsParams {
  startDate: string;
  endDate: string;
  previousStartDate?: string;
  previousEndDate?: string;
}

export interface DashboardStatsResponse {
  current: {
    totalRevenue: number;
    orderCount: number;
    averageTicket: number;
    byStatus: Record<string, number>;
    revenueByDay: { date: string; revenue: number }[];
    topProducts: { productId?: string; itemName: string; quantity: number; revenue: number }[];
    distinctClients: number;
    newClients?: number;
    recurringClients?: number;
    avgDeliveryHours?: number;
  };
  previous?: { totalRevenue: number; orderCount: number };
}

export interface OperationsDashboardParams {
  startDate: string;
  endDate: string;
  previousStartDate?: string;
  previousEndDate?: string;
  filterStatus?: string;
  filterPaymentStatus?: string;
  filterCarrier?: string;
}

export interface OperationsDashboardResponse {
  period: {
    startDate: string;
    endDate: string;
    totalRevenue: number;
    orderCount: number;
    averageTicket: number;
    previous?: { totalRevenue: number; orderCount: number };
    revenueByDay: { date: string; revenue: number }[];
    ordersByDay: { date: string; count: number }[];
  };
  today: { ordersCreated: number; revenuePaid: number };
  openPipelineByStatus: Record<string, number>;
  attention: {
    requiresAction: number;
    pendingPayment: number;
    toFulfill: number;
    inTransit: number;
    incidents: number;
    missingGuide: number;
    staleOpen48h: number;
  };
  logistics: {
    byCarrier: { carrier: string; count: number }[];
    byNormalizedStatus: { status: string; count: number }[];
    staleInTransitCount: number;
    inTransitWithLabelCount: number;
  } | null;
  recentActivity: {
    id: string;
    createdAt: string;
    integration: string;
    eventType: string;
    status: string;
    orderId: string | null;
    message: string | null;
  }[];
  attentionOrders: {
    id: string;
    status: string;
    payment_status: string;
    total_amount: string | number;
    created_at: string;
    updated_at: string;
    client_first_name: string | null;
    client_last_name: string | null;
    has_shipping_label: boolean;
    tracking_number: string | null;
  }[];
  logisticsDegraded?: boolean;
}

export const ordersService = {
  /**
   * Estadísticas del dashboard para un negocio (sucursal) en un rango de fechas
   */
  async getDashboardStats(
    businessId: string,
    params: DashboardStatsParams,
  ): Promise<DashboardStatsResponse> {
    const search = new URLSearchParams();
    search.set('startDate', params.startDate);
    search.set('endDate', params.endDate);
    if (params.previousStartDate) search.set('previousStartDate', params.previousStartDate);
    if (params.previousEndDate) search.set('previousEndDate', params.previousEndDate);
    const url = `/orders/business/${businessId}/dashboard-stats?${search.toString()}`;
    return apiRequest<DashboardStatsResponse>(url, { method: 'GET' });
  },

  async getOperationsDashboard(
    businessId: string,
    params: OperationsDashboardParams,
  ): Promise<OperationsDashboardResponse> {
    const search = new URLSearchParams();
    search.set('startDate', params.startDate);
    search.set('endDate', params.endDate);
    if (params.previousStartDate) search.set('previousStartDate', params.previousStartDate);
    if (params.previousEndDate) search.set('previousEndDate', params.previousEndDate);
    if (params.filterStatus) search.set('filterStatus', params.filterStatus);
    if (params.filterPaymentStatus) search.set('filterPaymentStatus', params.filterPaymentStatus);
    if (params.filterCarrier) search.set('filterCarrier', params.filterCarrier);
    const url = `/orders/business/${businessId}/operations-dashboard?${search.toString()}`;
    return apiRequest<OperationsDashboardResponse>(url, { method: 'GET' });
  },

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
   * Solo pruebas: simula el webhook Karlopay (backend requiere KARLOPAY_ALLOW_SIMULATE_WEBHOOK=true y Karlopay en dev).
   */
  async simulateKarlopayWebhook(
    businessId: string,
    orderId: string,
  ): Promise<{ success: boolean; message?: string }> {
    return apiRequest<{ success: boolean; message?: string }>(
      `/orders/business/${businessId}/${orderId}/karlopay/simulate-webhook`,
      { method: 'POST' },
    );
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
   * Procesar preparación de pedido
   */
  async prepareOrder(
    businessId: string,
    orderId: string,
    data: {
      items: Array<{ item_id: string; quantity: number }>;
      shortage_options?: Array<{
        product_id: string;
        option_type: 'refund' | 'other_branch' | 'wallet';
        alternative_branch_id?: string;
        shortage_quantity: number;
      }>;
    }
  ): Promise<Order> {
    try {
      const order = await apiRequest<Order>(
        `/orders/business/${businessId}/${orderId}/prepare`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      return order;
    } catch (error: any) {
      console.error('Error procesando preparación:', error);
      throw error;
    }
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
   * Marcar un pedido como leído/abierto por el negocio
   */
  async markAsRead(businessId: string, orderId: string): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>(
      `/orders/business/${businessId}/${orderId}/read`,
      { method: 'POST' },
    );
  },

  async markAsViewed(orderId: string): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>(
      `/orders/${orderId}/view`,
      { method: 'POST' },
    );
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

