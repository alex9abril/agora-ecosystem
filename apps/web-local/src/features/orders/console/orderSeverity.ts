import { Order } from '@/lib/orders';
import { isMissingShippingGuide } from './orderOperational';
import { hoursSince } from './orderRelativeTime';

export type SeverityLevel = 'neutral' | 'info' | 'warning' | 'critical' | 'success';

export function getOrderSeverity(order: Order): SeverityLevel {
  if (order.status === 'cancelled' || order.status === 'refunded') return 'neutral';
  if (order.status === 'delivered' || order.status === 'completed') return 'success';

  const ageHours = hoursSince(order.created_at);
  const isPendingPayment = order.payment_status === 'pending' || order.payment_status === 'failed';
  if (isPendingPayment && ageHours >= 24) return 'critical';
  if (isPendingPayment) return 'warning';

  const readyToFulfill =
    (order.payment_status === 'paid' || order.payment_status === 'overcharged') &&
    order.status === 'confirmed';
  if (readyToFulfill && ageHours >= 12) return 'critical';
  if (readyToFulfill) return 'warning';

  if (isMissingShippingGuide(order)) {
    const h = hoursSince(order.updated_at);
    if (order.status === 'ready' && h >= 6) return 'critical';
    return 'warning';
  }

  if (order.status === 'in_transit' || order.status === 'assigned' || order.status === 'picked_up') {
    return 'info';
  }

  return 'info';
}

export function severityClasses(severity: SeverityLevel): { border: string; badge: string; text: string } {
  switch (severity) {
    case 'critical':
      return {
        border: 'border-l-4 border-l-red-500',
        badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        text: 'text-red-700 dark:text-red-300',
      };
    case 'warning':
      return {
        border: 'border-l-4 border-l-amber-500',
        badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
        text: 'text-amber-700 dark:text-amber-300',
      };
    case 'success':
      return {
        border: 'border-l-4 border-l-emerald-500',
        badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
        text: 'text-emerald-700 dark:text-emerald-300',
      };
    case 'neutral':
      return {
        border: 'border-l-4 border-l-gray-300 dark:border-l-neutral-600',
        badge: 'bg-gray-100 text-gray-700 dark:bg-neutral-700 dark:text-gray-300',
        text: 'text-gray-600 dark:text-gray-300',
      };
    default:
      return {
        border: 'border-l-4 border-l-blue-500',
        badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        text: 'text-blue-700 dark:text-blue-300',
      };
  }
}
