import Head from 'next/head';
import { useRouter } from 'next/router';
import LocalLayout from '@/components/layout/LocalLayout';
import { useState, useEffect, useMemo, useCallback, FormEvent, useRef, type ReactNode } from 'react';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { ordersService, Order, OrderFilters } from '@/lib/orders';
import { businessService } from '@/lib/business';
import { Skeleton, SkeletonCard, SkeletonFilters, SkeletonTable } from '@/components/ui/Skeleton';
import TableFilters, {
  createEmptyFilterRow,
  type FilterRow,
  type FilterColumn,
} from '@/components/TableFilters';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

/** Claves de canal conocidas → etiqueta en UI (ampliar cuando el backend exponga más). */
const ORDER_CHANNEL_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'web', label: 'Web' },
];

function getOrderChannelKey(order: Order): string {
  const k = order.sales_channel?.trim().toLowerCase();
  return k && k.length > 0 ? k : 'web';
}

function getOrderChannelLabel(order: Order): string {
  const key = getOrderChannelKey(order);
  const opt = ORDER_CHANNEL_FILTER_OPTIONS.find((o) => o.value === key);
  return opt?.label ?? key.charAt(0).toUpperCase() + key.slice(1);
}
const DEFAULT_PAGE_SIZE = 20;

const ORDERS_FILTERS_STORAGE_VERSION = 1;

function ordersFiltersStorageKey(scope: string) {
  return `agora-local:orders-filters:v${ORDERS_FILTERS_STORAGE_VERSION}:${scope}`;
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

function getFilterChipMeta(row: FilterRow, columns: FilterColumn[]) {
  const col = columns.find((c) => c.id === row.field);
  const columnLabel = col?.label ?? row.field;
  let valueLabel = String(row.value).trim();
  if (valueLabel.length > 32) {
    valueLabel = `${valueLabel.slice(0, 30)}…`;
  }
  if (col?.type === 'enum' && col.options?.length) {
    const opt = col.options.find((o) => o.value === row.value);
    if (opt) valueLabel = opt.label;
  }
  if (col?.id === 'total' && col.type === 'number') {
    const n = Number(row.value);
    if (!Number.isNaN(n)) {
      valueLabel = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
    }
  }
  const isEnum = col?.type === 'enum' && !!col.options?.length;
  return { columnLabel, valueLabel, col, isEnum };
}

type OrderSortColumnId =
  | 'number'
  | 'client'
  | 'payment_status'
  | 'status'
  | 'total'
  | 'delivery'
  | 'channel'
  | 'created_at';

type OrderTableSort = { key: null } | { key: OrderSortColumnId; dir: 'asc' | 'desc' };

function compareOrdersByColumn(a: Order, b: Order, key: OrderSortColumnId): number {
  switch (key) {
    case 'number': {
      const na = String(a.order_number ?? a.id.slice(-8)).toLowerCase();
      const nb = String(b.order_number ?? b.id.slice(-8)).toLowerCase();
      return na.localeCompare(nb, undefined, { numeric: true });
    }
    case 'client': {
      const na = [a.client_first_name, a.client_last_name].filter(Boolean).join(' ').trim().toLowerCase() || '\uffff';
      const nb = [b.client_first_name, b.client_last_name].filter(Boolean).join(' ').trim().toLowerCase() || '\uffff';
      return na.localeCompare(nb);
    }
    case 'payment_status':
      return String(a.payment_status).localeCompare(String(b.payment_status));
    case 'status':
      return String(a.status).localeCompare(String(b.status));
    case 'total': {
      const ta = parseFloat(String(a.total_amount ?? 0));
      const tb = parseFloat(String(b.total_amount ?? 0));
      if (ta === tb) return 0;
      return ta < tb ? -1 : 1;
    }
    case 'delivery': {
      const pa = a.delivery_address_text === 'Recoger en tienda' ? 0 : 1;
      const pb = b.delivery_address_text === 'Recoger en tienda' ? 0 : 1;
      return pa - pb;
    }
    case 'channel':
      return getOrderChannelKey(a).localeCompare(getOrderChannelKey(b));
    case 'created_at': {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      if (ta === tb) return 0;
      return ta < tb ? -1 : 1;
    }
    default:
      return 0;
  }
}

function OrderSortableTh({
  columnId,
  children,
  className = 'px-4 py-1.5 text-left text-xs font-normal text-gray-500 dark:text-gray-400 uppercase tracking-wider',
  tableSort,
  onSort,
}: {
  columnId: OrderSortColumnId;
  children: ReactNode;
  className?: string;
  tableSort: OrderTableSort;
  onSort: (id: OrderSortColumnId) => void;
}) {
  const dir =
    tableSort.key === columnId && tableSort.key !== null ? tableSort.dir : null;
  return (
    <th scope="col" className={className}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSort(columnId);
        }}
        className="inline-flex items-center gap-1 max-w-full text-left uppercase tracking-wider text-inherit hover:text-gray-800 dark:hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:focus-visible:ring-neutral-500 rounded px-0 py-0.5 -mx-0 -my-0.5"
        title="Ordenar: sin orden → ascendente → descendente"
      >
        <span className="font-inherit">{children}</span>
        <span className="inline-flex flex-col leading-none text-[10px] text-gray-400 dark:text-gray-500 shrink-0" aria-hidden>
          {dir === 'asc' ? (
            <span className="text-emerald-600 dark:text-emerald-400">▲</span>
          ) : dir === 'desc' ? (
            <span className="text-emerald-600 dark:text-emerald-400">▼</span>
          ) : (
            <span className="opacity-40 select-none">⇅</span>
          )}
        </span>
      </button>
    </th>
  );
}

export default function OrdersPage() {
  const router = useRouter();
  const { selectedBusiness, isLoading: isLoadingBusiness, availableBusinesses } = useSelectedBusiness();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  // Filtros por columna (acumulables)
  const [columnFilters, setColumnFilters] = useState<FilterRow[]>([]);
  const [showColumnFilters, setShowColumnFilters] = useState(false);
  const [openQuickFilterId, setOpenQuickFilterId] = useState<string | null>(null);
  /** Evita fetch con filtros por defecto antes de leer localStorage */
  const [filtersHydrated, setFiltersHydrated] = useState(false);
  const persistSkipOnce = useRef(false);
  const [tableSort, setTableSort] = useState<OrderTableSort>({ key: null });

  const handleOrderColumnSort = useCallback((columnId: OrderSortColumnId) => {
    setTableSort((prev) => {
      if (prev.key !== columnId) return { key: columnId, dir: 'asc' };
      if (prev.dir === 'asc') return { key: columnId, dir: 'desc' };
      return { key: null };
    });
  }, []);

  // Estadísticas
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    in_transit: 0,
    delivered: 0,
    readyToFulfill: 0,
    totalRevenue: 0,
  });

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Verificar si el usuario es admin o superadmin
  const isAdmin = availableBusinesses.some(b => b.role === 'admin' || b.role === 'superadmin');

  const loadOrders = useCallback(async () => {
    // Si es admin/superadmin y no hay tienda seleccionada, cargar de todas las sucursales
    if (!selectedBusiness?.business_id) {
      if (isAdmin && availableBusinesses.length > 0) {
        try {
          setLoading(true);
          setError(null);

          const filters: OrderFilters = {};
          if (statusFilter !== 'all') {
            filters.status = statusFilter;
          }
          if (paymentStatusFilter !== 'all') {
            filters.payment_status = paymentStatusFilter;
          }
          if (searchTerm) {
            filters.search = searchTerm;
          }

          // Obtener todas las sucursales de los grupos empresariales
          // Primero, obtener los grupos empresariales únicos de las sucursales asignadas
          const groupIdsSet = new Set<string>();
          
          // Obtener información completa de las sucursales asignadas para identificar sus grupos
          const businessesWithGroups = await Promise.all(
            availableBusinesses.map(async (business) => {
              try {
                const fullBusiness = await businessService.getMyBusiness(business.business_id);
                if (fullBusiness?.business_group_id) {
                  groupIdsSet.add(fullBusiness.business_group_id);
                }
                return { business, groupId: fullBusiness?.business_group_id };
              } catch (err) {
                console.error(`Error obteniendo información de ${business.business_name}:`, err);
                return { business, groupId: undefined };
              }
            })
          );

          // Obtener todas las sucursales de cada grupo único (una sola vez por grupo)
          const groupBranchesPromises = Array.from(groupIdsSet).map(async (groupId) => {
            try {
              const branchesResponse = await businessService.getBranches({
                groupId,
                isActive: true,
              });
              return branchesResponse.data || [];
            } catch (err) {
              console.error(`Error obteniendo sucursales del grupo ${groupId}:`, err);
              return [];
            }
          });

          const allGroupBranchesArrays = await Promise.all(groupBranchesPromises);
          const allGroupBranches = allGroupBranchesArrays.flat();
          
          // Combinar sucursales asignadas con sucursales del grupo (sin duplicados)
          const allBranchesMap = new Map<string, typeof availableBusinesses[0]>();
          
          // Agregar sucursales asignadas directamente
          availableBusinesses.forEach(business => {
            allBranchesMap.set(business.business_id, business);
          });
          
          // Agregar sucursales del grupo (convertir Business a BusinessSummary)
          allGroupBranches.forEach(branch => {
            if (!allBranchesMap.has(branch.id)) {
              // Crear un BusinessSummary a partir del Business
              // Si el usuario es admin/superadmin del grupo, puede acceder a todas las sucursales
              allBranchesMap.set(branch.id, {
                business_id: branch.id,
                business_name: branch.name,
                role: availableBusinesses.find(b => b.business_id === branch.id)?.role || 
                      (isAdmin ? 'admin' : 'operations_staff'), // Si es admin, dar acceso admin a las sucursales del grupo
                permissions: {},
                is_active: branch.is_active,
                can_access: branch.is_active,
                assigned_at: branch.created_at || new Date().toISOString(),
              });
            }
          });

          const allBranchesToLoad = Array.from(allBranchesMap.values());

          console.log(`📦 Cargando pedidos de ${allBranchesToLoad.length} sucursales (${availableBusinesses.length} asignadas + ${allGroupBranches.length} del grupo)`);

          // Obtener pedidos de todas las sucursales
          const allOrdersPromises = allBranchesToLoad.map(business =>
            ordersService.getOrders(business.business_id, filters).catch(err => {
              console.error(`Error cargando pedidos de ${business.business_name}:`, err);
              return []; // Retornar array vacío si hay error en alguna sucursal
            })
          );

          const allOrdersArrays = await Promise.all(allOrdersPromises);
          const allOrders = allOrdersArrays.flat();

          // Ordenar por fecha de creación (más recientes primero)
          allOrders.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );

          setOrders(allOrders);

          // Calcular estadísticas
          const newStats = {
            total: allOrders.length,
            pending: allOrders.filter(o => o.status === 'pending').length,
            completed: allOrders.filter(o => (o as any).status === 'completed').length,
            in_transit: allOrders.filter(o => o.status === 'in_transit').length,
            delivered: allOrders.filter(o => o.status === 'delivered').length,
            readyToFulfill: allOrders.filter(o => (o.payment_status === 'paid' || o.payment_status === 'overcharged') && o.status === 'confirmed').length,
            totalRevenue: allOrders
              .filter(o => o.payment_status === 'paid' || o.payment_status === 'overcharged')
              .reduce((sum, o) => sum + parseFloat(o.total_amount.toString()), 0),
          };
          setStats(newStats);
        } catch (err: any) {
          console.error('Error cargando pedidos:', err);
          setError('Error al cargar los pedidos');
        } finally {
          setLoading(false);
        }
        return;
      } else {
        // No es admin y no hay tienda seleccionada
        setLoading(false);
        setError('No hay una tienda seleccionada. Por favor, selecciona una tienda para ver los pedidos.');
        return;
      }
    }

    // Si hay tienda seleccionada, cargar normalmente
    try {
      setLoading(true);
      setError(null);

      const filters: OrderFilters = {};
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      if (paymentStatusFilter !== 'all') {
        filters.payment_status = paymentStatusFilter;
      }
      if (searchTerm) {
        filters.search = searchTerm;
      }

      const ordersData = await ordersService.getOrders(selectedBusiness.business_id, filters);
      setOrders(ordersData);

      // Calcular estadísticas
      const newStats = {
        total: ordersData.length,
        pending: ordersData.filter(o => o.status === 'pending').length,
        completed: ordersData.filter(o => (o as any).status === 'completed').length,
        in_transit: ordersData.filter(o => o.status === 'in_transit').length,
        delivered: ordersData.filter(o => o.status === 'delivered').length,
        readyToFulfill: ordersData.filter(o => (o.payment_status === 'paid' || o.payment_status === 'overcharged') && o.status === 'confirmed').length,
        totalRevenue: ordersData
          .filter(o => o.payment_status === 'paid' || o.payment_status === 'overcharged')
          .reduce((sum, o) => sum + parseFloat(o.total_amount.toString()), 0),
      };
      setStats(newStats);
    } catch (err: any) {
      console.error('Error cargando pedidos:', err);
      setError('Error al cargar los pedidos');
    } finally {
      setLoading(false);
    }
  }, [selectedBusiness?.business_id, isAdmin, availableBusinesses, statusFilter, paymentStatusFilter, searchTerm]);

  // Restaurar filtros desde localStorage (por sucursal o vista "todas las sucursales")
  useEffect(() => {
    if (isLoadingBusiness) {
      return;
    }
    const scope = selectedBusiness?.business_id ?? 'all-branches';
    if (typeof window === 'undefined') {
      setFiltersHydrated(true);
      return;
    }
    persistSkipOnce.current = true;
    try {
      const raw = localStorage.getItem(ordersFiltersStorageKey(scope));
      if (raw) {
        const d = JSON.parse(raw) as Record<string, unknown>;
        if (typeof d.statusFilter === 'string') setStatusFilter(d.statusFilter);
        if (typeof d.paymentStatusFilter === 'string') setPaymentStatusFilter(d.paymentStatusFilter);
        if (typeof d.searchTerm === 'string') setSearchTerm(d.searchTerm);
        if (typeof d.searchInput === 'string') setSearchInput(d.searchInput);
        if (Array.isArray(d.columnFilters)) {
          setColumnFilters(d.columnFilters.filter(isValidFilterRow));
        } else {
          setColumnFilters([]);
        }
      } else {
        setStatusFilter('all');
        setPaymentStatusFilter('all');
        setSearchTerm('');
        setSearchInput('');
        setColumnFilters([]);
      }
    } catch {
      // ignore JSON / storage errors
    } finally {
      setFiltersHydrated(true);
    }
  }, [isLoadingBusiness, selectedBusiness?.business_id]);

  // Persistir filtros cuando cambian (después de hidratar)
  useEffect(() => {
    if (!filtersHydrated || typeof window === 'undefined') return;
    if (persistSkipOnce.current) {
      persistSkipOnce.current = false;
      return;
    }
    const scope = selectedBusiness?.business_id ?? 'all-branches';
    try {
      localStorage.setItem(
        ordersFiltersStorageKey(scope),
        JSON.stringify({
          statusFilter,
          paymentStatusFilter,
          searchTerm,
          searchInput,
          columnFilters,
        }),
      );
    } catch {
      // quota / private mode
    }
  }, [
    filtersHydrated,
    selectedBusiness?.business_id,
    statusFilter,
    paymentStatusFilter,
    searchTerm,
    searchInput,
    columnFilters,
  ]);

  useEffect(() => {
    if (isLoadingBusiness || !filtersHydrated) {
      return;
    }
    loadOrders();
  }, [
    isLoadingBusiness,
    filtersHydrated,
    selectedBusiness?.business_id,
    loadOrders,
    statusFilter,
    paymentStatusFilter,
    searchTerm,
  ]);

  const handleOrderClick = (order: Order) => {
    // Si estamos mostrando todas las sucursales, necesitamos el business_id del pedido
    if (!selectedBusiness?.business_id && isAdmin) {
      // Guardar temporalmente el business_id del pedido para que el detalle pueda cargarlo
      sessionStorage.setItem('temp_order_business_id', order.business_id);
    }
    router.push(`/orders/${order.id}`);
  };

  const handleSearchSubmit = (e?: FormEvent<HTMLFormElement>) => {
    if (e) {
      e.preventDefault();
    }
    setSearchTerm(searchInput.trim());
  };

  const handleClearSearch = useCallback(() => {
    setLoading(true);
    setSearchInput('');
    setSearchTerm('');
  }, []);

  const hasAppliedSearch = searchTerm.trim().length > 0;

  type StatFilterKey = 'all' | 'pending' | 'readyToFulfill' | 'completed' | 'in_transit' | 'paid';
  const handleStatCardClick = (key: StatFilterKey) => {
    setCurrentPage(1);
    switch (key) {
      case 'all':
        setStatusFilter('all');
        setPaymentStatusFilter('all');
        break;
      case 'pending':
        setStatusFilter('pending');
        setPaymentStatusFilter('all');
        break;
      case 'readyToFulfill':
        setStatusFilter('confirmed');
        setPaymentStatusFilter('paid');
        break;
      case 'completed':
        setStatusFilter('completed');
        setPaymentStatusFilter('all');
        break;
      case 'in_transit':
        setStatusFilter('in_transit');
        setPaymentStatusFilter('all');
        break;
      case 'paid':
        setStatusFilter('all');
        setPaymentStatusFilter('paid');
        break;
      default:
        break;
    }
  };

  const isStatCardActive = (key: StatFilterKey): boolean => {
    switch (key) {
      case 'all':
        return statusFilter === 'all' && paymentStatusFilter === 'all';
      case 'pending':
        return statusFilter === 'pending' && paymentStatusFilter === 'all';
      case 'readyToFulfill':
        return statusFilter === 'confirmed' && paymentStatusFilter === 'paid';
      case 'completed':
        return statusFilter === 'completed' && paymentStatusFilter === 'all';
      case 'in_transit':
        return statusFilter === 'in_transit' && paymentStatusFilter === 'all';
      case 'paid':
        return statusFilter === 'all' && paymentStatusFilter === 'paid';
      default:
        return false;
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
      pending: { label: 'Pendiente', color: 'text-yellow-700', bgColor: 'bg-yellow-50' },
      confirmed: { label: 'Confirmado', color: 'text-blue-700', bgColor: 'bg-blue-50' },
      completed: { label: 'Completado', color: 'text-green-700', bgColor: 'bg-green-50' },
      in_transit: { label: 'En tránsito', color: 'text-orange-700', bgColor: 'bg-orange-50' },
      delivered: { label: 'Entregado', color: 'text-green-700', bgColor: 'bg-green-50' },
      delivery_failed: { label: 'Entrega fallida', color: 'text-red-700', bgColor: 'bg-red-50' },
      returned: { label: 'Devuelto', color: 'text-purple-700', bgColor: 'bg-purple-50' },
      cancelled: { label: 'Cancelado', color: 'text-red-700', bgColor: 'bg-red-50' },
      refunded: { label: 'Reembolsado', color: 'text-gray-700', bgColor: 'bg-gray-50' },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-normal ${config.color} ${config.bgColor}`}>
        {config.label}
      </span>
    );
  };

  const getPaymentStatusBadge = (paymentStatus: Order['payment_status']) => {
    const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
      pending: { label: 'Pendiente', color: 'text-yellow-700', bgColor: 'bg-yellow-50' },
      paid: { label: 'Totalmente Pagado', color: 'text-green-700', bgColor: 'bg-green-50' },
      failed: { label: 'Fallido', color: 'text-red-700', bgColor: 'bg-red-50' },
      refunded: { label: 'Reembolsado', color: 'text-gray-700', bgColor: 'bg-gray-50' },
      overcharged: { label: 'Overcharged', color: 'text-orange-700', bgColor: 'bg-orange-50' },
    };

    const config = statusConfig[paymentStatus] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-normal ${config.color} ${config.bgColor}`}>
        {config.label}
      </span>
    );
  };

  // Zona horaria y formato de hora configurados para la sucursal
  const displayTimezone = selectedBusiness?.timezone ?? 'America/Mexico_City';
  const use24h = selectedBusiness?.time_format !== '12h';

  // El backend devuelve fechas en UTC. Forzamos interpretación UTC: si no hay Z ni offset, añadimos Z.
  const parseOrderDate = (dateString: string): Date => {
    const s = String(dateString).trim();
    const hasZone = /Z$|[-+]\d{2}:?\d{2}$/.test(s);
    const withoutMs = s.replace(/\.\d+$/, '');
    const normalized = hasZone ? withoutMs : withoutMs + 'Z';
    return new Date(normalized);
  };

  // Formatea una fecha en la zona horaria configurada (date-only en formato YYYY-MM-DD para comparar días).
  const formatDatePartInTZ = (date: Date, timeZone: string): string => {
    return new Intl.DateTimeFormat('sv-SE', { timeZone }).format(date);
  };

  // Formatea solo la hora en la zona configurada (siempre con Intl para asegurar conversión UTC → TZ).
  const formatTimeInTZ = (date: Date, timeZone: string, hour12: boolean): string => {
    return new Intl.DateTimeFormat('es-MX', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12,
    }).format(date);
  };

  const formatDate = (dateString: string) => {
    const date = parseOrderDate(dateString);
    const now = new Date();
    const todayStr = formatDatePartInTZ(now, displayTimezone);
    const orderDayStr = formatDatePartInTZ(date, displayTimezone);

    const orderDayUtc = new Date(orderDayStr + 'T12:00:00Z').getTime();
    const todayUtc = new Date(todayStr + 'T12:00:00Z').getTime();
    const diffDays = Math.round((todayUtc - orderDayUtc) / 86400000);

    const optsTZ = { timeZone: displayTimezone };

    if (diffDays === 0) {
      return formatTimeInTZ(date, displayTimezone, !use24h);
    }
    if (diffDays === 1) return 'ayer';
    if (diffDays >= 2 && diffDays <= 5) return `hace ${diffDays} días`;

    const orderYear = parseInt(orderDayStr.slice(0, 4), 10);
    const currentYear = parseInt(todayStr.slice(0, 4), 10);
    if (orderYear === currentYear) {
      const s = date.toLocaleDateString('es-MX', { ...optsTZ, day: 'numeric', month: 'short' });
      return s.charAt(0).toUpperCase() + s.slice(1);
    }
    return date.toLocaleDateString('es-MX', { ...optsTZ, day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  // Columnas filtrables para la tabla de pedidos
  const orderFilterColumns: FilterColumn[] = useMemo(
    () => [
      { id: 'number', label: 'Número', type: 'text' },
      { id: 'client', label: 'Cliente', type: 'text' },
      {
        id: 'payment_status',
        label: 'Pago',
        type: 'enum',
        options: [
          { value: 'pending', label: 'Pendiente' },
          { value: 'paid', label: 'Totalmente Pagado' },
          { value: 'failed', label: 'Fallido' },
          { value: 'refunded', label: 'Reembolsado' },
          { value: 'overcharged', label: 'Overcharged' },
        ],
      },
      {
        id: 'status',
        label: 'Estado de cumplimiento',
        type: 'enum',
        options: [
          { value: 'pending', label: 'Pendiente' },
          { value: 'confirmed', label: 'Confirmado' },
          { value: 'preparing', label: 'En preparación' },
          { value: 'ready', label: 'Listo' },
          { value: 'in_transit', label: 'En tránsito' },
          { value: 'delivered', label: 'Entregado' },
          { value: 'cancelled', label: 'Cancelado' },
          { value: 'refunded', label: 'Reembolsado' },
        ],
      },
      // Valores internos pickup/shipping; alinear con la columna Entrega (Recoger en tienda vs resto)
      {
        id: 'delivery_type',
        label: 'Entrega',
        type: 'enum',
        options: [
          { value: 'pickup', label: 'Pickup' },
          { value: 'shipping', label: 'Envío' },
        ],
      },
      {
        id: 'channel',
        label: 'Canal',
        type: 'enum',
        options: ORDER_CHANNEL_FILTER_OPTIONS,
      },
      { id: 'total', label: 'Total', type: 'number' },
    ],
    []
  );

  const orderValueSuggestions = useMemo(() => {
    const clientSet = new Set<string>();
    const numberSet = new Set<string>();
    orders.forEach((o) => {
      const name = [o.client_first_name, o.client_last_name].filter(Boolean).join(' ').trim();
      if (name) clientSet.add(name);
      const num = o.order_number || o.id.slice(-8).toUpperCase();
      if (num) numberSet.add(num);
    });
    return {
      number: Array.from(numberSet).sort(),
      client: Array.from(clientSet).sort(),
    };
  }, [orders]);

  const orderMatchesColumnFilter = (order: Order, row: FilterRow): boolean => {
    if (!row.field || String(row.value).trim() === '') return true;
    const v = String(row.value).trim().toLowerCase();
    const raw = row.value;

    switch (row.field) {
      case 'number': {
        const num = (order.order_number || order.id.slice(-8).toUpperCase() || '').toLowerCase();
        if (row.operator === 'contains') return num.includes(v);
        if (row.operator === 'equals') return num === v;
        if (row.operator === 'starts_with') return num.startsWith(v);
        if (row.operator === 'not_contains') return !num.includes(v);
        if (row.operator === 'not_equals') return num !== v;
        return true;
      }
      case 'client': {
        const name = [order.client_first_name, order.client_last_name].filter(Boolean).join(' ').trim().toLowerCase();
        if (row.operator === 'contains') return name.includes(v);
        if (row.operator === 'equals') return name === v;
        if (row.operator === 'starts_with') return name.startsWith(v);
        if (row.operator === 'not_contains') return !name.includes(v);
        if (row.operator === 'not_equals') return name !== v;
        return true;
      }
      case 'payment_status':
        if (row.operator === '=') return (order.payment_status ?? '') === raw;
        if (row.operator === '!=') return (order.payment_status ?? '') !== raw;
        return true;
      case 'status':
        if (row.operator === '=') return (order.status ?? '') === raw;
        if (row.operator === '!=') return (order.status ?? '') !== raw;
        return true;
      case 'delivery_type': {
        const isPickup = (order.delivery_address_text ?? '') === 'Recoger en tienda';
        if (row.operator === '=') {
          if (raw === 'pickup') return isPickup;
          if (raw === 'shipping') return !isPickup;
          return true;
        }
        if (row.operator === '!=') {
          if (raw === 'pickup') return !isPickup;
          if (raw === 'shipping') return isPickup;
          return true;
        }
        return true;
      }
      case 'channel': {
        const key = getOrderChannelKey(order);
        const needle = String(raw).trim().toLowerCase();
        if (row.operator === '=') return key === needle;
        if (row.operator === '!=') return key !== needle;
        return true;
      }
      case 'total': {
        const num = Number(raw);
        if (Number.isNaN(num)) return true;
        const total = Number(order.total_amount ?? 0);
        if (row.operator === '=') return total === num;
        if (row.operator === '!=') return total !== num;
        if (row.operator === '<') return total < num;
        if (row.operator === '>') return total > num;
        if (row.operator === '<=') return total <= num;
        if (row.operator === '>=') return total >= num;
        return true;
      }
      default:
        return true;
    }
  };

  const activeFilterCount = useMemo(
    () => columnFilters.filter((f) => f.field && String(f.value).trim()).length,
    [columnFilters]
  );

  const filteredOrders = useMemo(() => {
    let list = orders;
    for (const row of columnFilters) {
      if (!row.field) continue;
      list = list.filter((order) => orderMatchesColumnFilter(order, row));
    }
    return list;
  }, [orders, columnFilters]);

  const sortedFilteredOrders = useMemo(() => {
    if (tableSort.key === null) return filteredOrders;
    const { key, dir } = tableSort;
    const dirMult = dir === 'asc' ? 1 : -1;
    return [...filteredOrders].sort((a, b) => {
      const r = compareOrdersByColumn(a, b, key);
      if (r !== 0) return dirMult * r;
      return a.id.localeCompare(b.id);
    });
  }, [filteredOrders, tableSort]);

  const totalPages = Math.max(1, Math.ceil(sortedFilteredOrders.length / pageSize));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedFilteredOrders.slice(start, start + pageSize);
  }, [sortedFilteredOrders, currentPage, pageSize]);

  // Resetear a página 1 cuando cambien los filtros (no incluir columnFilters: el texto se escribe carácter a carácter) u orden de columnas
  useEffect(() => {
    setCurrentPage(1);
  }, [
    statusFilter,
    paymentStatusFilter,
    searchTerm,
    tableSort.key,
    tableSort.key === null ? 'natural' : tableSort.dir,
  ]);

  if (loading && orders.length === 0) {
    return (
      <LocalLayout>
        <Head>
          <title>Pedidos - AGORA Local</title>
        </Head>
        <div className="w-full h-full flex flex-col p-6">
          <div className="mb-6">
            <Skeleton className="h-8 w-28 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <div className="mb-6">
            <SkeletonFilters />
          </div>
          <SkeletonTable rows={10} cols={7} />
        </div>
      </LocalLayout>
    );
  }

  return (
    <LocalLayout>
      <Head>
        <title>Pedidos - AGORA Local</title>
      </Head>
      
      <div className="w-full h-full flex flex-col p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                Pedidos
                {!selectedBusiness?.business_id && isAdmin && (
                  <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                    (Todas las sucursales)
                  </span>
                )}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {!selectedBusiness?.business_id && isAdmin
                  ? 'Gestiona y rastrea todos los pedidos de todas las sucursales'
                  : 'Gestiona y rastrea todos los pedidos de tu negocio'}
              </p>
            </div>
          </div>
        </div>

        {/* Estadísticas rápidas (clic filtra la tabla) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <button
            type="button"
            onClick={() => handleStatCardClick('all')}
            className={`text-left min-w-0 w-full bg-white dark:bg-neutral-800 rounded-lg border p-4 transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-neutral-500 ${
              isStatCardActive('all')
                ? 'border-gray-900 dark:border-neutral-100 ring-2 ring-gray-900 dark:ring-neutral-100'
                : 'border-gray-200 dark:border-neutral-700 hover:border-gray-300 dark:hover:border-neutral-600'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total de pedidos</p>
                <p className="text-2xl lg:text-lg xl:text-xl 2xl:text-2xl font-semibold min-w-0 max-w-full tabular-nums leading-tight break-words text-gray-900 dark:text-gray-100 mt-1">{stats.total}</p>
              </div>
              <div className="shrink-0 w-12 h-12 bg-gray-100 dark:bg-neutral-700 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleStatCardClick('pending')}
            className={`text-left min-w-0 w-full bg-white dark:bg-neutral-800 rounded-lg border p-4 transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-yellow-500 ${
              isStatCardActive('pending')
                ? 'border-yellow-600 dark:border-yellow-500 ring-2 ring-yellow-600 dark:ring-yellow-500'
                : 'border-gray-200 dark:border-neutral-700 hover:border-gray-300 dark:hover:border-neutral-600'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pendientes</p>
                <p className="text-2xl lg:text-lg xl:text-xl 2xl:text-2xl font-semibold min-w-0 max-w-full tabular-nums leading-tight break-words text-yellow-600 dark:text-yellow-400 mt-1">{stats.pending}</p>
              </div>
              <div className="shrink-0 w-12 h-12 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleStatCardClick('readyToFulfill')}
            className={`text-left min-w-0 w-full bg-white dark:bg-neutral-800 rounded-lg border p-4 transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isStatCardActive('readyToFulfill')
                ? 'border-blue-600 dark:border-blue-500 ring-2 ring-blue-600 dark:ring-blue-500'
                : 'border-gray-200 dark:border-neutral-700 hover:border-gray-300 dark:hover:border-neutral-600'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Listos para surtir</p>
                <p className="text-2xl lg:text-lg xl:text-xl 2xl:text-2xl font-semibold min-w-0 max-w-full tabular-nums leading-tight break-words text-blue-600 dark:text-blue-400 mt-1">{stats.readyToFulfill}</p>
              </div>
              <div className="shrink-0 w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleStatCardClick('completed')}
            className={`text-left min-w-0 w-full bg-white dark:bg-neutral-800 rounded-lg border p-4 transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
              isStatCardActive('completed')
                ? 'border-green-600 dark:border-green-500 ring-2 ring-green-600 dark:ring-green-500'
                : 'border-gray-200 dark:border-neutral-700 hover:border-gray-300 dark:hover:border-neutral-600'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completados</p>
                <p className="text-2xl lg:text-lg xl:text-xl 2xl:text-2xl font-semibold min-w-0 max-w-full tabular-nums leading-tight break-words text-green-600 dark:text-green-400 mt-1">{stats.completed}</p>
              </div>
              <div className="shrink-0 w-12 h-12 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleStatCardClick('in_transit')}
            className={`text-left min-w-0 w-full bg-white dark:bg-neutral-800 rounded-lg border p-4 transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
              isStatCardActive('in_transit')
                ? 'border-orange-600 dark:border-orange-500 ring-2 ring-orange-600 dark:ring-orange-500'
                : 'border-gray-200 dark:border-neutral-700 hover:border-gray-300 dark:hover:border-neutral-600'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">En tránsito</p>
                <p className="text-2xl lg:text-lg xl:text-xl 2xl:text-2xl font-semibold min-w-0 max-w-full tabular-nums leading-tight break-words text-orange-600 dark:text-orange-400 mt-1">{stats.in_transit}</p>
              </div>
              <div className="shrink-0 w-12 h-12 bg-orange-50 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleStatCardClick('paid')}
            className={`text-left min-w-0 w-full bg-white dark:bg-neutral-800 rounded-lg border p-4 transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
              isStatCardActive('paid')
                ? 'border-green-600 dark:border-green-500 ring-2 ring-green-600 dark:ring-green-500'
                : 'border-gray-200 dark:border-neutral-700 hover:border-gray-300 dark:hover:border-neutral-600'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Ingresos totales</p>
                <p className="text-2xl lg:text-lg xl:text-xl 2xl:text-2xl font-semibold min-w-0 max-w-full tabular-nums leading-tight break-words text-green-600 dark:text-green-400 mt-1">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <div className="shrink-0 w-12 h-12 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </button>
        </div>

        {/* Tabla de pedidos */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 overflow-hidden flex-1 flex flex-col min-h-0">
            {/* Esquina superior izquierda: botón Filtros (flotante) */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-200 dark:border-neutral-700 px-4 py-2 flex-shrink-0 relative flex-wrap">
              {openQuickFilterId ? (
                <div
                  className="fixed inset-0 z-40"
                  aria-hidden
                  onClick={() => setOpenQuickFilterId(null)}
                />
              ) : null}

              <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
              <button
                type="button"
                onClick={() => {
                  setOpenQuickFilterId(null);
                  setShowColumnFilters(!showColumnFilters);
                }}
                className={`inline-flex h-9 max-h-9 min-h-9 items-center gap-2 px-3 py-0 text-sm font-normal rounded-md border transition-colors shrink-0 self-center ${
                  activeFilterCount > 0
                    ? 'bg-emerald-600 dark:bg-emerald-500 text-white border-emerald-600 dark:border-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600'
                    : showColumnFilters
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-black border-gray-900 dark:border-white'
                      : 'bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-neutral-600 hover:bg-gray-50 dark:hover:bg-neutral-700'
                }`}
              >
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                {activeFilterCount > 0 ? 'Ajustar filtros' : 'Filtros por columna'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setOpenQuickFilterId(null);
                  setColumnFilters((prev) => [...prev, createEmptyFilterRow(orderFilterColumns, prev)]);
                  setShowColumnFilters(true);
                }}
                className="!hidden inline-flex h-9 max-h-9 min-h-9 items-center gap-1.5 px-3 py-0 text-sm font-normal rounded-md border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors shrink-0 self-center"
                title="Añade otro criterio; los filtros se combinan (todos deben cumplirse)"
              >
                <span className="text-base leading-none font-light" aria-hidden>
                  +
                </span>
                Añadir filtro
              </button>

              {columnFilters
                .filter((f) => f.field && String(f.value).trim() !== '')
                .map((row) => {
                  const meta = getFilterChipMeta(row, orderFilterColumns);
                  const menuOpen = openQuickFilterId === row.id;
                  return (
                    <div key={row.id} className="relative z-50 inline-flex self-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenQuickFilterId(menuOpen ? null : row.id);
                        }}
                        className="inline-flex h-9 max-h-9 min-h-9 items-center gap-1.5 pl-2 pr-1.5 py-0 rounded-md border border-gray-200 dark:border-neutral-600 bg-gradient-to-b from-white to-gray-50/90 dark:from-neutral-800 dark:to-neutral-800/90 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-600/60 hover:shadow-md transition-all text-left max-w-[200px] shrink-0 overflow-hidden"
                      >
                        <div className="flex flex-col items-start justify-center min-w-0 gap-0 min-h-0 leading-none">
                          <span className="text-[7px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 leading-none">
                            {meta.columnLabel}
                            {row.operator === '!=' ? (
                              <span className="ml-1 normal-case font-medium text-rose-600 dark:text-rose-400">
                                · excluir
                              </span>
                            ) : null}
                          </span>
                          <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 leading-tight truncate w-full">
                            {meta.valueLabel}
                          </span>
                        </div>
                        <svg
                          className={`h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {menuOpen ? (
                        <div className="absolute left-0 top-full mt-1.5 min-w-[220px] max-w-[90vw] rounded-xl border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 shadow-xl py-1 overflow-hidden">
                          {meta.isEnum && meta.col?.options ? (
                            <div className="max-h-64 overflow-y-auto py-0.5">
                              <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                Cambiar valor
                              </p>
                              {meta.col.options.map((opt) => {
                                const selected = row.value === opt.value;
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                      setColumnFilters((prev) =>
                                        prev.map((r) =>
                                          r.id === row.id ? { ...r, value: opt.value } : r,
                                        ),
                                      );
                                      setOpenQuickFilterId(null);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                                      selected
                                        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-100 font-medium'
                                        : 'text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-700/80'
                                    }`}
                                  >
                                    {opt.label}
                                    {selected ? (
                                      <span className="ml-2 text-emerald-600 dark:text-emerald-400">✓</span>
                                    ) : null}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setShowColumnFilters(true);
                                setOpenQuickFilterId(null);
                              }}
                              className="w-full text-left px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-700/80"
                            >
                              Editar en panel de filtros…
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setColumnFilters((prev) => prev.filter((r) => r.id !== row.id));
                              setOpenQuickFilterId(null);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 border-t border-gray-100 dark:border-neutral-700 hover:bg-red-50/80 dark:hover:bg-red-900/20"
                          >
                            Quitar este filtro
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <form
                onSubmit={handleSearchSubmit}
                className="flex items-center shrink-0 w-full sm:w-auto justify-end sm:ml-auto"
              >
                <div className="relative flex-1 min-w-0 sm:min-w-[200px] sm:max-w-xs">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    name="orders-search"
                    inputMode="search"
                    autoComplete="off"
                    placeholder="Buscar pedidos…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearchSubmit();
                      }
                    }}
                    className={`block w-full h-9 pl-9 py-0 border border-gray-300 dark:border-neutral-600 rounded-md leading-none bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-neutral-500 focus:border-gray-400 dark:focus:border-neutral-500 text-sm ${hasAppliedSearch ? 'pr-9' : 'pr-3'}`}
                    enterKeyHint="search"
                  />
                  {hasAppliedSearch ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleClearSearch();
                      }}
                      className="absolute inset-y-0 right-0 flex items-center justify-center w-9 rounded-r-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-400 dark:focus-visible:ring-neutral-500"
                      aria-label="Quitar búsqueda"
                      title="Quitar búsqueda"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  ) : null}
                </div>
              </form>

              {/* Panel flotante de filtros */}
              {showColumnFilters && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    aria-hidden
                    onClick={() => {
                      setShowColumnFilters(false);
                      setOpenQuickFilterId(null);
                    }}
                  />
                  <div className="absolute left-4 top-full mt-1 z-50 min-w-[320px] max-w-[90vw] rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 shadow-xl p-4">
                    <TableFilters
                      columns={orderFilterColumns}
                      filters={columnFilters}
                      onChange={setColumnFilters}
                      valueSuggestions={orderValueSuggestions}
                      applyOnChange={true}
                    />
                  </div>
                </>
              )}
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800 flex-shrink-0">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {loading && orders.length > 0 ? (
              <>
                <div
                  className="overflow-x-auto overflow-y-auto flex-1 min-h-0"
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                >
                  <SkeletonTable
                    rows={Math.min(Math.max(pageSize, 8), 12)}
                    cols={8}
                    className="rounded-none border-0 shadow-none bg-transparent dark:bg-transparent"
                  />
                </div>
                <div className="px-4 py-3 border-t border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-700/50 flex-shrink-0">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Cargando pedidos…</p>
                </div>
              </>
            ) : filteredOrders.length === 0 ? (
              <div className="p-12 text-center flex-1 flex items-center justify-center">
                <div>
                  <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No hay pedidos</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {searchTerm || statusFilter !== 'all' || paymentStatusFilter !== 'all' || columnFilters.some((f) => f.field && String(f.value).trim())
                      ? 'No se encontraron pedidos con los filtros seleccionados'
                      : 'Aún no has recibido ningún pedido'}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
                    <thead className="bg-gray-50 dark:bg-neutral-700/50 sticky top-0 z-10">
                      <tr>
                        <OrderSortableTh
                          columnId="number"
                          tableSort={tableSort}
                          onSort={handleOrderColumnSort}
                        >
                          Número
                        </OrderSortableTh>
                        {(!selectedBusiness?.business_id && isAdmin) && (
                          <th
                            scope="col"
                            className="hidden px-4 py-1.5 text-left text-xs font-normal text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                          >
                            Sucursal
                          </th>
                        )}
                        <OrderSortableTh
                          columnId="client"
                          tableSort={tableSort}
                          onSort={handleOrderColumnSort}
                        >
                          Cliente
                        </OrderSortableTh>
                        <OrderSortableTh
                          columnId="payment_status"
                          tableSort={tableSort}
                          onSort={handleOrderColumnSort}
                        >
                          Pago
                        </OrderSortableTh>
                        <OrderSortableTh
                          columnId="status"
                          tableSort={tableSort}
                          onSort={handleOrderColumnSort}
                        >
                          Estado de cumplimiento
                        </OrderSortableTh>
                        <OrderSortableTh
                          columnId="total"
                          tableSort={tableSort}
                          onSort={handleOrderColumnSort}
                        >
                          Total
                        </OrderSortableTh>
                        <OrderSortableTh
                          columnId="delivery"
                          tableSort={tableSort}
                          onSort={handleOrderColumnSort}
                        >
                          Entrega
                        </OrderSortableTh>
                        <OrderSortableTh
                          columnId="channel"
                          tableSort={tableSort}
                          onSort={handleOrderColumnSort}
                        >
                          Canal
                        </OrderSortableTh>
                        <OrderSortableTh
                          columnId="created_at"
                          tableSort={tableSort}
                          onSort={handleOrderColumnSort}
                          className="px-4 py-1.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                        >
                          Fecha
                        </OrderSortableTh>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-neutral-800 divide-y divide-gray-200 dark:divide-neutral-700">
                      {paginatedOrders.map((order) => {
                    // Obtener nombre de la sucursal si estamos mostrando todas las sucursales
                    const businessName = (!selectedBusiness?.business_id && isAdmin)
                      ? availableBusinesses.find(b => b.business_id === order.business_id)?.business_name || 'N/A'
                      : null;

                    return (
                      <tr
                        key={order.id}
                        onClick={() => handleOrderClick(order)}
                        className="hover:bg-gray-50 dark:hover:bg-neutral-700 cursor-pointer transition-colors font-normal"
                      >
                        <td className="px-4 py-1.5 whitespace-nowrap text-xs font-normal text-gray-900 dark:text-gray-100">
                          #{order.id.slice(-8).toUpperCase()}
                        </td>
                        {(!selectedBusiness?.business_id && isAdmin) && (
                          <td className="hidden px-4 py-1.5 whitespace-nowrap text-xs font-normal text-gray-900 dark:text-gray-100">
                            {businessName}
                          </td>
                        )}
                        <td className="px-4 py-1.5 whitespace-nowrap text-xs font-normal text-gray-900 dark:text-gray-100">
                          {order.client_first_name && order.client_last_name
                            ? `${order.client_first_name} ${order.client_last_name}`
                            : 'Cliente'}
                        </td>
                        <td className="px-4 py-1.5 whitespace-nowrap">
                          {getPaymentStatusBadge(order.payment_status)}
                        </td>
                        <td className="px-4 py-1.5 whitespace-nowrap">
                          {getStatusBadge(order.status)}
                        </td>
                        <td className="px-4 py-1.5 whitespace-nowrap text-xs font-normal text-gray-900 dark:text-gray-100">
                          {formatCurrency(parseFloat(order.total_amount.toString()))}
                        </td>
                        <td className="px-4 py-1.5 whitespace-nowrap">
                          {order.delivery_address_text === 'Recoger en tienda' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-normal text-amber-800 bg-amber-100 dark:text-amber-200 dark:bg-amber-900/40">
                              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                              </svg>
                              Pickup
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-normal text-sky-800 bg-sky-100 dark:text-sky-200 dark:bg-sky-900/40">
                              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                              </svg>
                              Envío
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-1.5 whitespace-nowrap text-xs font-normal text-gray-500 dark:text-gray-400">
                          {getOrderChannelLabel(order)}
                        </td>
                        <td className="px-4 py-1.5 whitespace-nowrap text-xs font-semibold text-gray-900 dark:text-gray-100">
                          {formatDate(order.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                    </tbody>
                  </table>
                </div>

                {/* Paginador */}
                <div className="px-4 py-3 border-t border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-700/50 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Mostrando {(currentPage - 1) * pageSize + 1} -{' '}
                      {Math.min(currentPage * pageSize, sortedFilteredOrders.length)} de{' '}
                      {sortedFilteredOrders.length} pedidos
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-500 dark:text-gray-400">Mostrar:</label>
                        <select
                          value={pageSize}
                          onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                          className="text-sm border border-gray-300 dark:border-neutral-600 rounded px-2 py-1 bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-neutral-500"
                        >
                          {PAGE_SIZE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                          className="px-2 py-1 text-sm border border-gray-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Primera página"
                        >
                          ««
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="px-2 py-1 text-sm border border-gray-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Página anterior"
                        >
                          «
                        </button>
                        <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                          Página {currentPage} de {totalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage >= totalPages}
                          className="px-2 py-1 text-sm border border-gray-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Página siguiente"
                        >
                          »
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage >= totalPages}
                          className="px-2 py-1 text-sm border border-gray-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Última página"
                        >
                          »»
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </LocalLayout>
  );
}

