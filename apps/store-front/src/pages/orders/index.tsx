/**
 * Página de lista de pedidos del usuario
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import StoreLayout from '@/components/layout/StoreLayout';
import AccountSidebar from '@/components/AccountSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { ordersService, Order } from '@/lib/orders';
import { formatPrice } from '@/lib/format';
import ContextualLink from '@/components/ContextualLink';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

export default function OrdersPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=' + encodeURIComponent(router.asPath));
      return;
    }
    if (isAuthenticated) {
      loadOrders();
    }
  }, [isAuthenticated, authLoading, router]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await ordersService.findAll();
      console.log('📦 Pedidos cargados:', data);
      console.log('📦 Primer pedido (ejemplo):', data[0]);
      console.log('📦 item_count del primer pedido:', data[0]?.item_count);
      console.log('📦 items del primer pedido:', data[0]?.items);
      setOrders(data);
    } catch (error) {
      console.error('Error cargando pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_transit':
        return 'bg-orange-100 text-orange-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'delivery_failed':
        return 'bg-red-100 text-red-800';
      case 'returned':
        return 'bg-purple-100 text-purple-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      confirmed: 'Confirmado',
      completed: 'Completado',
      in_transit: 'En tránsito',
      delivered: 'Entregado',
      delivery_failed: 'Entrega fallida',
      returned: 'Devuelto',
      cancelled: 'Cancelado',
      refunded: 'Reembolsado',
    };
    return labels[status.toLowerCase()] || status;
  };

  if (authLoading || loading) {
    return (
      <StoreLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Cargando...</p>
        </div>
      </StoreLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Mis Pedidos - Agora</title>
      </Head>
      <StoreLayout>
        <div className="flex gap-6">
          {/* Sidebar de navegación */}
          <AccountSidebar activeTab="orders" />

          {/* Contenido principal */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Mis Pedidos</h1>

            {orders.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <ReceiptIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg mb-2">No tienes pedidos aún</p>
                <p className="text-gray-400 text-sm mb-6">
                  Cuando realices tu primer pedido, aparecerá aquí
                </p>
                <ContextualLink
                  href="/"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors"
                >
                  Ir a comprar
                </ContextualLink>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Pedido #{order.id.slice(0, 8)}
                          </h3>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              order.status
                            )}`}
                          >
                            {getStatusLabel(order.status)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {new Date(order.created_at).toLocaleDateString('es-MX', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        {order.business_name && (
                          <p className="text-sm text-gray-600 mt-1">
                            {order.business_name}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-900">
                          {formatPrice(Number(order.total_amount))}
                        </p>
                        <p className="text-sm text-gray-500">
                          {(() => {
                            // Priorizar item_count del backend, luego items?.length, luego 0
                            const count = order.item_count !== undefined && order.item_count !== null 
                              ? order.item_count 
                              : (order.items?.length ?? 0);
                            return count;
                          })()} {(() => {
                            const count = order.item_count !== undefined && order.item_count !== null 
                              ? order.item_count 
                              : (order.items?.length ?? 0);
                            return count === 1 ? 'producto' : 'productos';
                          })()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="text-sm text-gray-600">
                        {order.delivery_address_text && (
                          <p className="truncate max-w-md">
                            📍 {order.delivery_address_text}
                          </p>
                        )}
                      </div>
                      <ContextualLink
                        href={`/orders/${order.id}`}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-toyota-red hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Ver detalles
                        <ArrowForwardIcon className="w-4 h-4" />
                      </ContextualLink>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </StoreLayout>
    </>
  );
}

