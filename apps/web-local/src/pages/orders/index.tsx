import Head from 'next/head';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import LocalLayout from '@/components/layout/LocalLayout';
import TableFilters, { FilterColumn, FilterRow, createEmptyFilterRow } from '@/components/TableFilters';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { Order, OrderFilters, ordersService } from '@/lib/orders';
import { OrdersConsoleHeader } from '@/features/orders/console/OrdersConsoleHeader';
import { OrdersOpsBar } from '@/features/orders/console/OrdersOpsBar';
import { ORDER_TABS, OrderTabId, normalizeLegacyOrderTabId, orderMatchesTab } from '@/features/orders/console/orderPresentation';
import { isPickupOrder, isStaleActiveOrder } from '@/features/orders/console/orderOperational';
import { OrdersOperationalTabs } from '@/features/orders/console/OrdersOperationalTabs';
import { OrdersTable } from '@/features/orders/console/OrdersTable';
import {
  compareOrdersForSort,
  defaultSortDirForColumn,
  isValidOrdersTableSort,
  type OrdersTableSortDir,
  type OrdersTableSortKey,
} from '@/features/orders/console/ordersTableSort';

const DEFAULT_PAGE_SIZE = 50;
const ORDERS_CONSOLE_STORAGE_VERSION = 2;

function ordersConsoleStorageKey(scope: string) {
  return `agora-local:orders-console:v${ORDERS_CONSOLE_STORAGE_VERSION}:${scope}`;
}

function legacyOrdersConsoleStorageKey(scope: string) {
  return `agora-local:orders-console:v1:${scope}`;
}

function isValidFilterRow(x: unknown): x is FilterRow {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.field === 'string' &&
    typeof o.operator === 'string' &&
    typeof o.value === 'string'
  );
}

const filterColumns: FilterColumn[] = [
  {
    id: 'status',
    label: 'Estado',
    type: 'enum',
    options: [
      { value: 'pending', label: 'Pendiente' },
      { value: 'confirmed', label: 'Confirmado' },
      { value: 'preparing', label: 'Preparando' },
      { value: 'ready', label: 'Listo' },
      { value: 'in_transit', label: 'En transito' },
      { value: 'delivered', label: 'Entregado' },
      { value: 'completed', label: 'Completado' },
      { value: 'cancelled', label: 'Cancelado' },
    ],
  },
  {
    id: 'payment_status',
    label: 'Pago',
    type: 'enum',
    options: [
      { value: 'pending', label: 'Pendiente' },
      { value: 'paid', label: 'Pagado' },
      { value: 'failed', label: 'Fallido' },
      { value: 'refunded', label: 'Reembolsado' },
      { value: 'overcharged', label: 'Sobrepago' },
    ],
  },
  { id: 'customer', label: 'Cliente', type: 'text' },
  { id: 'tracking_number', label: 'Guia', type: 'text' },
  { id: 'total', label: 'Total', type: 'number' },
];

function orderMatchesColumnFilter(order: Order, row: FilterRow): boolean {
  const value = String(row.value || '').trim();
  if (!value) return true;

  if (row.field === 'status') {
    return row.operator === '!=' ? order.status !== value : order.status === value;
  }

  if (row.field === 'payment_status') {
    return row.operator === '!=' ? order.payment_status !== value : order.payment_status === value;
  }

  if (row.field === 'customer') {
    const name = [order.client_first_name, order.client_last_name, order.client_phone, order.client_email]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const v = value.toLowerCase();
    if (row.operator === 'equals') return name === v;
    if (row.operator === 'starts_with') return name.startsWith(v);
    if (row.operator === 'not_contains') return !name.includes(v);
    if (row.operator === 'not_equals') return name !== v;
    return name.includes(v);
  }

  if (row.field === 'tracking_number') {
    const n = (order.tracking_number || '').toLowerCase();
    const v = value.toLowerCase();
    if (row.operator === 'equals') return n === v;
    if (row.operator === 'starts_with') return n.startsWith(v);
    if (row.operator === 'not_contains') return !n.includes(v);
    if (row.operator === 'not_equals') return n !== v;
    return n.includes(v);
  }

  if (row.field === 'total') {
    const num = Number(value);
    if (Number.isNaN(num)) return true;
    const total = Number(order.total_amount || 0);
    switch (row.operator) {
      case '=':
        return total === num;
      case '!=':
        return total !== num;
      case '<':
        return total < num;
      case '>':
        return total > num;
      case '<=':
        return total <= num;
      case '>=':
        return total >= num;
      default:
        return true;
    }
  }

  return true;
}

function toStartDate(value: string): string | undefined {
  if (!value) return undefined;
  return `${value}T00:00:00.000Z`;
}

function toEndDate(value: string): string | undefined {
  if (!value) return undefined;
  return `${value}T23:59:59.999Z`;
}

export default function OrdersPage() {
  const router = useRouter();
  const { selectedBusiness, isLoading: isLoadingBusiness, availableBusinesses } = useSelectedBusiness();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [baseOrders, setBaseOrders] = useState<Order[]>([]);

  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState<OrderTabId>('all');
  const [columnFilters, setColumnFilters] = useState<FilterRow[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [currentPage, setCurrentPage] = useState(1);
  const [deliveryMode, setDeliveryMode] = useState<'all' | 'pickup' | 'delivery'>('all');
  const [onlyStale, setOnlyStale] = useState(false);
  const [tableSort, setTableSort] = useState<{
    key: OrdersTableSortKey;
    dir: OrdersTableSortDir;
  } | null>(null);
  const [filtersHydrated, setFiltersHydrated] = useState(false);
  const persistSkipOnce = useRef(true);
  /** Evita que el reset de pagina pise valores restaurados desde localStorage justo despues de hidratar. */
  const skipNextFilterChangePageReset = useRef(false);

  const isAdmin = useMemo(
    () => availableBusinesses.some((b) => b.role === 'admin' || b.role === 'superadmin'),
    [availableBusinesses],
  );

  const hasActiveFilters = useMemo(
    () => Boolean(searchTerm.trim()) || Boolean(startDate) || Boolean(endDate),
    [searchTerm, startDate, endDate],
  );

  const fetchOrders = useCallback(async () => {
    if (isLoadingBusiness || !filtersHydrated) return;
    setIsLoading(true);
    setError(null);

    const baseFilters: OrderFilters = {
      search: searchTerm || undefined,
      startDate: toStartDate(startDate),
      endDate: toEndDate(endDate),
    };

    try {
      if (!selectedBusiness?.business_id && isAdmin) {
        const all = await Promise.all(
          availableBusinesses.map((business) =>
            ordersService.getOrders(business.business_id, baseFilters).catch(() => [] as Order[]),
          ),
        );
        const merged = all.flat();
        merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setBaseOrders(merged);
      } else if (selectedBusiness?.business_id) {
        const list = await ordersService.getOrders(selectedBusiness.business_id, baseFilters);
        setBaseOrders(list);
      } else {
        setBaseOrders([]);
        if (!isAdmin) {
          setError('No hay una tienda seleccionada. Selecciona una sucursal para ver pedidos.');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'No se pudieron cargar los pedidos');
      setBaseOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    availableBusinesses,
    filtersHydrated,
    isAdmin,
    isLoadingBusiness,
    searchTerm,
    selectedBusiness?.business_id,
    startDate,
    endDate,
  ]);

  useLayoutEffect(() => {
    if (isLoadingBusiness) return;
    const scope = selectedBusiness?.business_id ?? 'all-branches';
    if (typeof window === 'undefined') {
      setFiltersHydrated(true);
      return;
    }
    persistSkipOnce.current = true;
    try {
      const tryParse = (raw: string | null): Record<string, unknown> | null => {
        if (!raw) return null;
        try {
          return JSON.parse(raw) as Record<string, unknown>;
        } catch {
          return null;
        }
      };
      const d =
        tryParse(localStorage.getItem(ordersConsoleStorageKey(scope))) ??
        tryParse(localStorage.getItem(legacyOrdersConsoleStorageKey(scope)));
      if (d) {
        if (typeof d.searchTerm === 'string') setSearchTerm(d.searchTerm);
        if (typeof d.searchInput === 'string') setSearchInput(d.searchInput);
        if (typeof d.startDate === 'string') setStartDate(d.startDate);
        if (typeof d.endDate === 'string') setEndDate(d.endDate);
        if (typeof d.activeTab === 'string') {
          const tab = normalizeLegacyOrderTabId(d.activeTab);
          if (tab) setActiveTab(tab);
        }
        if (Array.isArray(d.columnFilters)) setColumnFilters(d.columnFilters.filter(isValidFilterRow));
        if (typeof d.showAdvancedFilters === 'boolean') setShowAdvancedFilters(d.showAdvancedFilters);
        if (typeof d.showSummary === 'boolean') setShowSummary(d.showSummary);
        if (d.density === 'compact' || d.density === 'comfortable') setDensity(d.density);
        if (d.deliveryMode === 'all' || d.deliveryMode === 'pickup' || d.deliveryMode === 'delivery') {
          setDeliveryMode(d.deliveryMode);
        }
        if (typeof d.onlyStale === 'boolean') setOnlyStale(d.onlyStale);
        if (isValidOrdersTableSort(d.tableSort)) setTableSort(d.tableSort);
        const cp = d.currentPage;
        if (typeof cp === 'number' && Number.isFinite(cp) && cp >= 1) {
          setCurrentPage(Math.floor(cp));
        }
      }
    } catch {
      // ignore
    } finally {
      skipNextFilterChangePageReset.current = true;
      setFiltersHydrated(true);
    }
  }, [isLoadingBusiness, selectedBusiness?.business_id]);

  /** Prioridad sobre localStorage: enlaces desde Dashboard u otras vistas. */
  useEffect(() => {
    if (!router.isReady || !filtersHydrated) return;
    const q = router.query;
    if (typeof q.tab === 'string') {
      const tab = normalizeLegacyOrderTabId(q.tab);
      if (tab) setActiveTab(tab);
    }
    if (q.onlyStale === '1' || q.onlyStale === 'true') {
      setOnlyStale(true);
    }
    if (typeof q.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(q.startDate)) {
      setStartDate(q.startDate);
    }
    if (typeof q.endDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(q.endDate)) {
      setEndDate(q.endDate);
    }
  }, [router.isReady, router.asPath, filtersHydrated, router.query]);

  useEffect(() => {
    if (!filtersHydrated || typeof window === 'undefined') return;
    if (persistSkipOnce.current) {
      persistSkipOnce.current = false;
      return;
    }
    const scope = selectedBusiness?.business_id ?? 'all-branches';
    try {
      localStorage.setItem(
        ordersConsoleStorageKey(scope),
        JSON.stringify({
          searchTerm,
          searchInput,
          startDate,
          endDate,
          activeTab,
          columnFilters,
          showAdvancedFilters,
          showSummary,
          density,
          deliveryMode,
          onlyStale,
          currentPage,
          tableSort,
        }),
      );
    } catch {
      // quota / private mode
    }
  }, [
    filtersHydrated,
    selectedBusiness?.business_id,
    searchTerm,
    searchInput,
    startDate,
    endDate,
    activeTab,
    columnFilters,
    showAdvancedFilters,
    showSummary,
    density,
    deliveryMode,
    onlyStale,
    currentPage,
    tableSort,
  ]);

  const handleSortColumn = useCallback((key: OrdersTableSortKey) => {
    setTableSort((prev) => {
      if (prev?.key === key) {
        return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      }
      return { key, dir: defaultSortDirForColumn(key) };
    });
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  /** Evita doble fetch al montar por focus/visibility; luego sincroniza al volver a la pestaña o al foco (p. ej. tras ver un pedido). */
  const allowSyncRefetchRef = useRef(false);
  useEffect(() => {
    const id = window.setTimeout(() => {
      allowSyncRefetchRef.current = true;
    }, 600);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!filtersHydrated) return;
    let cancelled = false;
    let t: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (!allowSyncRefetchRef.current || document.visibilityState !== 'visible') return;
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        if (!cancelled) fetchOrders();
      }, 320);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') schedule();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', schedule);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', schedule);
    };
  }, [filtersHydrated, fetchOrders]);

  const tabCounts = useMemo(() => {
    return ORDER_TABS.reduce(
      (acc, tab) => {
        acc[tab.id] = baseOrders.filter((order) => orderMatchesTab(order, tab.id)).length;
        return acc;
      },
      {
        all: 0,
        pending_payment: 0,
        to_fulfill: 0,
        ready_for_shipping: 0,
        ready_for_pickup: 0,
        in_transit: 0,
        delivered: 0,
      } as Record<OrderTabId, number>,
    );
  }, [baseOrders]);

  const staleCount = useMemo(() => baseOrders.filter(isStaleActiveOrder).length, [baseOrders]);

  const filteredByTab = useMemo(
    () => baseOrders.filter((order) => orderMatchesTab(order, activeTab)),
    [activeTab, baseOrders],
  );

  const quickFilteredOrders = useMemo(() => {
    let list = filteredByTab;
    if (deliveryMode === 'pickup') list = list.filter(isPickupOrder);
    if (deliveryMode === 'delivery') list = list.filter((o) => !isPickupOrder(o));
    if (onlyStale) list = list.filter(isStaleActiveOrder);
    return list;
  }, [deliveryMode, filteredByTab, onlyStale]);

  const filteredOrders = useMemo(() => {
    let list = quickFilteredOrders;
    for (const row of columnFilters) {
      if (!row.field || !String(row.value).trim()) continue;
      list = list.filter((order) => orderMatchesColumnFilter(order, row));
    }
    return list;
  }, [columnFilters, quickFilteredOrders]);

  const sortedOrders = useMemo(() => {
    const list = [...filteredOrders];
    if (tableSort) {
      list.sort((a, b) => compareOrdersForSort(a, b, tableSort.key, tableSort.dir));
      return list;
    }
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return list;
  }, [activeTab, filteredOrders, tableSort]);

  const totalPages = Math.max(1, Math.ceil(sortedOrders.length / DEFAULT_PAGE_SIZE));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * DEFAULT_PAGE_SIZE;
    return sortedOrders.slice(start, start + DEFAULT_PAGE_SIZE);
  }, [currentPage, sortedOrders]);

  useEffect(() => {
    if (skipNextFilterChangePageReset.current) {
      skipNextFilterChangePageReset.current = false;
      return;
    }
    setCurrentPage(1);
  }, [columnFilters, deliveryMode, onlyStale, searchTerm, startDate, endDate]);

  useEffect(() => {
    if (!filtersHydrated) return;
    setCurrentPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [filtersHydrated, totalPages]);

  const totalRevenue = useMemo(() => {
    return baseOrders
      .filter((o) => o.payment_status === 'paid' || o.payment_status === 'overcharged')
      .reduce((acc, o) => acc + Number(o.total_amount || 0), 0);
  }, [baseOrders]);

  const timezone = selectedBusiness?.timezone || 'America/Mexico_City';
  const subtitle = !selectedBusiness?.business_id && isAdmin ? 'Todas las sucursales' : undefined;

  return (
    <LocalLayout>
      <Head>
        <title>Pedidos - AGORA Local</title>
      </Head>

      <div className="w-full h-full p-4 md:p-5 flex flex-col min-h-0">
        <OrdersConsoleHeader
          subtitle={subtitle}
          density={density}
          onToggleDensity={() => setDensity((prev) => (prev === 'compact' ? 'comfortable' : 'compact'))}
          showSummary={showSummary}
          onToggleSummary={() => setShowSummary((prev) => !prev)}
        />

        {showSummary ? (
          <div className="mb-3 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-3 text-sm text-gray-700 dark:text-gray-200">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
              <span>Pedidos en rango: <strong>{baseOrders.length}</strong></span>
              <span>Requieren pago: <strong>{tabCounts.pending_payment}</strong></span>
              <span>Por surtir: <strong>{tabCounts.to_fulfill}</strong></span>
              <span>Ingresos: <strong>{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(totalRevenue)}</strong></span>
            </div>
          </div>
        ) : null}

        <OrdersOpsBar
          searchInput={searchInput}
          onSearchInputChange={setSearchInput}
          onSubmitSearch={() => setSearchTerm(searchInput.trim())}
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          showAdvancedFilters={showAdvancedFilters}
          onToggleAdvancedFilters={() => setShowAdvancedFilters((prev) => !prev)}
          hasActiveFilters={hasActiveFilters}
          appliedSearchTerm={searchTerm}
          onClearFilters={() => {
            setSearchTerm('');
            setSearchInput('');
            setStartDate('');
            setEndDate('');
          }}
        />

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 w-full sm:w-auto">
            Entrega
          </span>
          <button
            type="button"
            onClick={() => setDeliveryMode('all')}
            className={`h-7 px-2.5 rounded-full text-xs border ${
              deliveryMode === 'all'
                ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-black'
                : 'border-gray-200 dark:border-neutral-600 text-gray-700 dark:text-gray-200'
            }`}
          >
            Todas
          </button>
          <button
            type="button"
            onClick={() => setDeliveryMode('pickup')}
            className={`h-7 px-2.5 rounded-full text-xs border ${
              deliveryMode === 'pickup'
                ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-black'
                : 'border-gray-200 dark:border-neutral-600 text-gray-700 dark:text-gray-200'
            }`}
          >
            Pickup
          </button>
          <button
            type="button"
            onClick={() => setDeliveryMode('delivery')}
            className={`h-7 px-2.5 rounded-full text-xs border ${
              deliveryMode === 'delivery'
                ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-black'
                : 'border-gray-200 dark:border-neutral-600 text-gray-700 dark:text-gray-200'
            }`}
          >
            Envío
          </button>
          <button
            type="button"
            onClick={() => {
              setOnlyStale((v) => !v);
            }}
            className={`h-7 px-2.5 rounded-full text-xs ${
              onlyStale
                ? 'bg-gray-900 dark:bg-white text-white dark:text-black'
                : 'bg-gray-100 text-gray-800 dark:bg-neutral-700 dark:text-gray-200'
            }`}
          >
            Atrasados (+48h): {staleCount}
          </button>
        </div>

        <OrdersOperationalTabs tabs={ORDER_TABS} activeTab={activeTab} counts={tabCounts} onChange={setActiveTab} />

        {showAdvancedFilters ? (
          <div className="mb-3 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-3">
            <TableFilters
              columns={filterColumns}
              filters={columnFilters}
              onChange={setColumnFilters}
              applyOnChange
              onApply={() => undefined}
            />
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setColumnFilters((prev) => [...prev, createEmptyFilterRow(filterColumns, prev)])}
                className="h-8 px-2.5 rounded-md border border-gray-300 dark:border-neutral-600 text-xs text-gray-700 dark:text-gray-200"
              >
                Anadir filtro
              </button>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-900/40 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {!filtersHydrated || isLoading ? (
          <div className="flex-1 min-h-0 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-5 text-sm text-gray-500 dark:text-gray-400">
            Cargando pedidos...
          </div>
        ) : (
          <>
            <OrdersTable
              orders={paginatedOrders}
              timezone={timezone}
              density={density}
              onOpen={(orderId) => router.push(`/orders/${orderId}`)}
              onPrepare={(orderId) => router.push(`/orders/${orderId}/prepare`)}
              sortKey={tableSort?.key ?? null}
              sortDir={tableSort?.dir ?? 'desc'}
              onSortColumn={handleSortColumn}
            />

            <div className="mt-3 flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
              <span>
                {sortedOrders.length} pedidos · pagina {currentPage} de {totalPages}
              </span>
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-2.5 rounded-md border border-gray-300 dark:border-neutral-600 disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 px-2.5 rounded-md border border-gray-300 dark:border-neutral-600 disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </LocalLayout>
  );
}
