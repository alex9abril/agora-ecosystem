import { Order } from '@/lib/orders';
import { hoursSince } from './orderRelativeTime';

/** Alineado con `orders/[id]/prepare.tsx` y el botón “Surtir” del detalle: solo `confirmed`, pago verificado, sin txs pendientes, con ítems. */
export function canShowPrepareSurtido(order: Order): boolean {
  if (order.status !== 'confirmed') return false;
  if (order.payment_status !== 'paid') return false;
  const hasPendingTx = (order.payment_transactions ?? []).some((t) => {
    const row = t as { status?: string; transaction_status?: string };
    const s = String(row.status ?? row.transaction_status ?? '').toLowerCase();
    return s === 'pending';
  });
  if (hasPendingTx) return false;
  const itemCount = order.items?.length ?? order.item_count ?? 0;
  return itemCount > 0;
}

export function isPickupOrder(order: Order): boolean {
  return order.delivery_address_text === 'Recoger en tienda';
}

/** Requiere guía de paquetería: envío a domicilio, pagado, sin fila en shipping_labels (API). */
export function isMissingShippingGuide(order: Order): boolean {
  if (isPickupOrder(order)) return false;
  if (order.has_shipping_label !== false) return false;
  if (!(order.payment_status === 'paid' || order.payment_status === 'overcharged')) return false;
  return ['ready', 'assigned', 'picked_up', 'in_transit'].includes(order.status);
}

/** Pedido viejo aún activo (heurística operativa). */
export function isStaleActiveOrder(order: Order): boolean {
  if (['completed', 'delivered', 'cancelled', 'refunded'].includes(order.status)) return false;
  return hoursSince(order.created_at) >= 48;
}
