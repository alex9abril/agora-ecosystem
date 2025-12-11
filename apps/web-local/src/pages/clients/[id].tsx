import Head from 'next/head';
import { useRouter } from 'next/router';
import LocalLayout from '@/components/layout/LocalLayout';
import { useState, useEffect, useMemo } from 'react';
import { clientsService, Client } from '@/lib/clients';
import { ordersService, Order } from '@/lib/orders';
import { walletService, Wallet, WalletTransaction } from '@/lib/wallet';
import Link from 'next/link';

export default function ClientDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const clientId = id as string;

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<Client | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'wallet'>('overview');

  useEffect(() => {
    if (clientId) {
      loadClient();
      loadOrders();
      loadWallet();
    }
  }, [clientId]);

  const loadClient = async () => {
    try {
      setLoading(true);
      setError(null);
      const clientData = await clientsService.getClient(clientId);
      setClient(clientData);
    } catch (err: any) {
      console.error('Error cargando cliente:', err);
      setError(err.message || 'Error al cargar el cliente');
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      setLoadingOrders(true);
      // Obtener pedidos del cliente desde todas las sucursales
      // Nota: El endpoint actual puede requerir businessId, pero para admin podemos obtener todos
      const allOrders: Order[] = [];
      
      // Por ahora, intentamos obtener pedidos directamente
      // Si el endpoint requiere businessId, necesitaremos ajustarlo
      try {
        // Intentar obtener pedidos del cliente
        // Esto puede requerir un endpoint específico o modificar el existente
        const ordersData = await ordersService.getOrders('', { search: clientId });
        setOrders(ordersData.filter(order => order.client_id === clientId));
      } catch (err) {
        console.warn('No se pudieron cargar pedidos del cliente:', err);
        setOrders([]);
      }
    } catch (err: any) {
      console.error('Error cargando pedidos:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const loadWallet = async () => {
    try {
      setLoadingWallet(true);
      // Obtener wallet del cliente
      // Nota: El endpoint actual obtiene el wallet del usuario autenticado
      // Necesitaremos un endpoint para obtener el wallet de otro usuario (admin)
      try {
        const walletData = await walletService.getBalance();
        // Verificar que el wallet pertenece al cliente
        if (walletData.user_id === clientId) {
          setWallet(walletData);
          
          // Cargar transacciones
          const transactionsResponse = await walletService.getTransactions({ page: 1, limit: 10 });
          setWalletTransactions(transactionsResponse.data);
        }
      } catch (err) {
        console.warn('No se pudo cargar el wallet del cliente:', err);
        // El wallet puede no existir aún o no tener permisos
      }
    } catch (err: any) {
      console.error('Error cargando wallet:', err);
    } finally {
      setLoadingWallet(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
      confirmed: { label: 'Confirmado', color: 'bg-blue-100 text-blue-800' },
      preparing: { label: 'Preparando', color: 'bg-purple-100 text-purple-800' },
      ready: { label: 'Listo', color: 'bg-indigo-100 text-indigo-800' },
      assigned: { label: 'Asignado', color: 'bg-cyan-100 text-cyan-800' },
      picked_up: { label: 'Recogido', color: 'bg-orange-100 text-orange-800' },
      in_transit: { label: 'En tránsito', color: 'bg-teal-100 text-teal-800' },
      delivered: { label: 'Entregado', color: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
      refunded: { label: 'Reembolsado', color: 'bg-gray-100 text-gray-800' },
    };

    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
      paid: { label: 'Pagado', color: 'bg-green-100 text-green-800' },
      failed: { label: 'Fallido', color: 'bg-red-100 text-red-800' },
      refunded: { label: 'Reembolsado', color: 'bg-gray-100 text-gray-800' },
      overcharged: { label: 'Sobrecargado', color: 'bg-purple-100 text-purple-800' },
    };

    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      credit: 'Acreditación',
      debit: 'Débito',
      refund: 'Reembolso',
      payment: 'Pago',
      adjustment: 'Ajuste',
    };
    return labels[type] || type;
  };

  const getTransactionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      credit: 'text-green-600 bg-green-50',
      debit: 'text-red-600 bg-red-50',
      refund: 'text-blue-600 bg-blue-50',
      payment: 'text-purple-600 bg-purple-50',
      adjustment: 'text-gray-600 bg-gray-50',
    };
    return colors[type] || 'text-gray-600 bg-gray-50';
  };

  if (loading) {
    return (
      <LocalLayout>
        <Head>
          <title>Cargando cliente - AGORA</title>
        </Head>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </LocalLayout>
    );
  }

  if (error || !client) {
    return (
      <LocalLayout>
        <Head>
          <title>Error - AGORA</title>
        </Head>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
            <p className="text-gray-600 mb-4">{error || 'Cliente no encontrado'}</p>
            <Link href="/clients" className="text-indigo-600 hover:text-indigo-800">
              Volver a clientes
            </Link>
          </div>
        </div>
      </LocalLayout>
    );
  }

  return (
    <LocalLayout>
      <Head>
        <title>{client.first_name} {client.last_name} - AGORA</title>
      </Head>

      <div className="w-full px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/clients" className="text-sm text-gray-500 hover:text-gray-700 mb-6 inline-block">
            ← Volver a clientes
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {client.profile_image_url ? (
                <img
                  src={client.profile_image_url}
                  alt={`${client.first_name} ${client.last_name}`}
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-2xl font-semibold text-white">
                    {client.first_name[0]}{client.last_name[0]}
                  </span>
                </div>
              )}
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  {client.first_name} {client.last_name}
                </h1>
                <p className="text-sm text-gray-500 mt-1">{client.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {client.is_active ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Activo
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Inactivo
                </span>
              )}
              {client.is_blocked && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Bloqueado
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Resumen
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'orders'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pedidos ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab('wallet')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'wallet'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Monedero
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Pedidos</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{client.total_orders}</p>
                  </div>
                  <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center">
                    <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Gastado</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(client.total_spent)}</p>
                  </div>
                  <div className="h-12 w-12 bg-green-50 rounded-lg flex items-center justify-center">
                    <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Pedidos Completados</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{client.completed_orders}</p>
                  </div>
                  <div className="h-12 w-12 bg-purple-50 rounded-lg flex items-center justify-center">
                    <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Calificación Promedio</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {client.avg_rating_given > 0 ? client.avg_rating_given.toFixed(1) : 'N/A'}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                    <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Información del cliente */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
              <h2 className="text-base font-semibold text-gray-900 mb-6">Información del Cliente</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Email</p>
                  <p className="text-sm text-gray-900">{client.email}</p>
                </div>
                {client.last_sign_in_at && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Último acceso</p>
                    <p className="text-sm text-gray-900">{formatDate(client.last_sign_in_at)}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Fecha de registro</p>
                  <p className="text-sm text-gray-900">{formatDate(client.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Pedidos cancelados</p>
                  <p className="text-sm text-gray-900">{client.cancelled_orders}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Reseñas dadas</p>
                  <p className="text-sm text-gray-900">{client.total_reviews_given}</p>
                </div>
              </div>
            </div>

            {/* Últimos pedidos */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">Últimos Pedidos</h2>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Ver todos
                </button>
              </div>
              {loadingOrders ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : orders.length > 0 ? (
                <div className="space-y-4">
                  {orders.slice(0, 5).map((order) => (
                    <Link
                      key={order.id}
                      href={`/orders/${order.id}`}
                      className="block border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Pedido #{order.id.slice(-8).toUpperCase()}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{formatDate(order.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">{formatCurrency(order.total_amount)}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {getStatusBadge(order.status)}
                              {getPaymentStatusBadge(order.payment_status)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">No hay pedidos registrados</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Historial de Pedidos</h2>
            </div>
            {loadingOrders ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : orders.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="block p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <p className="text-sm font-medium text-gray-900">
                            Pedido #{order.id.slice(-8).toUpperCase()}
                          </p>
                          {getStatusBadge(order.status)}
                          {getPaymentStatusBadge(order.payment_status)}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">{formatDate(order.created_at)}</p>
                        {order.delivery_address_text && (
                          <p className="text-xs text-gray-500 mt-1">{order.delivery_address_text}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(order.total_amount)}</p>
                        {order.item_count && (
                          <p className="text-xs text-gray-500 mt-1">{order.item_count} items</p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-sm text-gray-500">No hay pedidos registrados</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'wallet' && (
          <div className="space-y-6">
            {/* Saldo del wallet */}
            {loadingWallet ? (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              </div>
            ) : wallet ? (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Saldo del Monedero</h2>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Saldo disponible</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(wallet.balance)}</p>
                  </div>
                  <div className={`h-16 w-16 rounded-full flex items-center justify-center ${
                    wallet.is_blocked ? 'bg-red-100' : wallet.is_active ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <svg className="h-8 w-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                    </svg>
                  </div>
                </div>
                {wallet.is_blocked && (
                  <p className="text-sm text-red-600 mt-4">⚠️ El monedero está bloqueado</p>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-500 text-center py-4">
                  El cliente aún no tiene un monedero electrónico
                </p>
              </div>
            )}

            {/* Transacciones */}
            {wallet && (
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Historial de Transacciones</h2>
                </div>
                {walletTransactions.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {walletTransactions.map((transaction) => (
                      <div key={transaction.id} className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getTransactionTypeColor(transaction.transaction_type)}`}>
                                {getTransactionTypeLabel(transaction.transaction_type)}
                              </span>
                              {transaction.status === 'completed' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  Completada
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                  {transaction.status}
                                </span>
                              )}
                            </div>
                            {transaction.reason && (
                              <p className="text-sm text-gray-600 mt-2">{transaction.reason}</p>
                            )}
                            {transaction.description && (
                              <p className="text-xs text-gray-500 mt-1">{transaction.description}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-2">{formatDate(transaction.created_at)}</p>
                            {transaction.order_id && (
                              <Link
                                href={`/orders/${transaction.order_id}`}
                                className="text-xs text-indigo-600 hover:text-indigo-800 mt-2 inline-block"
                              >
                                Ver pedido relacionado →
                              </Link>
                            )}
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-semibold ${
                              transaction.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {transaction.transaction_type === 'credit' ? '+' : '-'}
                              {formatCurrency(transaction.amount)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Saldo: {formatCurrency(transaction.balance_after)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-sm text-gray-500">No hay transacciones registradas</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </LocalLayout>
  );
}

