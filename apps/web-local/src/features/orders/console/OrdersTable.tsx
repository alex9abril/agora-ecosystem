import { Order } from '@/lib/orders';
import { formatOrderRelativeTime } from './orderRelativeTime';
import {
  customerName,
  formatOrderNumber,
  paymentBadgeLabel,
  statusBadgeLabel,
} from './orderPresentation';
import { getOrderSeverity, severityClasses } from './orderSeverity';
import { getNextAction } from './orderNextAction';
import { canShowPrepareSurtido } from './orderOperational';
import { OrdersRowMenu } from './OrdersRowMenu';

interface OrdersTableProps {
  orders: Order[];
  timezone: string;
  density: 'comfortable' | 'compact';
  onOpen: (orderId: string) => void;
  onPrepare: (orderId: string) => void;
}

export function OrdersTable({ orders, timezone, density, onOpen, onPrepare }: OrdersTableProps) {
  const rowHeight = density === 'compact' ? 'py-1.5' : 'py-2.5';

  return (
    <div className="flex-1 min-h-0 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 overflow-hidden">
      <div className="h-full overflow-auto">
        <table className="min-w-full border-separate border-spacing-0">
          <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-neutral-900">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Pedido</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Cliente</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Estado</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Pago</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Total</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Siguiente accion</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const severity = getOrderSeverity(order);
              const severityUi = severityClasses(severity);
              const nextAction = getNextAction(order);
              const showPrepare = canShowPrepareSurtido(order);
              return (
                <tr
                  key={order.id}
                  className={`${severityUi.border} border-b border-gray-100 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-900/70`}
                >
                  <td className={`px-3 ${rowHeight} align-top`}>
                    <button
                      type="button"
                      onClick={() => onOpen(order.id)}
                      className="font-mono text-xs text-gray-900 dark:text-gray-100 hover:underline"
                    >
                      #{formatOrderNumber(order)}
                    </button>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {formatOrderRelativeTime(order.created_at, 'es-MX', timezone)}
                    </p>
                  </td>
                  <td className={`px-3 ${rowHeight} align-top`}>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{customerName(order)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[240px]">
                      {order.client_phone || order.client_email || 'Sin contacto'}
                    </p>
                  </td>
                  <td className={`px-3 ${rowHeight} align-top`}>
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      {statusBadgeLabel(order.status)}
                    </span>
                  </td>
                  <td className={`px-3 ${rowHeight} align-top`}>
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-gray-100 text-gray-700 dark:bg-neutral-700 dark:text-gray-200">
                      {paymentBadgeLabel(order.payment_status)}
                    </span>
                  </td>
                  <td className={`px-3 ${rowHeight} align-top text-right text-sm tabular-nums text-gray-900 dark:text-gray-100`}>
                    {new Intl.NumberFormat('es-MX', {
                      style: 'currency',
                      currency: 'MXN',
                    }).format(Number(order.total_amount || 0))}
                  </td>
                  <td className={`px-3 ${rowHeight} align-top`}>
                    <span className={`text-sm font-medium ${severityUi.text}`}>{nextAction.label}</span>
                    {order.has_shipping_label === false &&
                    ['ready', 'in_transit', 'assigned', 'picked_up'].includes(order.status) ? (
                      <p className="text-[11px] mt-0.5 text-red-600 dark:text-red-400">Sin guia</p>
                    ) : null}
                  </td>
                  <td className={`px-3 ${rowHeight} align-top text-right`}>
                    <div className="inline-flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onOpen(order.id)}
                        className="h-8 px-2.5 rounded-md border border-gray-300 dark:border-neutral-600 text-xs text-gray-700 dark:text-gray-200"
                      >
                        Ver
                      </button>
                      {showPrepare ? (
                        <button
                          type="button"
                          onClick={() => onPrepare(order.id)}
                          className="h-8 px-2.5 rounded-md bg-gray-900 dark:bg-white text-white dark:text-black text-xs"
                        >
                          Preparar
                        </button>
                      ) : null}
                      <OrdersRowMenu order={order} onOpen={onOpen} onPrepare={onPrepare} showPrepare={showPrepare} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
