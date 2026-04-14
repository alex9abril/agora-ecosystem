import Link from 'next/link';
import type { OperationsDashboardResponse } from '@/lib/orders';
import { statusBadgeLabel, paymentBadgeLabel } from '@/features/orders/console/orderPresentation';
import type { Order } from '@/lib/orders';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
}

export function OperationalOrdersTable(props: { rows: OperationsDashboardResponse['attentionOrders'] }) {
  if (!props.rows.length) {
    return (
      <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-medium text-neutral-900">Cola operativa</h2>
        <p className="mt-3 text-sm text-neutral-600">No hay pedidos en la cola de atención con los criterios actuales.</p>
        <Link href="/orders?tab=all" className="mt-2 inline-block text-xs text-neutral-700 hover:underline">
          Abrir consola de pedidos
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-neutral-900">Pedidos que requieren atención</h2>
        <Link href="/orders?tab=all" className="text-xs text-neutral-700 hover:underline">
          Ver todos
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead>
            <tr className="border-b border-neutral-200 text-[10px] uppercase tracking-wider text-neutral-500">
              <th className="pb-2 pr-3">Cliente</th>
              <th className="pb-2 pr-3">Estado</th>
              <th className="pb-2 pr-3">Pago</th>
              <th className="pb-2 pr-3">Guía</th>
              <th className="pb-2 pr-3 text-right">Total</th>
              <th className="pb-2 text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {props.rows.map((r) => {
              const mock = {
                status: r.status,
                payment_status: r.payment_status,
              } as Order;
              return (
                <tr key={r.id} className="border-b border-neutral-200 hover:bg-neutral-50">
                  <td className="py-2 pr-3 text-neutral-800">
                    {[r.client_first_name, r.client_last_name].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="py-2 pr-3">
                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-800">
                      {statusBadgeLabel(mock.status)}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-800">
                      {paymentBadgeLabel(mock.payment_status)}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-neutral-600">
                    {r.has_shipping_label ? r.tracking_number || '—' : <span className="font-medium text-amber-800">Sin guía</span>}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-neutral-900">
                    {formatCurrency(Number(r.total_amount))}
                  </td>
                  <td className="py-2 text-right">
                    <Link href={`/orders/${r.id}`} className="font-medium text-neutral-900 hover:underline">
                      Abrir
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
