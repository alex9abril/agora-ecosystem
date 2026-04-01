import Link from 'next/link';
import type { OperationsDashboardResponse } from '@/lib/orders';

const items: {
  key: keyof OperationsDashboardResponse['attention'];
  title: string;
  hint: string;
  href: string;
  urgent?: boolean;
}[] = [
  {
    key: 'requiresAction',
    title: 'Requieren acción',
    hint: 'Cola prioritaria',
    href: '/orders?tab=requires_action',
    urgent: true,
  },
  {
    key: 'incidents',
    title: 'Incidencias',
    hint: 'Críticos por tiempo o guía',
    href: '/orders?tab=incidents',
    urgent: true,
  },
  {
    key: 'missingGuide',
    title: 'Sin guía',
    hint: 'Envío, pagado, sin etiqueta',
    href: '/orders?tab=requires_action&onlyNoGuide=1',
  },
  {
    key: 'pendingPayment',
    title: 'Pago pendiente',
    hint: 'Cobrar o liberar',
    href: '/orders?tab=pending_payment',
  },
  {
    key: 'toFulfill',
    title: 'Por surtir',
    hint: 'Pagado, confirmado',
    href: '/orders?tab=to_fulfill',
  },
  {
    key: 'staleOpen48h',
    title: 'Abiertos +48h',
    hint: 'Revisar estancamiento',
    href: '/orders?tab=requires_action&onlyStale=1',
  },
];

export function AttentionPanel(props: { attention: OperationsDashboardResponse['attention'] }) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-neutral-900">Atención inmediata</h2>
        <Link href="/orders?tab=requires_action" className="text-xs text-neutral-700 hover:underline">
          Abrir consola
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((it) => {
          const n = props.attention[it.key];
          return (
            <Link
              key={it.key}
              href={it.href}
              className={`rounded-lg border px-3 py-3 transition ${
                it.urgent && n > 0
                  ? 'border-amber-200 bg-amber-50 hover:border-amber-300'
                  : 'border-neutral-200 bg-neutral-50 hover:border-neutral-300 hover:bg-white'
              }`}
            >
              <p className="text-[11px] text-neutral-600">{it.title}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">{n}</p>
              <p className="mt-0.5 text-[10px] text-neutral-500">{it.hint}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
