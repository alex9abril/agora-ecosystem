import { PeriodSegmentedControl } from '@/components/dashboard/PeriodSegmentedControl';
import { DashboardPeriodId } from './dashboardPeriod';

const STATUS_OPTS = [
  { value: '', label: 'Estado (todos)' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'preparing', label: 'Preparando' },
  { value: 'ready', label: 'Listo' },
  { value: 'completed', label: 'Surtido (listo envío)' },
  { value: 'in_transit', label: 'En tránsito' },
  { value: 'delivered', label: 'Entregado' },
];

const PAY_OPTS = [
  { value: '', label: 'Pago (todos)' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'paid', label: 'Pagado' },
  { value: 'failed', label: 'Fallido' },
  { value: 'overcharged', label: 'Sobrepago' },
];

export function DashboardToolbar(props: {
  selectedPeriod: DashboardPeriodId;
  onPeriod: (p: DashboardPeriodId) => void;
  filterStatus: string;
  filterPaymentStatus: string;
  filterCarrier: string;
  onFilterStatus: (v: string) => void;
  onFilterPayment: (v: string) => void;
  onFilterCarrier: (v: string) => void;
  branchName?: string;
  /** Deshabilita cambio de período mientras cargan métricas */
  periodLoading?: boolean;
}) {
  return (
    <div className="flex flex-col gap-6 border-b border-neutral-200 pb-6 lg:flex-row lg:items-end lg:justify-between lg:gap-x-10">
      <div className="min-w-0 lg:max-w-xl">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Torre de control</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {props.branchName
            ? `Operación en tiempo casi real — ${props.branchName}`
            : 'Selecciona sucursal para métricas operativas.'}
        </p>
      </div>
      <div className="shrink-0 px-1 sm:px-0 lg:px-0">
        <PeriodSegmentedControl
          value={props.selectedPeriod}
          onChange={props.onPeriod}
          disabled={props.periodLoading}
        />
      </div>
      <div className="flex w-full flex-wrap gap-2 sm:gap-3 lg:max-w-xl lg:justify-end">
        <select
          value={props.filterStatus}
          onChange={(e) => props.onFilterStatus(e.target.value)}
          className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-xs text-neutral-900 outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-1"
        >
          {STATUS_OPTS.map((o) => (
            <option key={o.value || 'all'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={props.filterPaymentStatus}
          onChange={(e) => props.onFilterPayment(e.target.value)}
          className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-xs text-neutral-900 outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-1"
        >
          {PAY_OPTS.map((o) => (
            <option key={o.value || 'all'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Carrier (guía)"
          value={props.filterCarrier}
          onChange={(e) => props.onFilterCarrier(e.target.value)}
          className="min-w-[8rem] flex-1 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-xs text-neutral-900 placeholder:text-neutral-400 outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-1"
        />
      </div>
    </div>
  );
}