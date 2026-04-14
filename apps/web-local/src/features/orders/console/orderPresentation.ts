import { Order } from '@/lib/orders';
import { isPickupOrder } from './orderOperational';

export type OrderTabId =
  | 'all'
  | 'pending_payment'
  | 'to_fulfill'
  | 'ready_for_shipping'
  | 'ready_for_pickup'
  | 'in_transit'
  | 'delivered';

export interface OrderTab {
  id: OrderTabId;
  label: string;
}

export const ORDER_TABS: OrderTab[] = [
  { id: 'all', label: 'Todos' },
  { id: 'pending_payment', label: 'Pendientes de pago' },
  { id: 'to_fulfill', label: 'Por surtir' },
  { id: 'ready_for_shipping', label: 'Listos para envío' },
  { id: 'ready_for_pickup', label: 'Listos para entrega' },
  { id: 'in_transit', label: 'En transito' },
  { id: 'delivered', label: 'Entregados' },
];

const ORDER_TAB_IDS = new Set<OrderTabId>(ORDER_TABS.map((t) => t.id));

export function isValidOrderTabId(x: string): x is OrderTabId {
  return ORDER_TAB_IDS.has(x as OrderTabId);
}

/** Surtido / listo para operación (envío o entrega en tienda): pago OK y estado post-preparación. */
export function isSurtidoListoParaOperacion(order: Order): boolean {
  const paidOk = order.payment_status === 'paid' || order.payment_status === 'overcharged';
  if (!paidOk) return false;
  return order.status === 'completed' || order.status === 'ready';
}

/** Enlaces y localStorage antiguos. */
export function normalizeLegacyOrderTabId(x: string): OrderTabId | null {
  if (x === 'completed') return 'ready_for_shipping';
  if (x === 'requires_action' || x === 'incidents') return 'all';
  if (ORDER_TAB_IDS.has(x as OrderTabId)) return x as OrderTabId;
  return null;
}

export function orderMatchesTab(order: Order, tab: OrderTabId): boolean {
  switch (tab) {
    case 'pending_payment':
      return order.payment_status === 'pending' || order.payment_status === 'failed';
    case 'to_fulfill':
      return (order.payment_status === 'paid' || order.payment_status === 'overcharged') && order.status === 'confirmed';
    case 'in_transit':
      return ['assigned', 'picked_up', 'in_transit'].includes(order.status);
    case 'ready_for_shipping':
      return isSurtidoListoParaOperacion(order) && !isPickupOrder(order);
    case 'ready_for_pickup':
      return isSurtidoListoParaOperacion(order) && isPickupOrder(order);
    case 'delivered':
      return order.status === 'delivered';
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
