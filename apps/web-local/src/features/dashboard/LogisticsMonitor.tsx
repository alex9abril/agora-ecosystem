import type { OperationsDashboardResponse } from '@/lib/orders';

export function LogisticsMonitor(props: {
  logistics: OperationsDashboardResponse['logistics'];
  degraded?: boolean;
}) {
  if (!props.logistics) {
    return (
      <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-medium text-neutral-900">Logística</h2>
        <p className="mt-2 text-sm text-neutral-600">Sin datos de guías en el período.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-neutral-900">Logística</h2>
        {props.degraded && (
          <span className="text-[10px] font-medium text-amber-800">Modo degradado (revisa migración de guías)</span>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-neutral-500">Por carrier</p>
          <ul className="mt-2 space-y-2">
            {props.logistics.byCarrier.length === 0 ? (
              <li className="text-xs text-neutral-500">—</li>
            ) : (
              props.logistics.byCarrier.map((c) => (
                <li key={c.carrier} className="flex justify-between text-xs text-neutral-800">
                  <span className="truncate pr-2">{c.carrier}</span>
                  <span className="tabular-nums text-neutral-600">{c.count}</span>
                </li>
              ))
            )}
          </ul>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-neutral-500">Estado normalizado (guías)</p>
          <ul className="mt-2 space-y-2">
            {props.logistics.byNormalizedStatus.length === 0 ? (
              <li className="text-xs text-neutral-500">—</li>
            ) : (
              props.logistics.byNormalizedStatus.map((c) => (
                <li key={c.status} className="flex justify-between text-xs text-neutral-800">
                  <span>{c.status}</span>
                  <span className="tabular-nums text-neutral-600">{c.count}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-neutral-200 pt-4 text-center">
        <div>
          <p className="text-2xl font-semibold tabular-nums text-red-700">{props.logistics.staleInTransitCount}</p>
          <p className="text-[10px] text-neutral-600">Sin evento &gt;48h (en tránsito / carrier)</p>
        </div>
        <div>
          <p className="text-2xl font-semibold tabular-nums text-neutral-900">
            {props.logistics.inTransitWithLabelCount}
          </p>
          <p className="text-[10px] text-neutral-600">En tránsito con guía activa</p>
        </div>
      </div>
    </section>
  );
}
