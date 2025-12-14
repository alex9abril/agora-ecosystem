/**
 * Página de detalle de pedido
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MobileLayout from '@/components/layout/MobileLayout';
import { useAuth } from '@/contexts/AuthContext';
import { ordersService, Order, TaxBreakdown } from '@/lib/orders';
import { productsService, Product } from '@/lib/products';
import TaxBreakdownComponent from '@/components/TaxBreakdown';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import LocationOnIcon from '@mui/icons-material/LocationOn';

export default function OrderDetailPage() {
  // Todos los hooks deben estar al principio, sin condiciones
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [productsData, setProductsData] = useState<Record<string, Product>>({});
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Función para cargar el pedido - definida antes de los useEffects
  const loadOrder = React.useCallback(async (orderId: string) => {
    try {
      setLoading(true);
      const orderData = await ordersService.findOne(orderId);
      
      // Parsear tax_breakdown si viene como string (JSONB de PostgreSQL)
      if (orderData.items) {
        orderData.items = orderData.items.map((item: any) => ({
          ...item,
          tax_breakdown: item.tax_breakdown 
            ? (typeof item.tax_breakdown === 'string' 
                ? JSON.parse(item.tax_breakdown) 
                : item.tax_breakdown)
            : null,
          variant_selection: item.variant_selection
            ? (typeof item.variant_selection === 'string'
                ? JSON.parse(item.variant_selection)
                : item.variant_selection)
            : null,
        }));
      }
      
      setOrder(orderData);
      
      // Cargar información de productos para obtener nombres de variantes
      if (orderData.items && orderData.items.length > 0) {
        const loadProducts = async () => {
          setLoadingProducts(true);
          try {
            const productIds = [...new Set(orderData.items.map((item: any) => item.product_id))];
            const productsMap: Record<string, Product> = {};
            
            await Promise.all(
              productIds.map(async (productId) => {
                try {
                  const product = await productsService.getProduct(productId);
                  productsMap[productId] = product;
                } catch (error) {
                  console.error(`Error cargando producto ${productId}:`, error);
                }
              })
            );
            
            setProductsData(productsMap);
          } catch (error) {
            console.error('Error cargando productos:', error);
          } finally {
            setLoadingProducts(false);
          }
        };
        
        loadProducts();
      }
    } catch (error: any) {
      console.error('Error cargando pedido:', error);
      setError(error.message || 'Error al cargar el pedido');
    } finally {
      setLoading(false);
    }
  }, []);

  // Verificar autenticación
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Cargar pedido solo cuando el router esté listo y tengamos el id
  useEffect(() => {
    // Esperar a que el router esté listo y tengamos el id
    if (!router.isReady || !id || typeof id !== 'string' || hasLoaded) {
      return;
    }

    // Solo cargar si estamos autenticados
    if (!authLoading && isAuthenticated) {
      loadOrder(id);
      setHasLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, id, isAuthenticated, authLoading, hasLoaded]);

  // Función helper para obtener el nombre de una variante
  const getVariantName = React.useCallback((productId: string, variantId: string): string | null => {
    const product = productsData[productId];
    if (!product || !product.variant_groups) return null;
    
    for (const group of product.variant_groups) {
      const variant = group.variants.find(v => v.variant_id === variantId);
      if (variant) {
        return variant.variant_name;
      }
    }
    return null;
  }, [productsData]);

  // Función helper para obtener el nombre de un grupo de variantes
  const getVariantGroupName = React.useCallback((productId: string, groupId: string): string | null => {
    const product = productsData[productId];
    if (!product || !product.variant_groups) return null;
    
    const group = product.variant_groups.find(g => g.variant_group_id === groupId);
    return group ? group.variant_group_name : null;
  }, [productsData]);

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'Pendiente',
      confirmed: 'Confirmado',
      preparing: 'Preparando',
      ready: 'Listo',
      in_transit: 'En camino',
      delivered: 'Entregado',
      cancelled: 'Cancelado',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-orange-100 text-orange-800',
      ready: 'bg-purple-100 text-purple-800',
      in_transit: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  // Mostrar loading mientras el router no esté listo o mientras cargamos
  if (!router.isReady || loading || authLoading) {
    return (
      <MobileLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Cargando pedido...</p>
        </div>
      </MobileLayout>
    );
  }

  if (error || !order) {
    return (
      <MobileLayout>
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">{error || 'Pedido no encontrado'}</p>
          <button
            onClick={() => router.push('/profile')}
            className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Ver Mis Pedidos
          </button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Pedido #{order.id.slice(-8).toUpperCase()} - Localia</title>
      </Head>
      <MobileLayout>
        <div className="mb-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowBackIcon className="w-5 h-5 text-gray-700" />
            </button>
            <h1 className="text-2xl font-bold text-black">Pedido #{order.id.slice(-8).toUpperCase()}</h1>
          </div>

          {/* Estado del pedido */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Estado</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                {getStatusLabel(order.status)}
              </span>
            </div>
            {order.status === 'pending' && (
              <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Tu pedido está siendo procesado. Te notificaremos cuando sea confirmado.
                </p>
              </div>
            )}
            {order.status === 'delivered' && (
              <div className="mt-3 flex items-center gap-2 text-green-600">
                <CheckCircleIcon className="w-5 h-5" />
                <p className="text-sm font-medium">Pedido entregado exitosamente</p>
              </div>
            )}
          </div>

          {/* Información del negocio */}
          {order.business_name && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
              <div className="flex items-center gap-3">
                {order.business_logo_url ? (
                  <img
                    src={order.business_logo_url}
                    alt={order.business_name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                    <RestaurantIcon className="text-gray-400" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-black">{order.business_name}</p>
                  <p className="text-xs text-gray-500">Negocio</p>
                </div>
              </div>
            </div>
          )}

          {/* Dirección de entrega */}
          {order.delivery_address_text && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
              <div className="flex items-start gap-3">
                <LocationOnIcon className="text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Dirección de entrega</p>
                  <p className="text-sm text-gray-900">{order.delivery_address_text}</p>
                </div>
              </div>
            </div>
          )}

          {/* Items del pedido */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
            <h2 className="text-lg font-bold text-black mb-4">Items del Pedido</h2>
            <div className="space-y-3">
              {order.items?.map((item) => (
                <div key={item.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="flex-1">
                    <p className="font-semibold text-black">{item.item_name}</p>
                    {item.variant_selection && Object.keys(item.variant_selection).length > 0 && (
                      <div className="text-xs text-gray-600 mt-2">
                        {Object.entries(item.variant_selection).map(([groupId, variantIds]) => {
                          const ids = Array.isArray(variantIds) ? variantIds : [variantIds];
                          const groupName = getVariantGroupName(item.product_id, groupId);
                          return (
                            <div key={groupId} className="mb-1">
                              {groupName && (
                                <span className="text-gray-500 font-medium mr-1">{groupName}:</span>
                              )}
                              {ids.map((id) => {
                                const variantName = getVariantName(item.product_id, id);
                                return (
                                  <span key={id} className="inline-block bg-gray-100 px-2 py-0.5 rounded mr-1 mb-1">
                                    {variantName || id}
                                  </span>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {item.special_instructions && (
                      <p className="text-xs text-gray-500 italic mt-1">
                        "{item.special_instructions}"
                      </p>
                    )}
                    <p className="text-sm text-gray-600 mt-1">
                      Cantidad: {item.quantity} × ${parseFloat(String(item.item_price || 0)).toFixed(2)}
                    </p>
                    {/* Impuestos del item */}
                    {item.tax_breakdown && 
                     typeof item.tax_breakdown === 'object' && 
                     item.tax_breakdown.total_tax > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <TaxBreakdownComponent
                          taxBreakdown={item.tax_breakdown}
                          showTotal={false}
                          compact={true}
                        />
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-black">
                      ${parseFloat(String(item.item_subtotal || 0)).toFixed(2)}
                    </p>
                    {item.tax_breakdown && 
                     typeof item.tax_breakdown === 'object' && 
                     item.tax_breakdown.total_tax > 0 && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        + ${item.tax_breakdown.total_tax.toFixed(2)} impuestos
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resumen de montos */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
            <h2 className="text-lg font-bold text-black mb-4">Resumen</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-black font-medium">${parseFloat(String(order.subtotal || 0)).toFixed(2)}</span>
              </div>
              {parseFloat(String(order.tax_amount || 0)) > 0 && (
                <div className="space-y-1 pl-2 border-l-2 border-gray-200">
                  {order.items?.map(item => {
                    if (!item.tax_breakdown || 
                        typeof item.tax_breakdown !== 'object' || 
                        !item.tax_breakdown.taxes) {
                      return null;
                    }
                    return item.tax_breakdown.taxes.map((tax: any) => (
                      <div key={`${item.id}-${tax.tax_type_id}`} className="flex justify-between text-xs">
                        <span className="text-gray-500">{tax.tax_name} ({(tax.rate * 100).toFixed(0)}%)</span>
                        <span className="text-gray-600">${tax.amount.toFixed(2)}</span>
                      </div>
                    ));
                  })}
                  <div className="flex justify-between text-sm pt-1 border-t border-gray-100 mt-1">
                    <span className="text-gray-600 font-medium">Total impuestos</span>
                    <span className="text-black font-medium">${parseFloat(String(order.tax_amount || 0)).toFixed(2)}</span>
                  </div>
                </div>
              )}
              {parseFloat(String(order.delivery_fee || 0)) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Costo de envío</span>
                  <span className="text-black font-medium">${parseFloat(String(order.delivery_fee || 0)).toFixed(2)}</span>
                </div>
              )}
              {parseFloat(String(order.tip_amount || 0)) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Propina</span>
                  <span className="text-black font-medium">${parseFloat(String(order.tip_amount || 0)).toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-black">Total</span>
                  <span className="text-2xl font-bold text-black">${parseFloat(String(order.total_amount || 0)).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Información de pago */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Método de pago</span>
              <span className="text-sm font-medium text-black">
                {order.payment_method === 'cash' ? 'Efectivo contra entrega' : order.payment_method}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-gray-600">Estado de pago</span>
              <span className={`text-sm font-medium ${
                order.payment_status === 'paid' ? 'text-green-600' :
                order.payment_status === 'pending' ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {order.payment_status === 'paid' ? 'Pagado' :
                 order.payment_status === 'pending' ? 'Pendiente' :
                 order.payment_status}
              </span>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="space-y-3">
            <button
              onClick={() => router.push('/profile')}
              className="w-full py-3 bg-gray-100 text-black rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Ver Mis Pedidos
            </button>
            {order.status === 'pending' && (
              <button
                onClick={() => {
                  if (confirm('¿Estás seguro de que quieres cancelar este pedido?')) {
                    // TODO: Implementar cancelación
                    alert('Cancelación próximamente');
                  }
                }}
                className="w-full py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
              >
                Cancelar Pedido
              </button>
            )}
          </div>
        </div>
      </MobileLayout>
    </>
  );
}

