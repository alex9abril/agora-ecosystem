import Link from 'next/link';

const PIPELINE_ORDER = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'completed',
  'assigned',
  'picked_up',
  'in_transit',
] as const;

const LABELS: Record<string, string> = {
  pending: 'Nuevo / pendiente',
  confirmed: 'Confirmado',
  preparing: 'En preparación',
  ready: 'Listo',
  completed: 'Surtido / listo envío',
  assigned: 'Asignado carrier',
  picked_up: 'Recolectado',
  in_transit: 'En tránsito',
};

export function PipelineHealth(props: { openPipelineByStatus: Record<string, number> }) {
  const entries = PIPELINE_ORDER.map((st) => ({
    status: st,
    count: props.openPipelineByStatus[st] ?? 0,
  }));
  const max = Math.max(...entries.map((e) => e.count), 1);
  const total = entries.reduce((s, e) => s + e.count, 0);

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium text-neutral-900">Salud del flujo (abiertos)</h2>
          <p className="text-[11px] text-neutral-600">{total} pedidos activos en pipeline</p>
        </div>
        <Link href="/orders" className="text-xs text-neutral-700 hover:underline">
          Ver pedidos
        </Link>
      </div>
      <div className="flex flex-col gap-3">
        {entries.map((e) => {
          const pct = max > 0 ? Math.round((e.count / max) * 100) : 0;
          return (
            <Link
              key={e.status}
              href={`/orders?tab=all`}
              className="block group"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-600 group-hover:text-neutral-900">
                  {LABELS[e.status] ?? e.status}
                </span>
                <span className="tabular-nums font-medium text-neutral-900">{e.count}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-neutral-200">
                <div
                  className="h-full rounded-full bg-neutral-800 transition-all group-hover:bg-neutral-700"
                  style={{ width: `${pct}%`, minWidth: e.count > 0 ? '4px' : '0' }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
