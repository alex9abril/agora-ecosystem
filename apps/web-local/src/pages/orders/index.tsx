import Head from 'next/head';
import { useRouter } from 'next/router';
import LocalLayout from '@/components/layout/LocalLayout';
import { useState, useEffect, useMemo, useCallback, FormEvent } from 'react';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { ordersService, Order, OrderFilters } from '@/lib/orders';
import { businessService } from '@/lib/business';
import { Skeleton, SkeletonCard, SkeletonFilters, SkeletonTable } from '@/components/ui/Skeleton';
import TableFilters, { type FilterRow, type FilterColumn } from '@/components/TableFilters';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = 20;

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
  
  // Estadísticas
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    in_transit: 0,
    delivered: 0,
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

  useEffect(() => {
    // Esperar a que termine de cargar el contexto de business
    if (isLoadingBusiness) {
      return;
    }

    // Cargar órdenes (la función loadOrders maneja el caso de admin sin tienda seleccionada)
    loadOrders();
  }, [isLoadingBusiness, selectedBusiness?.business_id, loadOrders]);

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

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  // Resetear a página 1 cuando cambien los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, paymentStatusFilter, searchTerm]);

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {[1, 2, 3, 4, 5].map((i) => (
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

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total de pedidos</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 dark:bg-neutral-700 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pendientes</p>
                <p className="text-2xl font-semibold text-yellow-600 dark:text-yellow-400 mt-1">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completados</p>
                <p className="text-2xl font-semibold text-green-600 dark:text-green-400 mt-1">{stats.completed}</p>
              </div>
              <div className="w-12 h-12 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">En tránsito</p>
                <p className="text-2xl font-semibold text-orange-600 dark:text-orange-400 mt-1">{stats.in_transit}</p>
              </div>
              <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Ingresos totales</p>
                <p className="text-2xl font-semibold text-green-600 dark:text-green-400 mt-1">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <div className="w-12 h-12 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros y búsqueda */}
        <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Búsqueda */}
            <div className="flex-1">
              <form className="flex gap-2" onSubmit={handleSearchSubmit}>
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar pedidos..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearchSubmit();
                      }
                    }}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md leading-5 bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-neutral-500 focus:border-gray-400 dark:focus:border-neutral-500 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-normal bg-gray-900 text-white rounded border border-gray-900 hover:bg-gray-800 transition-colors"
                >
                  Buscar
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Tabla de pedidos */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 overflow-hidden flex-1 flex flex-col min-h-0">
            {/* Esquina superior izquierda: botón Filtros (flotante) */}
            <div className="flex items-center border-b border-gray-200 dark:border-neutral-700 px-4 py-2 flex-shrink-0 relative">
              <button
                type="button"
                onClick={() => setShowColumnFilters(!showColumnFilters)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-normal rounded-md border transition-colors ${
                  activeFilterCount > 0
                    ? 'bg-emerald-600 dark:bg-emerald-500 text-white border-emerald-600 dark:border-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600'
                    : showColumnFilters
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-black border-gray-900 dark:border-white'
                      : 'bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-neutral-600 hover:bg-gray-50 dark:hover:bg-neutral-700'
                }`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                {activeFilterCount > 0
                  ? `Filtrado por ${activeFilterCount} regla${activeFilterCount === 1 ? '' : 's'}`
                  : 'Filtros por columna'}
              </button>

              {/* Panel flotante de filtros */}
              {showColumnFilters && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    aria-hidden
                    onClick={() => setShowColumnFilters(false)}
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

            {filteredOrders.length === 0 ? (
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
                        <th scope="col" className="px-4 py-1.5 text-left text-xs font-normal text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Número
                        </th>
                        <th scope="col" className="px-4 py-1.5 text-left text-xs font-normal text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Fecha
                        </th>
                        {(!selectedBusiness?.business_id && isAdmin) && (
                          <th scope="col" className="px-4 py-1.5 text-left text-xs font-normal text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Sucursal
                          </th>
                        )}
                        <th scope="col" className="px-4 py-1.5 text-left text-xs font-normal text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Cliente
                        </th>
                        <th scope="col" className="px-4 py-1.5 text-left text-xs font-normal text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Pago
                        </th>
                        <th scope="col" className="px-4 py-1.5 text-left text-xs font-normal text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Estado de cumplimiento
                        </th>
                        <th scope="col" className="px-4 py-1.5 text-left text-xs font-normal text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Total
                        </th>
                        <th scope="col" className="px-4 py-1.5 text-left text-xs font-normal text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Canal
                        </th>
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
                        <td className="px-4 py-1.5 whitespace-nowrap text-xs font-normal text-gray-500 dark:text-gray-400">
                          {formatDate(order.created_at)}
                        </td>
                        {(!selectedBusiness?.business_id && isAdmin) && (
                          <td className="px-4 py-1.5 whitespace-nowrap text-xs font-normal text-gray-900 dark:text-gray-100">
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
                        <td className="px-4 py-1.5 whitespace-nowrap text-xs font-normal text-gray-500 dark:text-gray-400">
                          Web
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
                      {Math.min(currentPage * pageSize, filteredOrders.length)} de{' '}
                      {filteredOrders.length} pedidos
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

