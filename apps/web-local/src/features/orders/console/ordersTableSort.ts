import { Order } from '@/lib/orders';
import {
  customerName,
  paymentBadgeLabel,
  statusBadgeLabel,
} from './orderPresentation';
import { getNextAction } from './orderNextAction';

export type OrdersTableSortKey =
  | 'pedido'
  | 'cliente'
  | 'estado'
  | 'pago'
  | 'total'
  | 'next_action'
  | 'creado';

export type OrdersTableSortDir = 'asc' | 'desc';

export const ORDERS_TABLE_SORT_KEYS: OrdersTableSortKey[] = [
  'pedido',
  'cliente',
  'estado',
  'pago',
  'total',
  'next_action',
  'creado',
];

export function isValidOrdersTableSort(
  x: unknown,
): x is { key: OrdersTableSortKey; dir: OrdersTableSortDir } {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.key === 'string' &&
    ORDERS_TABLE_SORT_KEYS.includes(o.key as OrdersTableSortKey) &&
    (o.dir === 'asc' || o.dir === 'desc')
  );
}

/** Primera pulsación en la columna: fechas e importes suelen ir de mayor a menor. */
export function defaultSortDirForColumn(key: OrdersTableSortKey): OrdersTableSortDir {
  if (key === 'pedido' || key === 'total' || key === 'creado') return 'desc';
  return 'asc';
}

function secondaryCompare(a: Order, b: Order): number {
  const t = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  if (t !== 0) return t;
  return a.id.localeCompare(b.id);
}

export function compareOrdersForSort(
  a: Order,
  b: Order,
  key: OrdersTableSortKey,
  dir: OrdersTableSortDir,
): number {
  const m = dir === 'asc' ? 1 : -1;
  let c = 0;
  switch (key) {
    case 'pedido':
      c = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      break;
    case 'creado':
      c = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      break;
    case 'cliente':
      c = customerName(a).localeCompare(customerName(b), 'es', { sensitivity: 'base' });
      break;
    case 'estado':
      c = statusBadgeLabel(a.status).localeCompare(statusBadgeLabel(b.status), 'es', {
        sensitivity: 'base',
      });
      break;
    case 'pago':
      c = paymentBadgeLabel(a.payment_status).localeCompare(paymentBadgeLabel(b.payment_status), 'es', {
        sensitivity: 'base',
      });
      break;
    case 'total':
      c = Number(a.total_amount || 0) - Number(b.total_amount || 0);
      break;
    case 'next_action':
      c = getNextAction(a).label.localeCompare(getNextAction(b).label, 'es', { sensitivity: 'base' });
      break;
    default:
      break;
  }
  if (c !== 0) return m * c;
  return secondaryCompare(a, b);
}
