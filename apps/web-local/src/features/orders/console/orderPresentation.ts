import { Order } from '@/lib/orders';
import { isStaleActiveOrder } from './orderOperational';
import { getOrderSeverity } from './orderSeverity';

export type OrderTabId =
  | 'all'
  | 'requires_action'
  | 'pending_payment'
  | 'to_fulfill'
  | 'in_transit'
  | 'incidents'
  | 'completed';

export interface OrderTab {
  id: OrderTabId;
  label: string;
}

export const ORDER_TABS: OrderTab[] = [
  { id: 'all', label: 'Todos' },
  { id: 'requires_action', label: 'Requieren accion' },
  { id: 'pending_payment', label: 'Pendientes de pago' },
  { id: 'to_fulfill', label: 'Por surtir' },
  { id: 'in_transit', label: 'En transito' },
  { id: 'incidents', label: 'Incidencias' },
  { id: 'completed', label: 'Listos para envío' },
];

const ORDER_TAB_IDS = new Set<OrderTabId>(ORDER_TABS.map((t) => t.id));

export function isValidOrderTabId(x: string): x is OrderTabId {
  return ORDER_TAB_IDS.has(x as OrderTabId);
}

export function orderMatchesTab(order: Order, tab: OrderTabId): boolean {
  switch (tab) {
    case 'pending_payment':
      return order.payment_status === 'pending' || order.payment_status === 'failed';
    case 'to_fulfill':
      return (order.payment_status === 'paid' || order.payment_status === 'overcharged') && order.status === 'confirmed';
    case 'in_transit':
      return ['assigned', 'picked_up', 'in_transit'].includes(order.status);
    case 'incidents':
      return getOrderSeverity(order) === 'critical';
    case 'completed':
      return ['delivered', 'completed'].includes(order.status);
    case 'requires_action':
      return (
        ['warning', 'critical'].includes(getOrderSeverity(order)) ||
        (getOrderSeverity(order) === 'info' && isStaleActiveOrder(order))
      );
    default:
      return true;
  }
}

export function formatOrderNumber(order: Order): string {
  return order.order_number || order.id.slice(-8).toUpperCase();
}

export function customerName(order: Order): string {
  const full = [order.client_first_name, order.client_last_name].filter(Boolean).join(' ').trim();
  return full || 'Sin nombre';
}

export function paymentBadgeLabel(payment: Order['payment_status']): string {
  const map: Record<Order['payment_status'], string> = {
    pending: 'Pendiente',
    paid: 'Pagado',
    failed: 'Fallido',
    refunded: 'Reembolsado',
    overcharged: 'Sobrepago',
  };
  return map[payment] || payment;
}

export function statusBadgeLabel(status: Order['status']): string {
  const map: Record<Order['status'], string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    preparing: 'Preparando',
    ready: 'Listo',
    assigned: 'Asignado',
    picked_up: 'Recolectado',
    in_transit: 'En transito',
    delivered: 'Entregado',
    completed: 'Completado',
    cancelled: 'Cancelado',
    refunded: 'Reembolsado',
  };
  return map[status] || status;
}
