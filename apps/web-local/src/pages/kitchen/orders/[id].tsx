/**
 * Detalle de orden para Kitchen Staff
 * Vista enfocada en preparación
 */

import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { useRouteGuard } from '@/lib/role-guards';
import { ordersService, Order } from '@/lib/orders';
import KitchenLayout from '@/components/kitchen/KitchenLayout';
import KitchenTimer from '@/components/kitchen/KitchenTimer';

export default function KitchenOrderDetailPage() {
  useRouteGuard('canPrepareOrders');
  
  const router = useRouter();
  const { id } = router.query;
  const { selectedBusiness } = useSelectedBusiness();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const orderId = typeof id === 'string' ? id : null;
    const businessId = selectedBusiness?.business_id;
    
    if (!orderId || !businessId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    let intervalId: NodeJS.Timeout | null = null;

    const loadOrder = async () => {
      // No cargar si la ventana no está activa
      if (document.hidden) return;

      try {
        setError(null);
        const orderData = await ordersService.getOrder(businessId, orderId);
        
        if (!isMounted) return;
        
        // Solo mostrar si está confirmed o preparing
        if (orderData.status !== 'confirmed' && orderData.status !== 'preparing') {
          setError('Esta orden no está disponible para cocina');
          setOrder(null);
          return;
        }
        
        setOrder(orderData);
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Error cargando orden:', err);
        setError(err.message || 'Error al cargar la orden');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Cargar inmediatamente
    loadOrder();
    
    // Auto-refresh cada 3 segundos solo si la ventana está activa
    intervalId = setInterval(() => {
      if (!document.hidden) {
        loadOrder();
      }
    }, 3000);

    // Pausar cuando la ventana no está activa
    const handleVisibilityChange = () => {
      if (!document.hidden && intervalId) {
        loadOrder();
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
  }, [id, selectedBusiness?.business_id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedBusiness?.business_id || !id || typeof id !== 'string') return;

    try {
      setUpdating(true);
      await ordersService.updateOrderStatus(
        selectedBusiness.business_id,
        id,
        { status: newStatus }
      );
      
      // Recargar orden
      const updatedOrder = await ordersService.getOrder(
        selectedBusiness.business_id,
        id
      );
      setOrder(updatedOrder);
    } catch (err: any) {
      console.error('Error actualizando estado:', err);
      alert(err.message || 'Error al actualizar estado');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <KitchenLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">Cargando orden...</div>
        </div>
      </KitchenLayout>
    );
  }

  if (error || !order) {
    return (
      <KitchenLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-red-600 text-center">
            <p className="text-lg font-semibold mb-2">{error || 'Orden no encontrada'}</p>
            <button
              onClick={() => router.push('/kitchen')}
              className="text-sm text-blue-600 hover:underline"
            >
              Volver a cocina
            </button>
          </div>
        </div>
      </KitchenLayout>
    );
  }

  const isPreparing = order.status === 'preparing';
  const isConfirmed = order.status === 'confirmed';

  return (
    <>
      <Head>
        <title>Orden #{order.order_number || order.id.slice(-8).toUpperCase()} - Cocina</title>
      </Head>
      <KitchenLayout>
        <div className="w-full h-full flex flex-col bg-gray-50">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/kitchen')}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  #{order.order_number || order.id.slice(-8).toUpperCase()}
                </h1>
                <p className="text-sm text-gray-600">
                  {new Date(order.created_at).toLocaleString('es-MX')}
                </p>
              </div>
              <KitchenTimer startTime={order.created_at} isActive={isPreparing} />
            </div>
          </div>

          {/* Contenido */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Items del pedido - Grande y legible */}
              <div className="bg-white rounded-lg border-2 border-gray-300 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Items del Pedido</h2>
                <div className="space-y-4">
                  {order.items?.map((item) => (
                    <div key={item.id} className="border-b border-gray-200 pb-4 last:border-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl font-bold text-gray-900">
                          {item.quantity}x
                        </span>
                        <span className="text-xl font-semibold text-gray-900 flex-1 ml-4">
                          {item.item_name}
                        </span>
                      </div>
                      {item.special_instructions && (
                        <div className="mt-2 p-3 bg-yellow-100 border border-yellow-300 rounded">
                          <div className="text-sm font-semibold text-yellow-800 mb-1">
                            ⚠️ Instrucción Especial:
                          </div>
                          <div className="text-sm text-yellow-700">
                            {item.special_instructions}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Acción principal - Botón grande */}
              <div className="bg-white rounded-lg border-2 border-gray-300 p-6">
                {isConfirmed && (
                  <button
                    onClick={() => handleStatusChange('preparing')}
                    disabled={updating}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-6 px-8 rounded-lg text-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updating ? 'Procesando...' : 'Iniciar Preparación'}
                  </button>
                )}
                {isPreparing && (
                  <button
                    onClick={() => handleStatusChange('ready')}
                    disabled={updating}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-6 px-8 rounded-lg text-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updating ? 'Procesando...' : 'Marcar como Listo'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </KitchenLayout>
    </>
  );
}

