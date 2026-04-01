/**
 * Respuesta agregada para la torre de control operativa (web-local).
 * Los conteos de atención son aproximados respecto al cliente pero alineados operativamente.
 */

export type OperationsDashboardAttentionCounts = {
  requiresAction: number;
  pendingPayment: number;
  toFulfill: number;
  inTransit: number;
  incidents: number;
  missingGuide: number;
  staleOpen48h: number;
};

export type OperationsDashboardLogistics = {
  byCarrier: { carrier: string; count: number }[];
  byNormalizedStatus: { status: string; count: number }[];
  staleInTransitCount: number;
  inTransitWithLabelCount: number;
};

export type OperationsDashboardActivityItem = {
  id: string;
  createdAt: string;
  integration: string;
  eventType: string;
  status: string;
  orderId: string | null;
  message: string | null;
};

export type OperationsDashboardResponse = {
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
  today: {
    ordersCreated: number;
    revenuePaid: number;
  };
  /** Pedidos abiertos (no terminal) agrupados por status de orden. */
  openPipelineByStatus: Record<string, number>;
  attention: OperationsDashboardAttentionCounts;
  logistics: OperationsDashboardLogistics | null;
  recentActivity: OperationsDashboardActivityItem[];
  attentionOrders: {
    id: string;
    status: string;
    payment_status: string;
    total_amount: string | number;
    created_at: Date;
    updated_at: Date;
    client_first_name: string | null;
    client_last_name: string | null;
    has_shipping_label: boolean;
    tracking_number: string | null;
  }[];
  /** true si se omitió métrica logística por error de esquema (columna faltante). */
  logisticsDegraded?: boolean;
};
