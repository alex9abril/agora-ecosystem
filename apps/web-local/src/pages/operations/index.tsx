/**
 * Panel de Operations Staff
 * Interfaz operativa independiente para gestión de órdenes
 */

import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect, useCallback } from 'react';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { useRouteGuard } from '@/lib/role-guards';
import { ordersService, Order, OrderFilters } from '@/lib/orders';
import OperationsLayout from '@/components/operations/OperationsLayout';
import OperationsDashboard from '@/components/operations/OperationsDashboard';
import OrdersKanban from '@/components/operations/OrdersKanban';

export default function OperationsPage() {
  useRouteGuard('canManageOrders');
  
  const router = useRouter();
  const { selectedBusiness } = useSelectedBusiness();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estadísticas en tiempo real
  const [stats, setStats] = useState({
    pending: 0,
    confirmed: 0,
    preparing: 0,
    ready: 0,
    in_transit: 0,
    totalRevenue: 0,
  });

  // Auto-refresh cada 5 segundos
  useEffect(() => {
    const businessId = selectedBusiness?.business_id;
    if (!businessId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    let intervalId: NodeJS.Timeout | null = null;

    const loadOrders = async () => {
      // No cargar si la ventana no está activa
      if (document.hidden) return;

      try {
        const filters: OrderFilters = {};
        if (statusFilter !== 'all') {
          filters.status = statusFilter;
        }

        const ordersData = await ordersService.getOrders(businessId, filters);
        
        if (!isMounted) return;
        
        setOrders(ordersData);
        setError(null);
        
        // Calcular estadísticas
        const newStats = {
          pending: ordersData.filter(o => o.status === 'pending').length,
          confirmed: ordersData.filter(o => o.status === 'confirmed').length,
          preparing: ordersData.filter(o => o.status === 'preparing').length,
          ready: ordersData.filter(o => o.status === 'ready').length,
          in_transit: ordersData.filter(o => o.status === 'in_transit' || o.status === 'picked_up').length,
          totalRevenue: ordersData
            .filter(o => o.status === 'delivered')
            .reduce((sum, o) => sum + parseFloat(String(o.total_amount || o.total || 0)), 0),
        };
        setStats(newStats);
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Error cargando órdenes:', err);
        setError(err.message || 'Error al cargar órdenes');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Cargar inmediatamente
    loadOrders();
    
    // Auto-refresh cada 5 segundos solo si la ventana está activa
    intervalId = setInterval(() => {
      if (!document.hidden) {
        loadOrders();
      }
    }, 5000);

    // Pausar cuando la ventana no está activa
    const handleVisibilityChange = () => {
      if (!document.hidden && intervalId) {
        loadOrders();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [selectedBusiness?.business_id, statusFilter]);

  const handleOrderClick = (orderId: string) => {
    router.push(`/operations/orders/${orderId}`);
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    if (!selectedBusiness?.business_id) return;

    try {
      await ordersService.updateOrderStatus(
        selectedBusiness.business_id,
        orderId,
        { status: newStatus }
      );
      
      // Recargar órdenes
      const filters: OrderFilters = {};
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      const updatedOrders = await ordersService.getOrders(
        selectedBusiness.business_id,
        filters
      );
      setOrders(updatedOrders);
    } catch (err: any) {
      console.error('Error actualizando estado:', err);
      alert(err.message || 'Error al actualizar estado');
    }
  };

  // Filtrar órdenes por término de búsqueda
  const filteredOrders = orders.filter(order => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      order.order_number?.toLowerCase().includes(term) ||
      order.client_first_name?.toLowerCase().includes(term) ||
      order.client_last_name?.toLowerCase().includes(term) ||
      order.client_email?.toLowerCase().includes(term)
    );
  });

  return (
    <>
      <Head>
        <title>Operaciones - Localia</title>
      </Head>
      <OperationsLayout>
        <div className="w-full h-full flex flex-col">
          {/* Dashboard con estadísticas */}
          <OperationsDashboard
            stats={stats}
            loading={loading}
          />

          {/* Filtros y búsqueda */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Búsqueda */}
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Buscar por número de orden, cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-sm"
                />
              </div>

              {/* Filtro de estado */}
              <div className="sm:w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-sm"
                >
                  <option value="all">Todos los estados</option>
                  <option value="pending">Pendientes</option>
                  <option value="confirmed">Confirmadas</option>
                  <option value="preparing">En preparación</option>
                  <option value="ready">Listas</option>
                  <option value="in_transit">En tránsito</option>
                  <option value="picked_up">Recogidas</option>
                  <option value="delivered">Entregadas</option>
                </select>
              </div>
            </div>
          </div>

          {/* Vista Kanban de órdenes */}
          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Cargando órdenes...</div>
              </div>
            ) : (
              <OrdersKanban
                orders={filteredOrders}
                onOrderClick={handleOrderClick}
                onStatusChange={handleStatusChange}
              />
            )}
          </div>
        </div>
      </OperationsLayout>
    </>
  );
}

