import Link from 'next/link';

export function OperationalPulseBar(props: {
  requiresAction: number;
  toFulfill: number;
  inTransit: number;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm shadow-sm">
      <span className="w-full text-xs font-medium uppercase tracking-wide text-neutral-500 sm:w-auto">
        Operación hoy
      </span>
      <Link
        href="/orders?tab=requires_action"
        className="font-semibold tabular-nums text-neutral-900 underline-offset-2 hover:underline"
      >
        Requieren acción: {props.requiresAction.toLocaleString('es-MX')}
      </Link>
      <span className="hidden text-neutral-300 sm:inline" aria-hidden>
        ·
      </span>
      <Link
        href="/orders?tab=to_fulfill"
        className="tabular-nums text-neutral-700 underline-offset-2 hover:underline"
      >
        Por surtir / En tránsito: {props.toFulfill.toLocaleString('es-MX')} /{' '}
        {props.inTransit.toLocaleString('es-MX')}
      </Link>
    </div>
  );
}
