import type { DashboardPeriodId } from '@/features/dashboard/dashboardPeriod';

const ITEMS: { id: DashboardPeriodId; label: string }[] = [
  { id: 'today', label: 'Hoy' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
  { id: 'year', label: 'Año' },
];

/**
 * Selector de período: flex + gap (cada botón con ancho de contenido).
 * Evita grid/1fr en toolbars flex donde el texto nowrap se solapaba.
 */
export function PeriodSegmentedControl(props: {
  value: DashboardPeriodId;
  onChange: (id: DashboardPeriodId) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="w-full max-w-md shrink-0"
      data-agora-period-ui="tailwind-flex"
      aria-busy={props.disabled ? true : undefined}
    >
      <p
        id="dashboard-period-label"
        className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400"
      >
        Período de análisis
      </p>
      <div
        role="tablist"
        aria-labelledby="dashboard-period-label"
        className="flex flex-wrap gap-2 rounded-xl border border-neutral-300 bg-neutral-100 p-2 dark:border-neutral-600 dark:bg-neutral-800/90"
      >
        {ITEMS.map((p) => {
          const selected = props.value === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={selected}
              disabled={props.disabled}
              onClick={() => props.onChange(p.id)}
              className={[
                'inline-flex shrink-0 select-none items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                'min-h-[44px] whitespace-nowrap',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900',
                'disabled:cursor-wait disabled:opacity-50',
                selected
                  ? 'bg-black text-white shadow-md shadow-black/20 ring-1 ring-black/10 dark:bg-neutral-100 dark:text-neutral-900 dark:shadow-md dark:ring-1 dark:ring-white/20'
                  : 'bg-white text-neutral-800 shadow-sm hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800',
              ].join(' ')}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
