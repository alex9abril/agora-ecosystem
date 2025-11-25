import Head from 'next/head';
import { useRouter } from 'next/router';
import LocalLayout from '@/components/layout/LocalLayout';
import { useState, useEffect, useMemo } from 'react';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { ordersService, Order, OrderFilters } from '@/lib/orders';

export default function OrdersPage() {
  const router = useRouter();
  const { selectedBusiness } = useSelectedBusiness();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Estadísticas
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    preparing: 0,
    ready: 0,
    delivered: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    if (selectedBusiness?.business_id) {
      loadOrders();
    }
  }, [selectedBusiness?.business_id, statusFilter, paymentStatusFilter, searchTerm]);

  const loadOrders = async () => {
    if (!selectedBusiness?.business_id) return;

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
        preparing: ordersData.filter(o => o.status === 'preparing').length,
        ready: ordersData.filter(o => o.status === 'ready').length,
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
  };

  const handleOrderClick = (orderId: string) => {
    router.push(`/orders/${orderId}`);
  };

  const getStatusBadge = (status: Order['status']) => {
    const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
      pending: { label: 'Pendiente', color: 'text-yellow-700', bgColor: 'bg-yellow-50' },
      confirmed: { label: 'Confirmado', color: 'text-blue-700', bgColor: 'bg-blue-50' },
      preparing: { label: 'En preparación', color: 'text-purple-700', bgColor: 'bg-purple-50' },
      ready: { label: 'Listo', color: 'text-indigo-700', bgColor: 'bg-indigo-50' },
      assigned: { label: 'Asignado', color: 'text-cyan-700', bgColor: 'bg-cyan-50' },
      picked_up: { label: 'Recogido', color: 'text-teal-700', bgColor: 'bg-teal-50' },
      in_transit: { label: 'En camino', color: 'text-orange-700', bgColor: 'bg-orange-50' },
      delivered: { label: 'Entregado', color: 'text-green-700', bgColor: 'bg-green-50' },
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
          <title>Pedidos - LOCALIA Local</title>
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
        <title>Pedidos - LOCALIA Local</title>
      </Head>
      
      <div className="w-full h-full flex flex-col p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Pedidos</h1>
              <p className="text-sm text-gray-500 mt-1">
                Gestiona y rastrea todos los pedidos de tu negocio
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
                <p className="text-sm font-medium text-gray-600">En preparación</p>
                <p className="text-2xl font-semibold text-purple-600 mt-1">{stats.preparing}</p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
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
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Buscar pedidos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
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
                <option value="preparing">En preparación</option>
                <option value="ready">Listo</option>
                <option value="assigned">Asignado</option>
                <option value="picked_up">Recogido</option>
                <option value="in_transit">En camino</option>
                <option value="delivered">Entregado</option>
                <option value="cancelled">Cancelado</option>
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
                  {filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => handleOrderClick(order.id)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{order.id.slice(-8).toUpperCase()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(order.created_at)}
                      </td>
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
                  ))}
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

