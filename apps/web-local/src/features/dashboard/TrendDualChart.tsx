function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(
    value,
  );
}

export function TrendDualChart(props: {
  revenueByDay: { date: string; revenue: number }[];
  ordersByDay: { date: string; count: number }[];
}) {
  const daysSet = new Set<string>();
  props.revenueByDay.forEach((d) => daysSet.add(d.date));
  props.ordersByDay.forEach((d) => daysSet.add(d.date));
  const days = Array.from(daysSet).sort();
  const revMap = new Map(props.revenueByDay.map((d) => [d.date, d.revenue]));
  const cntMap = new Map(props.ordersByDay.map((d) => [d.date, d.count]));

  if (days.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-600 shadow-sm">
        Sin datos en el rango seleccionado
      </div>
    );
  }

  const seriesRev = days.map((d) => revMap.get(d) ?? 0);
  const seriesCnt = days.map((d) => cntMap.get(d) ?? 0);
  const maxRev = Math.max(...seriesRev, 1);
  const maxCnt = Math.max(...seriesCnt, 1);

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-medium text-neutral-900">Tendencia</h2>
      <p className="mb-4 text-[11px] text-neutral-600">Ingresos pagados y volumen de pedidos por día</p>
      <div className="space-y-6">
        <div>
          <p className="mb-2 text-[10px] uppercase tracking-wider text-neutral-500">Ingresos</p>
          <div className="flex h-36 items-end gap-0.5">
            {days.map((d, i) => {
              const v = seriesRev[i];
              const h = maxRev > 0 ? (v / maxRev) * 100 : 0;
              return (
                <div
                  key={d}
                  className="min-w-0 flex-1 rounded-t bg-neutral-800/85 hover:bg-neutral-800 transition-colors"
                  style={{ height: `${Math.max(h, 2)}%` }}
                  title={`${d}: ${formatCurrency(v)}`}
                />
              );
            })}
          </div>
        </div>
        <div>
          <p className="mb-2 text-[10px] uppercase tracking-wider text-neutral-500">Pedidos (todos en período)</p>
          <div className="flex h-28 items-end gap-0.5">
            {days.map((d, i) => {
              const v = seriesCnt[i];
              const h = maxCnt > 0 ? (v / maxCnt) * 100 : 0;
              return (
                <div
                  key={`c-${d}`}
                  className="min-w-0 flex-1 rounded-t bg-neutral-500/80 hover:bg-neutral-500 transition-colors"
                  style={{ height: `${Math.max(h, 2)}%` }}
                  title={`${d}: ${v} pedidos`}
                />
              );
            })}
          </div>
        </div>
        <div className="flex justify-between text-[10px] text-neutral-500">
          <span>{days[0]}</span>
          <span>{days[days.length - 1]}</span>
        </div>
      </div>
    </section>
  );
}
