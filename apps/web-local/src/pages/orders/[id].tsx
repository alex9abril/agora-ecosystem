import Head from 'next/head';
import { useRouter } from 'next/router';
import LocalLayout from '@/components/layout/LocalLayout';
import { useState, useEffect } from 'react';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { ordersService, Order, OrderItem } from '@/lib/orders';

export default function OrderDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { selectedBusiness } = useSelectedBusiness();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (id && selectedBusiness?.business_id && router.isReady) {
      loadOrder();
    }
  }, [id, selectedBusiness?.business_id, router.isReady]);

  const loadOrder = async () => {
    if (!id || !selectedBusiness?.business_id) return;

    try {
      setLoading(true);
      setError(null);
      const orderData = await ordersService.getOrder(selectedBusiness.business_id, id as string);
      setOrder(orderData);
    } catch (err: any) {
      console.error('Error cargando pedido:', err);
      setError('Error al cargar el pedido');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!order || !selectedBusiness?.business_id) return;

    try {
      setUpdating(true);
      await ordersService.updateOrderStatus(selectedBusiness.business_id, order.id, {
        status: newStatus,
      });
      await loadOrder();
    } catch (err: any) {
      console.error('Error actualizando estado:', err);
      alert('Error al actualizar el estado del pedido');
    } finally {
      setUpdating(false);
    }
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

  const getStatusTimeline = () => {
    if (!order) return [];

    const timeline = [
      {
        status: 'pending',
        label: 'Pedido creado',
        date: order.created_at,
        completed: true,
      },
      {
        status: 'confirmed',
        label: 'Pedido confirmado',
        date: order.confirmed_at,
        completed: ['confirmed', 'preparing', 'ready', 'assigned', 'picked_up', 'in_transit', 'delivered'].includes(order.status),
      },
      {
        status: 'preparing',
        label: 'En preparación',
        date: null,
        completed: ['preparing', 'ready', 'assigned', 'picked_up', 'in_transit', 'delivered'].includes(order.status),
      },
      {
        status: 'ready',
        label: 'Listo para recoger',
        date: null,
        completed: ['ready', 'assigned', 'picked_up', 'in_transit', 'delivered'].includes(order.status),
      },
      {
        status: 'delivered',
        label: 'Entregado',
        date: order.delivered_at,
        completed: order.status === 'delivered',
      },
    ];

    return timeline;
  };

  const getNextActions = () => {
    if (!order) return [];

    const actions: Array<{ status: string; label: string; color: string }> = [];

    if (order.status === 'pending') {
      actions.push({ status: 'confirmed', label: 'Confirmar pedido', color: 'bg-blue-600 hover:bg-blue-700' });
      actions.push({ status: 'cancelled', label: 'Cancelar pedido', color: 'bg-red-600 hover:bg-red-700' });
    } else if (order.status === 'confirmed') {
      actions.push({ status: 'preparing', label: 'Comenzar preparación', color: 'bg-purple-600 hover:bg-purple-700' });
      actions.push({ status: 'cancelled', label: 'Cancelar pedido', color: 'bg-red-600 hover:bg-red-700' });
    } else if (order.status === 'preparing') {
      actions.push({ status: 'ready', label: 'Marcar como listo', color: 'bg-indigo-600 hover:bg-indigo-700' });
    }

    return actions;
  };

  if (loading) {
    return (
      <LocalLayout>
        <Head>
          <title>Detalle de pedido - LOCALIA Local</title>
        </Head>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando pedido...</p>
          </div>
        </div>
      </LocalLayout>
    );
  }

  if (error || !order) {
    return (
      <LocalLayout>
        <Head>
          <title>Error - LOCALIA Local</title>
        </Head>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-red-600">{error || 'Pedido no encontrado'}</p>
            <button
              onClick={() => router.push('/orders')}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Volver a pedidos
            </button>
          </div>
        </div>
      </LocalLayout>
    );
  }

  const timeline = getStatusTimeline();
  const nextActions = getNextActions();

  return (
    <LocalLayout>
      <Head>
        <title>Pedido #{order.id.slice(-8).toUpperCase()} - LOCALIA Local</title>
      </Head>

      <div className="w-full h-full flex flex-col p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/orders')}
            className="text-sm text-gray-600 hover:text-gray-900 mb-4 flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver a pedidos
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Pedido #{order.id.slice(-8).toUpperCase()}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Creado el {formatDate(order.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {nextActions.map((action) => (
                <button
                  key={action.status}
                  onClick={() => handleStatusUpdate(action.status)}
                  disabled={updating}
                  className={`px-4 py-2 text-white rounded-md text-sm font-medium ${action.color} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Timeline */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Estado del pedido</h2>
              <div className="space-y-4">
                {timeline.map((step, index) => (
                  <div key={step.status} className="flex items-start">
                    <div className="flex-shrink-0">
                      {step.completed ? (
                        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full border-2 border-gray-300 bg-white"></div>
                      )}
                    </div>
                    <div className="ml-4 flex-1">
                      <p className={`text-sm font-medium ${step.completed ? 'text-gray-900' : 'text-gray-400'}`}>
                        {step.label}
                      </p>
                      {step.date && (
                        <p className="text-xs text-gray-500 mt-1">{formatDate(step.date)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Items del pedido */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Items del pedido</h2>
              <div className="space-y-4">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex items-start justify-between py-4 border-b border-gray-200 last:border-0">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{item.item_name}</p>
                      {item.variant_selection && (
                        <p className="text-xs text-gray-500 mt-1">
                          Variantes: {JSON.stringify(item.variant_selection)}
                        </p>
                      )}
                      {item.special_instructions && (
                        <p className="text-xs text-gray-500 mt-1">
                          Notas: {item.special_instructions}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">Cantidad: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(parseFloat(item.item_subtotal.toString()))}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(parseFloat(item.item_price.toString()))} c/u
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Información del cliente */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Cliente</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Nombre</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {order.client_first_name && order.client_last_name
                      ? `${order.client_first_name} ${order.client_last_name}`
                      : 'Cliente'}
                  </p>
                </div>
                {order.client_phone && (
                  <div>
                    <p className="text-xs text-gray-500">Teléfono</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">{order.client_phone}</p>
                  </div>
                )}
                {order.client_email && (
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">{order.client_email}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Dirección de entrega */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Dirección de entrega</h2>
              <p className="text-sm text-gray-600">{order.delivery_address_text}</p>
              {order.delivery_notes && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500">Notas de entrega</p>
                  <p className="text-sm text-gray-600 mt-1">{order.delivery_notes}</p>
                </div>
              )}
            </div>

            {/* Resumen de pago */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumen de pago</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">{formatCurrency(parseFloat(order.subtotal.toString()))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">IVA</span>
                  <span className="text-gray-900">{formatCurrency(parseFloat(order.tax_amount.toString()))}</span>
                </div>
                {parseFloat(order.delivery_fee.toString()) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Envío</span>
                    <span className="text-gray-900">{formatCurrency(parseFloat(order.delivery_fee.toString()))}</span>
                  </div>
                )}
                {parseFloat(order.discount_amount.toString()) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Descuento</span>
                    <span className="text-green-600">-{formatCurrency(parseFloat(order.discount_amount.toString()))}</span>
                  </div>
                )}
                {parseFloat(order.tip_amount.toString()) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Propina</span>
                    <span className="text-gray-900">{formatCurrency(parseFloat(order.tip_amount.toString()))}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-gray-200 flex justify-between">
                  <span className="text-base font-semibold text-gray-900">Total</span>
                  <span className="text-base font-semibold text-gray-900">
                    {formatCurrency(parseFloat(order.total_amount.toString()))}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500">Método de pago</p>
                  <p className="text-sm font-medium text-gray-900 mt-1 capitalize">
                    {order.payment_method || 'No especificado'}
                  </p>
                </div>
                <div className="mt-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    order.payment_status === 'paid' || order.payment_status === 'overcharged'
                      ? 'text-green-700 bg-green-50'
                      : order.payment_status === 'failed'
                      ? 'text-red-700 bg-red-50'
                      : 'text-yellow-700 bg-yellow-50'
                  }`}>
                    {order.payment_status === 'paid' ? 'Pagado' :
                     order.payment_status === 'overcharged' ? 'Overcharged' :
                     order.payment_status === 'failed' ? 'Fallido' :
                     order.payment_status === 'refunded' ? 'Reembolsado' :
                     'Pendiente'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LocalLayout>
  );
}

