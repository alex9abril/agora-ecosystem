import Link from 'next/link';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
}

function pctChange(currentVal: number, previousVal: number): number | null {
  if (previousVal === 0) return currentVal > 0 ? 100 : null;
  return Math.round(((currentVal - previousVal) / previousVal) * 1000) / 10;
}

export function ExecutiveKpiStrip(props: {
  totalRevenue: number;
  orderCount: number;
  averageTicket: number;
  previous?: { totalRevenue: number; orderCount: number };
  periodLabel: string;
  todayOrders: number;
  todayRevenuePaid: number;
}) {
  const revPct = props.previous ? pctChange(props.totalRevenue, props.previous.totalRevenue) : null;
  const ordPct = props.previous ? pctChange(props.orderCount, props.previous.orderCount) : null;

  const cards = [
    {
      label: 'Ingresos del período',
      value: formatCurrency(props.totalRevenue),
      sub:
        revPct != null ? (
          <span className={revPct >= 0 ? 'text-emerald-700' : 'text-red-600'}>
            {revPct >= 0 ? '+' : ''}
            {revPct}% vs {props.periodLabel}
          </span>
        ) : (
          <span className="text-neutral-500">—</span>
        ),
      href: '/orders',
    },
    {
      label: 'Pedidos del período',
      value: props.orderCount.toLocaleString('es-MX'),
      sub:
        ordPct != null ? (
          <span className={ordPct >= 0 ? 'text-emerald-700' : 'text-red-600'}>
            {ordPct >= 0 ? '+' : ''}
            {ordPct}% vs {props.periodLabel}
          </span>
        ) : (
          <span className="text-neutral-500">—</span>
        ),
      href: '/orders',
    },
    {
      label: 'Ticket promedio',
      value: formatCurrency(props.averageTicket),
      sub: <span className="text-neutral-500">Sobre pedidos del período</span>,
      href: '/orders',
    },
    {
      label: 'Pedidos hoy',
      value: props.todayOrders.toLocaleString('es-MX'),
      sub: (
        <span className="text-neutral-500">Pagado hoy: {formatCurrency(props.todayRevenuePaid)}</span>
      ),
      href: '/orders?tab=all',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {cards.map((c) => (
        <Link
          key={c.label}
          href={c.href}
          className="rounded-xl border border-neutral-200 bg-white px-4 py-4 shadow-sm transition hover:border-neutral-300"
        >
          <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">{c.label}</p>
          <p className="mt-1.5 text-lg font-semibold tabular-nums text-neutral-900">{c.value}</p>
          <div className="mt-1 text-[11px]">{c.sub}</div>
        </Link>
      ))}
    </div>
  );
}
