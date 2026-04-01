import type { OperationsDashboardResponse } from '@/lib/orders';

export function ActivityFeed(props: { items: OperationsDashboardResponse['recentActivity'] }) {
  if (!props.items.length) {
    return (
      <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="text-xs font-medium text-neutral-800">Actividad reciente</h2>
        <p className="mt-2 text-[11px] text-neutral-600">Sin eventos de integración recientes.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <h2 className="text-xs font-medium text-neutral-800">Actividad reciente</h2>
      <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
        {props.items.map((e) => (
          <li
            key={e.id}
            className="border-l-2 border-neutral-300 pl-2 text-[11px] text-neutral-600"
          >
            <span className="text-neutral-800">{e.integration}</span>
            <span className="mx-1 text-neutral-400">·</span>
            <span>{e.eventType}</span>
            {e.status === 'failed' && <span className="ml-1 text-red-600">falló</span>}
            <div className="text-[10px] text-neutral-500">
              {e.createdAt ? new Date(e.createdAt).toLocaleString('es-MX', { hour12: false }) : ''}
              {e.orderId ? ` · ${e.orderId.slice(0, 8)}…` : ''}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
