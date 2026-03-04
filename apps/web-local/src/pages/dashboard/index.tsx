import Head from 'next/head';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import LocalLayout from '@/components/layout/LocalLayout';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { getDefaultRouteForRole } from '@/lib/permissions';
import { BusinessRole } from '@/lib/users';
import { businessService, BusinessGroup, Business } from '@/lib/business';
import { ordersService, type DashboardStatsResponse } from '@/lib/orders';
import { Skeleton, SkeletonCard, SkeletonChart } from '@/components/ui/Skeleton';

function getPeriodDates(period: 'today' | 'week' | 'month' | 'year') {
  const now = new Date();
  const toISO = (d: Date) => d.toISOString();
  let start = new Date(now);
  let end = new Date(now);
  let prevStart: Date;
  let prevEnd: Date;
  let periodLabel: string;
  if (period === 'today') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    prevEnd = new Date(start);
    prevEnd.setSeconds(-1);
    prevStart = new Date(prevEnd);
    prevStart.setHours(0, 0, 0, 0);
    periodLabel = 'día anterior';
  } else if (period === 'week') {
    end.setHours(23, 59, 59, 999);
    start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    prevEnd = new Date(start);
    prevEnd.setSeconds(-1);
    prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - 6);
    prevStart.setHours(0, 0, 0, 0);
    periodLabel = 'semana anterior';
  } else if (period === 'month') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(end.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    prevEnd = new Date(start.getFullYear(), start.getMonth(), 0, 23, 59, 59, 999);
    prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), 1, 0, 0, 0, 0);
    periodLabel = 'mes anterior';
  } else {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(11, 31);
    end.setHours(23, 59, 59, 999);
    prevEnd = new Date(start.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    prevStart = new Date(start.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
    periodLabel = 'año anterior';
  }
  return {
    startDate: toISO(start),
    endDate: toISO(end),
    previousStartDate: toISO(prevStart),
    previousEndDate: toISO(prevEnd),
    periodLabel,
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendientes',
  confirmed: 'Confirmados',
  preparing: 'En preparación',
  ready: 'Listos',
  assigned: 'Asignados',
  picked_up: 'Recogidos',
  in_transit: 'En tránsito',
  delivered: 'Entregados',
  cancelled: 'Cancelados',
  refunded: 'Reembolsados',
};

export default function DashboardPage() {
  const router = useRouter();
  const { selectedBusiness, isLoading } = useSelectedBusiness();
  const { user } = useAuth();
  const [businessGroup, setBusinessGroup] = useState<BusinessGroup | null>(null);
  const [branches, setBranches] = useState<Business[]>([]);
  const [loadingGroup, setLoadingGroup] = useState(true);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;

    if (selectedBusiness) {
      const role = selectedBusiness.role as BusinessRole;
      const defaultRoute = getDefaultRouteForRole(role);
      
      // Solo redirigir si no es superadmin o admin
      if (role === 'operations_staff' || role === 'kitchen_staff') {
        router.push(defaultRoute);
      }
    }
  }, [selectedBusiness, isLoading, router]);

  // Cargar grupo empresarial y sucursales
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;

      try {
        // Cargar grupo empresarial
        setLoadingGroup(true);
        const group = await businessService.getMyBusinessGroup();
        setBusinessGroup(group);

        // Cargar sucursales
        setLoadingBranches(true);
        const allBranches = await businessService.getAllBranches(user.id);
        setBranches(allBranches);
      } catch (error: any) {
        console.error('Error cargando datos del dashboard:', error);
      } finally {
        setLoadingGroup(false);
        setLoadingBranches(false);
      }
    };

    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  const periodDates = useMemo(() => getPeriodDates(selectedPeriod), [selectedPeriod]);

  useEffect(() => {
    const businessId = selectedBusiness?.business_id;
    if (!businessId) {
      setStats(null);
      setStatsError(null);
      return;
    }
    let cancelled = false;
    setLoadingStats(true);
    setStatsError(null);
    ordersService
      .getDashboardStats(businessId, {
        startDate: periodDates.startDate,
        endDate: periodDates.endDate,
        previousStartDate: periodDates.previousStartDate,
        previousEndDate: periodDates.previousEndDate,
      })
      .then((data) => {
        if (!cancelled) {
          setStats(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setStatsError(err?.message || 'Error al cargar estadísticas');
          setStats(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingStats(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedBusiness?.business_id, periodDates.startDate, periodDates.endDate, periodDates.previousStartDate, periodDates.previousEndDate]);

  const initialLoading = (loadingGroup || loadingBranches) && businessGroup === null && branches.length === 0;
  const hasBranch = Boolean(selectedBusiness?.business_id);
  const current = stats?.current;
  const previous = stats?.previous;
  const periodLabel = periodDates.periodLabel;

  function pctChange(currentVal: number, previousVal: number): number | null {
    if (previousVal === 0) return currentVal > 0 ? 100 : null;
    return Math.round(((currentVal - previousVal) / previousVal) * 1000) / 10;
  }

  // Skeleton mientras carga el contenido principal (grupo y sucursales)
  if (initialLoading) {
    return (
      <>
        <Head>
          <title>Dashboard - AGORA Local</title>
        </Head>
        <LocalLayout>
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="mb-8">
              <Skeleton className="h-7 w-32 mb-2" />
              <Skeleton className="h-4 w-72" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
            <div className="mb-6">
              <SkeletonChart />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Skeleton className="h-80 rounded-lg bg-white dark:bg-neutral-800 p-6" />
              <Skeleton className="h-80 rounded-lg bg-white dark:bg-neutral-800 p-6" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-neutral-800 rounded-lg p-6">
                <Skeleton className="h-6 w-40 mb-4" />
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-8 w-24 rounded" />
                </div>
              </div>
              <div className="bg-white dark:bg-neutral-800 rounded-lg p-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </LocalLayout>
      </>
    );
  }

  // Si es superadmin o admin, mostrar dashboard normal
  return (
    <>
      <Head>
        <title>Dashboard - AGORA Local</title>
      </Head>
      <LocalLayout>
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-xl font-normal text-gray-900 dark:text-gray-100">Dashboard</h1>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedPeriod('today')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    selectedPeriod === 'today'
                      ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-normal'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-700'
                  }`}
                >
                  Hoy
                </button>
                <button
                  onClick={() => setSelectedPeriod('week')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    selectedPeriod === 'week'
                      ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-normal'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-700'
                  }`}
                >
                  Semana
                </button>
                <button
                  onClick={() => setSelectedPeriod('month')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    selectedPeriod === 'month'
                      ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-normal'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-700'
                  }`}
                >
                  Mes
                </button>
                <button
                  onClick={() => setSelectedPeriod('year')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    selectedPeriod === 'year'
                      ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-normal'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-700'
                  }`}
                >
                  Año
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {hasBranch
                ? `Bienvenido a tu panel de control de AGORA Local.${selectedBusiness?.business_name ? ` Sucursal: ${selectedBusiness.business_name}.` : ''}`
                : 'Bienvenido a tu panel de control de AGORA Local.'}
            </p>
          </div>

          {!hasBranch && (
            <div className="mb-8 rounded-lg border border-gray-200 dark:border-neutral-600 bg-gray-50 dark:bg-neutral-800/50 p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                Selecciona una sucursal en el menú superior para ver las métricas.
              </p>
            </div>
          )}

          {statsError && hasBranch && (
            <div className="mb-6 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 p-4 text-red-700 dark:text-red-300 text-sm">
              {statsError}
            </div>
          )}

          {/* Métricas Principales - KPI Cards */}
          {hasBranch && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {loadingStats ? (
              [1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)
            ) : (
              <>
                <div className="bg-white dark:bg-neutral-800 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-normal text-gray-600 dark:text-gray-400">Ingresos Totales</p>
                    <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-2xl font-normal text-gray-900 dark:text-gray-100 mb-1">{formatCurrency(current?.totalRevenue ?? 0)}</h3>
                  {previous && (() => {
                    const pct = pctChange(current?.totalRevenue ?? 0, previous.totalRevenue);
                    return (
                      <div className="flex items-center gap-1">
                        {pct != null && (
                          <span className={`text-xs font-normal ${pct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {pct >= 0 ? '+' : ''}{pct}%
                          </span>
                        )}
                        <span className="text-xs font-normal text-gray-500 dark:text-gray-400">vs {periodLabel}</span>
                      </div>
                    );
                  })()}
                </div>
                <div className="bg-white dark:bg-neutral-800 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-normal text-gray-600 dark:text-gray-400">Órdenes Totales</p>
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-2xl font-normal text-gray-900 dark:text-gray-100 mb-1">{(current?.orderCount ?? 0).toLocaleString('es-MX')}</h3>
                  {previous && (() => {
                    const pct = pctChange(current?.orderCount ?? 0, previous.orderCount);
                    return (
                      <div className="flex items-center gap-1">
                        {pct != null && (
                          <span className={`text-xs font-normal ${pct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {pct >= 0 ? '+' : ''}{pct}%
                          </span>
                        )}
                        <span className="text-xs font-normal text-gray-500 dark:text-gray-400">vs {periodLabel}</span>
                      </div>
                    );
                  })()}
                </div>
                <div className="bg-white dark:bg-neutral-800 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-normal text-gray-600 dark:text-gray-400">Ticket Promedio</p>
                    <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-2xl font-normal text-gray-900 dark:text-gray-100 mb-1">{formatCurrency(current?.averageTicket ?? 0)}</h3>
                  <span className="text-xs font-normal text-gray-500 dark:text-gray-400">por orden</span>
                </div>
                <div className="bg-white dark:bg-neutral-800 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-normal text-gray-600 dark:text-gray-400">Clientes únicos</p>
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                      <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-2xl font-normal text-gray-900 dark:text-gray-100 mb-1">{(current?.distinctClients ?? 0).toLocaleString('es-MX')}</h3>
                  <span className="text-xs font-normal text-gray-500 dark:text-gray-400">en el período</span>
                </div>
              </>
            )}
          </div>
          )}

          {/* Gráfica de Tendencia de Ventas */}
          {hasBranch && (
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-normal text-gray-900 dark:text-gray-100">Tendencia de Ventas</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Ingresos por día en el período</p>
              </div>
            </div>
            {loadingStats ? (
              <SkeletonChart />
            ) : !current?.revenueByDay?.length ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Sin datos en este período</p>
            ) : (
              <>
                <div className="h-64 flex items-end justify-between gap-1">
                  {current.revenueByDay.map((d, i) => {
                    const max = Math.max(...current.revenueByDay.map((x) => x.revenue), 1);
                    const height = max > 0 ? (d.revenue / max) * 100 : 0;
                    return (
                      <div
                        key={d.date || i}
                        className="flex-1 bg-indigo-500 dark:bg-indigo-600 rounded-t hover:bg-indigo-600 dark:hover:bg-indigo-500 transition-colors min-w-0"
                        style={{ height: `${Math.max(height, 2)}%` }}
                        title={`${d.date}: ${formatCurrency(d.revenue)}`}
                      />
                    );
                  })}
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{current.revenueByDay[0]?.date ?? ''}</span>
                  <span>{current.revenueByDay[current.revenueByDay.length - 1]?.date ?? ''}</span>
                </div>
              </>
            )}
          </div>
          )}

          {/* Métricas Secundarias y Productos */}
          {hasBranch && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white dark:bg-neutral-800 rounded-lg p-6">
              <h2 className="text-lg font-normal text-gray-900 dark:text-gray-100 mb-6">Estado de Pedidos</h2>
              {loadingStats ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-8 w-full rounded" />
                  ))}
                </div>
              ) : !current?.byStatus || Object.keys(current.byStatus).length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4">Sin pedidos en este período</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(current.byStatus)
                    .sort(([, a], [, b]) => b - a)
                    .map(([status, value]) => {
                      const total = current.orderCount || 1;
                      const percentage = Math.round((value / total) * 100);
                      const colors: Record<string, string> = {
                        pending: 'bg-yellow-500',
                        confirmed: 'bg-blue-500',
                        preparing: 'bg-purple-500',
                        in_transit: 'bg-indigo-500',
                        delivered: 'bg-green-500',
                        cancelled: 'bg-red-500',
                        refunded: 'bg-gray-500',
                      };
                      return (
                        <div key={status}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-normal text-gray-700 dark:text-gray-300">
                              {STATUS_LABELS[status] ?? status}
                            </span>
                            <span className="text-sm font-normal text-gray-900 dark:text-gray-100">{value}</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                            <div
                              className={`${colors[status] ?? 'bg-gray-500'} h-2 rounded-full transition-all`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-neutral-800 rounded-lg p-6">
              <h2 className="text-lg font-normal text-gray-900 dark:text-gray-100 mb-6">Productos Más Vendidos</h2>
              {loadingStats ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : !current?.topProducts?.length ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4">Sin datos en este período</p>
              ) : (
                <div className="space-y-4">
                  {current.topProducts.map((product, index) => (
                    <div key={`${product.itemName}-${index}`} className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-neutral-700 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-300 text-xs font-normal">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-normal text-gray-900 dark:text-gray-100">{product.itemName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{product.quantity} vendidos</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-normal text-gray-900 dark:text-gray-100">{formatCurrency(product.revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          )}

          {/* Métricas Adicionales */}
          {hasBranch && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white dark:bg-neutral-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-normal text-gray-900 dark:text-gray-100">Tasa de Conversión</h3>
                <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-normal text-gray-500 dark:text-gray-400 mb-2">N/D</div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Visitas convertidas en pedidos</p>
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-normal text-gray-900 dark:text-gray-100">Tiempo Promedio</h3>
                <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                  <svg className="w-5 h-5 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-normal text-gray-900 dark:text-gray-100 mb-2">
                  {current?.avgDeliveryHours != null && !Number.isNaN(current.avgDeliveryHours)
                    ? `${current.avgDeliveryHours.toFixed(1)}h`
                    : 'N/D'}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Tiempo promedio de entrega</p>
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-normal text-gray-900 dark:text-gray-100">Clientes</h3>
                <div className="p-2 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
                  <svg className="w-5 h-5 text-pink-600 dark:text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              {current?.newClients != null && current?.recurringClients != null && (current.newClients + current.recurringClients) > 0 ? (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-normal text-gray-600 dark:text-gray-400">Nuevos</span>
                      <span className="text-sm font-normal text-gray-900 dark:text-gray-100">
                        {current.newClients} ({Math.round((current.newClients / (current.newClients + current.recurringClients)) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${(current.newClients / (current.newClients + current.recurringClients)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-normal text-gray-600 dark:text-gray-400">Recurrentes</span>
                      <span className="text-sm font-normal text-gray-900 dark:text-gray-100">
                        {current.recurringClients} ({Math.round((current.recurringClients / (current.newClients + current.recurringClients)) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${(current.recurringClients / (current.newClients + current.recurringClients)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-2">
                  <div className="text-sm text-gray-500 dark:text-gray-400">N/D</div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Sin datos en este período</p>
                </div>
              )}
            </div>
          </div>
          )}

          {/* Información del Grupo y Sucursales (mantener del original) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Grupo Empresarial */}
            <div className="bg-white dark:bg-neutral-800 rounded-lg p-6">
              <h2 className="text-lg font-normal text-gray-900 dark:text-gray-100 mb-4">Grupo Empresarial</h2>
              {loadingGroup ? (
                <div className="space-y-3">
                  <div><Skeleton className="h-3 w-24 mb-1" /><Skeleton className="h-4 w-40" /></div>
                  <div><Skeleton className="h-3 w-20 mb-1" /><Skeleton className="h-4 w-56" /></div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ) : businessGroup ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-normal text-gray-700 dark:text-gray-300">Nombre del Grupo</p>
                    <p className="text-base text-gray-900 dark:text-gray-100">{businessGroup.name}</p>
                  </div>
                  {businessGroup.legal_name && (
                    <div>
                      <p className="text-sm font-normal text-gray-700 dark:text-gray-300">Razón Social</p>
                      <p className="text-base text-gray-900 dark:text-gray-100">{businessGroup.legal_name}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-normal ${
                      businessGroup.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {businessGroup.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 dark:text-gray-400">
                  <p>No tienes un grupo empresarial configurado.</p>
                  <a 
                    href="/settings/store" 
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-normal mt-2 inline-block"
                  >
                    Crear grupo empresarial →
                  </a>
                </div>
              )}
            </div>

            {/* Sucursales */}
            <div className="bg-white dark:bg-neutral-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-normal text-gray-900 dark:text-gray-100">Sucursales</h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {loadingBranches ? 'Cargando...' : `${branches.length} sucursal${branches.length !== 1 ? 'es' : ''}`}
                </span>
              </div>
              {loadingBranches ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : branches.length > 0 ? (
                <div className="space-y-3">
                  {branches.slice(0, 3).map((branch) => (
                    <div 
                      key={branch.id} 
                      className="rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors bg-white dark:bg-neutral-700/50"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-base font-normal text-gray-900 dark:text-gray-100">{branch.name}</h3>
                          {branch.business_address && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">{branch.business_address}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-normal ${
                            branch.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {branch.is_active ? 'Activa' : 'Inactiva'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {branches.length > 3 && (
                    <a 
                      href="/settings/branches" 
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-normal inline-block"
                    >
                      Ver todas las sucursales →
                    </a>
                  )}
                </div>
              ) : (
                <div className="text-gray-500 dark:text-gray-400 text-center py-8">
                  <p>No tienes sucursales registradas.</p>
                  <a 
                    href="/settings/branches" 
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-normal mt-2 inline-block"
                  >
                    Agregar sucursal →
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </LocalLayout>
    </>
  );
}
