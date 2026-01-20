import Head from 'next/head';
import { useRouter } from 'next/router';
import LocalLayout from '@/components/layout/LocalLayout';
import { useState, useEffect, useMemo, useCallback, FormEvent } from 'react';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { ordersService, Order, OrderFilters } from '@/lib/orders';
import { businessService } from '@/lib/business';

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
  
  // Estadísticas
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    in_transit: 0,
    delivered: 0,
    totalRevenue: 0,
  });

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
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color} ${config.bgColor}`}>
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
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color} ${config.bgColor}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    return date.toLocaleDateString('es-MX', options);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const filteredOrders = useMemo(() => {
    return orders;
  }, [orders]);

  if (loading && orders.length === 0) {
    return (
      <LocalLayout>
        <Head>
          <title>Pedidos - AGORA Local</title>
        </Head>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando pedidos...</p>
          </div>
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
              <h1 className="text-2xl font-semibold text-gray-900">
                Pedidos
                {!selectedBusiness?.business_id && isAdmin && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    (Todas las sucursales)
                  </span>
                )}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {!selectedBusiness?.business_id && isAdmin
                  ? 'Gestiona y rastrea todos los pedidos de todas las sucursales'
                  : 'Gestiona y rastrea todos los pedidos de tu negocio'}
              </p>
            </div>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de pedidos</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pendientes</p>
                <p className="text-2xl font-semibold text-yellow-600 mt-1">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completados</p>
                <p className="text-2xl font-semibold text-green-600 mt-1">{stats.completed}</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">En tránsito</p>
                <p className="text-2xl font-semibold text-orange-600 mt-1">{stats.in_transit}</p>
              </div>
              <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ingresos totales</p>
                <p className="text-2xl font-semibold text-green-600 mt-1">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros y búsqueda */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Búsqueda */}
            <div className="flex-1">
              <form className="flex gap-2" onSubmit={handleSearchSubmit}>
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-gray-400 focus:border-gray-400 text-sm"
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

            {/* Filtros */}
            <div className="flex items-center gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full md:w-auto px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              >
                <option value="all">Todos los estados</option>
                <option value="pending">Pendiente</option>
                <option value="confirmed">Confirmado</option>
                <option value="completed">Completado</option>
                <option value="in_transit">En tránsito</option>
                <option value="delivered">Entregado</option>
                <option value="delivery_failed">Entrega fallida</option>
                <option value="returned">Devuelto</option>
                <option value="cancelled">Cancelado</option>
                <option value="refunded">Reembolsado</option>
              </select>

              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="block w-full md:w-auto px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              >
                <option value="all">Todos los pagos</option>
                <option value="pending">Pendiente</option>
                <option value="paid">Pagado</option>
                <option value="failed">Fallido</option>
                <option value="refunded">Reembolsado</option>
                <option value="overcharged">Overcharged</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabla de pedidos */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {error && (
            <div className="p-4 bg-red-50 border-b border-red-200">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay pedidos</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== 'all' || paymentStatusFilter !== 'all'
                  ? 'No se encontraron pedidos con los filtros seleccionados'
                  : 'Aún no has recibido ningún pedido'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Número
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    {(!selectedBusiness?.business_id && isAdmin) && (
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sucursal
                      </th>
                    )}
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pago
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado de cumplimiento
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Canal
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order) => {
                    // Obtener nombre de la sucursal si estamos mostrando todas las sucursales
                    const businessName = (!selectedBusiness?.business_id && isAdmin)
                      ? availableBusinesses.find(b => b.business_id === order.business_id)?.business_name || 'N/A'
                      : null;

                    return (
                      <tr
                        key={order.id}
                        onClick={() => handleOrderClick(order)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{order.id.slice(-8).toUpperCase()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(order.created_at)}
                        </td>
                        {(!selectedBusiness?.business_id && isAdmin) && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {businessName}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.client_first_name && order.client_last_name
                            ? `${order.client_first_name} ${order.client_last_name}`
                            : 'Cliente'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getPaymentStatusBadge(order.payment_status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(order.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(parseFloat(order.total_amount.toString()))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          Web
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer con contador */}
          {filteredOrders.length > 0 && (
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Mostrando <span className="font-medium">{filteredOrders.length}</span> de <span className="font-medium">{stats.total}</span> pedidos
              </p>
            </div>
          )}
        </div>
      </div>
    </LocalLayout>
  );
}

