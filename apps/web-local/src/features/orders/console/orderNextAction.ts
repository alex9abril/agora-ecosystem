import { Order } from '@/lib/orders';
import { isPickupOrder } from './orderOperational';
import { hoursSince } from './orderRelativeTime';

export interface NextAction {
  label: string;
  intent: 'default' | 'warning' | 'danger';
}

export function getNextAction(order: Order): NextAction {
  if (order.status === 'cancelled' || order.status === 'refunded') {
    return { label: 'Ver detalle', intent: 'default' };
  }

  if (order.payment_status === 'pending') {
    return { label: 'Confirmar pago', intent: 'warning' };
  }

  if (order.payment_status === 'failed') {
    return { label: 'Revisar pago', intent: 'danger' };
  }

  if ((order.payment_status === 'paid' || order.payment_status === 'overcharged') && order.status === 'confirmed') {
    return { label: 'Preparar surtido', intent: 'default' };
  }

  if (order.status === 'ready') {
    if (isPickupOrder(order)) {
      return { label: 'Marcar recogido', intent: 'default' };
    }
    return order.has_shipping_label ? { label: 'Marcar enviado', intent: 'default' } : { label: 'Generar guia', intent: 'warning' };
  }

  if (order.status === 'in_transit' || order.status === 'assigned' || order.status === 'picked_up') {
    if (hoursSince(order.updated_at) > 48) {
      return { label: 'Resolver incidencia', intent: 'danger' };
    }
    return { label: 'Monitorear envio', intent: 'default' };
  }

  if (order.status === 'delivered') {
    return { label: 'Completar pedido', intent: 'default' };
  }

  return { label: 'Ver detalle', intent: 'default' };
}
