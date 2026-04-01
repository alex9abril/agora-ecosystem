import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ordersService, type OperationsDashboardResponse } from '@/lib/orders';
import { Skeleton } from '@/components/ui/Skeleton';
import { DashboardToolbar } from './DashboardToolbar';
import { ExecutiveKpiStrip } from './ExecutiveKpiStrip';
import { OperationalPulseBar } from './OperationalPulseBar';
import { AttentionPanel } from './AttentionPanel';
import { PipelineHealth } from './PipelineHealth';
import { TrendDualChart } from './TrendDualChart';
import { LogisticsMonitor } from './LogisticsMonitor';
import { OperationalOrdersTable } from './OperationalOrdersTable';
import { ActivityFeed } from './ActivityFeed';
import { getPeriodDates, type DashboardPeriodId } from './dashboardPeriod';

export function DashboardControlTower(props: {
  businessId: string | undefined;
  businessName?: string;
}) {
  const router = useRouter();
  const [period, setPeriod] = useState<DashboardPeriodId>('today');

  useEffect(() => {
    if (router.pathname === '/dashboard') {
      setPeriod('today');
    }
  }, [router.pathname]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('');
  const [filterCarrier, setFilterCarrier] = useState('');
  const [data, setData] = useState<OperationsDashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dates = useMemo(() => getPeriodDates(period), [period]);

  useEffect(() => {
    if (!props.businessId) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    ordersService
      .getOperationsDashboard(props.businessId, {
        startDate: dates.startDate,
        endDate: dates.endDate,
        previousStartDate: dates.previousStartDate,
        previousEndDate: dates.previousEndDate,
        filterStatus: filterStatus || undefined,
        filterPaymentStatus: filterPaymentStatus || undefined,
        filterCarrier: filterCarrier.trim() || undefined,
      })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || 'Error al cargar el dashboard');
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    props.businessId,
    dates.startDate,
    dates.endDate,
    dates.previousStartDate,
    dates.previousEndDate,
    filterStatus,
    filterPaymentStatus,
    filterCarrier,
  ]);

  const hasBranch = Boolean(props.businessId);

  function DashboardSkeleton() {
    return (
      <div className="mt-8 space-y-8" aria-busy="true" aria-label="Cargando métricas">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-neutral-200 bg-white px-4 py-4 shadow-sm">
              <Skeleton className="mb-2 h-2.5 w-24 bg-neutral-200" />
              <Skeleton className="mb-2 h-7 w-20 bg-neutral-200" />
              <Skeleton className="h-2.5 w-28 bg-neutral-200/80" />
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <Skeleton className="mb-3 h-3 w-40 bg-neutral-200" />
          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-4 w-36 bg-neutral-200" />
            <Skeleton className="h-4 w-48 bg-neutral-200" />
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex justify-between">
            <Skeleton className="h-4 w-40 bg-neutral-200" />
            <Skeleton className="h-3 w-24 bg-neutral-200" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-3">
                <Skeleton className="mb-2 h-2.5 w-20 bg-neutral-200" />
                <Skeleton className="mb-1 h-8 w-12 bg-neutral-200" />
                <Skeleton className="h-2 w-28 bg-neutral-200/80" />
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <Skeleton className="mb-4 h-4 w-48 bg-neutral-200" />
            <div className="space-y-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i}>
                  <div className="mb-1 flex justify-between">
                    <Skeleton className="h-3 w-28 bg-neutral-200" />
                    <Skeleton className="h-3 w-8 bg-neutral-200" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full bg-neutral-200" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <Skeleton className="mb-2 h-4 w-32 bg-neutral-200" />
            <Skeleton className="mb-4 h-3 w-56 bg-neutral-200/80" />
            <Skeleton className="mb-3 h-36 w-full rounded-lg bg-neutral-200" />
            <Skeleton className="h-28 w-full rounded-lg bg-neutral-200/90" />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm lg:col-span-2">
            <Skeleton className="mb-4 h-4 w-36 bg-neutral-200" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-32 w-full rounded-lg bg-neutral-200" />
              <Skeleton className="h-32 w-full rounded-lg bg-neutral-200" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-neutral-200 pt-4">
              <Skeleton className="mx-auto h-16 w-24 bg-neutral-200" />
              <Skeleton className="mx-auto h-16 w-24 bg-neutral-200" />
            </div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <Skeleton className="mb-3 h-3 w-32 bg-neutral-200" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md bg-neutral-200" />
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex justify-between">
            <Skeleton className="h-4 w-52 bg-neutral-200" />
            <Skeleton className="h-3 w-20 bg-neutral-200" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full rounded-md bg-neutral-200/90" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <DashboardToolbar
        selectedPeriod={period}
        onPeriod={setPeriod}
        filterStatus={filterStatus}
        filterPaymentStatus={filterPaymentStatus}
        filterCarrier={filterCarrier}
        onFilterStatus={setFilterStatus}
        onFilterPayment={setFilterPaymentStatus}
        onFilterCarrier={setFilterCarrier}
        branchName={props.businessName}
        periodLoading={hasBranch && loading}
      />

      {!hasBranch && (
        <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-600 shadow-sm">
          Selecciona una sucursal en la barra superior para ver la torre de control.
        </div>
      )}

      {error && hasBranch && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {hasBranch && loading && <DashboardSkeleton />}

      {hasBranch && !loading && data && (
        <div className="mt-8 space-y-8">
          <ExecutiveKpiStrip
            totalRevenue={data.period.totalRevenue}
            orderCount={data.period.orderCount}
            averageTicket={data.period.averageTicket}
            previous={data.period.previous}
            periodLabel={dates.periodLabel}
            todayOrders={data.today.ordersCreated}
            todayRevenuePaid={data.today.revenuePaid}
          />

          <OperationalPulseBar
            requiresAction={data.attention.requiresAction}
            toFulfill={data.attention.toFulfill}
            inTransit={data.attention.inTransit}
          />

          <AttentionPanel attention={data.attention} />

          <div className="grid gap-6 lg:grid-cols-2">
            <PipelineHealth openPipelineByStatus={data.openPipelineByStatus} />
            <TrendDualChart revenueByDay={data.period.revenueByDay} ordersByDay={data.period.ordersByDay} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <LogisticsMonitor logistics={data.logistics} degraded={data.logisticsDegraded} />
            </div>
            <ActivityFeed items={data.recentActivity} />
          </div>

          <OperationalOrdersTable rows={data.attentionOrders} />

          <div className="flex justify-end border-t border-neutral-200 pt-4">
            <Link href="/settings/branches" className="text-xs text-neutral-600 hover:text-neutral-900 hover:underline">
              Administrar sucursales
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
