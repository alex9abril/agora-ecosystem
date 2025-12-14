/**
 * Página de detalle de pedido
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import StoreLayout from '@/components/layout/StoreLayout';
import AccountSidebar from '@/components/AccountSidebar';
import TaxBreakdownComponent from '@/components/TaxBreakdown';
import { ordersService, Order } from '@/lib/orders';
import { productsService, Product } from '@/lib/products';
import ContextualLink from '@/components/ContextualLink';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PaymentIcon from '@mui/icons-material/Payment';
import { formatPrice } from '@/lib/format';

export default function OrderDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Record<string, Product>>({});

  useEffect(() => {
    if (id && typeof id === 'string') {
      loadOrder(id);
    }
  }, [id]);

  const loadOrder = async (orderId: string) => {
    try {
      setLoading(true);
      setError(null);
      const orderData = await ordersService.findOne(orderId);
      setOrder(orderData);

      // Cargar información de productos para obtener imágenes y SKUs
      if (orderData.items && orderData.items.length > 0) {
        const productIds = orderData.items
          .map(item => item.product_id)
          .filter((id): id is string => id !== undefined && id !== null);
        
        if (productIds.length > 0) {
          try {
            const productsMap: Record<string, Product> = {};
            // Cargar productos uno por uno
            await Promise.all(
              productIds.map(async (productId) => {
                try {
                  const product = await productsService.getProduct(productId);
                  productsMap[productId] = product;
                } catch (err) {
                  console.error(`Error cargando producto ${productId}:`, err);
                }
              })
            );
            setProducts(productsMap);
          } catch (err) {
            console.error('Error cargando productos:', err);
            // No fallar la carga de la orden si hay error cargando productos
          }
        }
      }
    } catch (err: any) {
      console.error('Error cargando pedido:', err);
      setError(err.message || 'Error al cargar el pedido');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'confirmed':
        return 'text-blue-600 bg-blue-50';
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'in_transit':
        return 'text-orange-600 bg-orange-50';
      case 'delivered':
        return 'text-green-600 bg-green-50';
      case 'delivery_failed':
        return 'text-red-600 bg-red-50';
      case 'returned':
        return 'text-purple-600 bg-purple-50';
      case 'cancelled':
        return 'text-red-600 bg-red-50';
      case 'refunded':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
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


  if (loading) {
    return (
      <StoreLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Cargando pedido...</p>
        </div>
      </StoreLayout>
    );
  }

  if (error || !order) {
    return (
      <>
        <Head>
          <title>Error - Agora</title>
        </Head>
        <StoreLayout>
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error || 'Pedido no encontrado'}</p>
            <ContextualLink href="/" className="text-black hover:text-gray-700">
              Volver al inicio
            </ContextualLink>
          </div>
        </StoreLayout>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Pedido #{order.id.slice(-8).toUpperCase()} - Agora</title>
      </Head>
      <StoreLayout>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex gap-6">
            {/* Sidebar de navegación */}
            <AccountSidebar activeTab="orders" />

          {/* Contenido principal */}
          <div className="flex-1 min-w-0" style={{ minHeight: '600px' }}>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Pedido #{order.id.slice(-8).toUpperCase()}
            </h1>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                {getStatusLabel(order.status)}
              </span>
              <span className="text-sm text-gray-500">
                Creado el {new Date(order.created_at).toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          {/* Información del negocio */}
          {order.business_name && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-lg font-semibold mb-3">Negocio</h2>
              <div className="flex items-center gap-3">
                {order.business_logo_url && (
                  <img
                    src={order.business_logo_url}
                    alt={order.business_name}
                    className="w-12 h-12 rounded object-cover"
                  />
                )}
                <span className="font-medium">{order.business_name}</span>
              </div>
            </div>
          )}

          {/* Items del pedido */}
          {order.items && order.items.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Productos</h2>
              <div className="space-y-4">
                {order.items.map((item) => {
                  const product = item.product_id ? products[item.product_id] : null;
                  const productImage = product?.primary_image_url || product?.image_url || item.product_image_url;
                  
                  return (
                    <div key={item.id} className="flex gap-4 items-start border-b border-gray-200 pb-4 last:border-b-0">
                    {/* Imagen del producto */}
                    <div className="flex-shrink-0">
                      {productImage ? (
                        <img
                          src={productImage}
                          alt={item.item_name}
                          className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                          onError={(e) => {
                            // Si falla la imagen, mostrar placeholder
                            e.currentTarget.style.display = 'none';
                            const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                            if (placeholder) placeholder.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      {!productImage && (
                        <div className="w-20 h-20 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                          <span className="text-xs text-gray-400 text-center px-2">Sin imagen</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Información del producto */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium mb-1">{item.item_name}</div>
                      <div className="text-sm text-gray-600">
                        Cantidad: {item.quantity} × {formatPrice(parseFloat(String(item.item_price || 0)))}
                      </div>
                      {item.variant_selection && Object.keys(item.variant_selection).length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          Variantes: {JSON.stringify(item.variant_selection)}
                        </div>
                      )}
                      {item.special_instructions && (
                        <div className="text-xs text-gray-500 mt-1">
                          Notas: {item.special_instructions}
                        </div>
                      )}
                      {item.tax_breakdown && (
                        <TaxBreakdownComponent taxBreakdown={item.tax_breakdown} compact />
                      )}
                    </div>
                    
                    {/* Precio */}
                    <div className="font-semibold flex-shrink-0">
                      {formatPrice(parseFloat(String(item.item_subtotal || 0)))}
                    </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dirección de entrega */}
          {order.delivery_address_text && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <LocalShippingIcon className="w-5 h-5" />
                Dirección de Entrega
              </h2>
              <p className="text-gray-600">{order.delivery_address_text}</p>
              {order.delivery_notes && (
                <p className="text-sm text-gray-500 mt-2">
                  Notas: {order.delivery_notes}
                </p>
              )}
            </div>
          )}

          {/* Folio de seguimiento (Guía de envío) */}
          {order.shipping_label && order.shipping_label.tracking_number && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border-l-4 border-blue-500">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <LocalShippingIcon className="w-5 h-5 text-blue-500" />
                Folio de Seguimiento
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Número de guía:</p>
                  <p className="text-lg font-mono font-semibold text-gray-900">
                    {order.shipping_label.tracking_number}
                  </p>
                </div>
                {order.shipping_label.carrier_name && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Transportista:</p>
                    <p className="text-gray-900">{order.shipping_label.carrier_name}</p>
                  </div>
                )}
                {order.shipping_label.status && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Estado:</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      order.shipping_label.status === 'delivered' 
                        ? 'bg-green-100 text-green-800'
                        : order.shipping_label.status === 'in_transit'
                        ? 'bg-blue-100 text-blue-800'
                        : order.shipping_label.status === 'picked_up'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {order.shipping_label.status === 'generated' && 'Generada'}
                      {order.shipping_label.status === 'picked_up' && 'Recolectada'}
                      {order.shipping_label.status === 'in_transit' && 'En tránsito'}
                      {order.shipping_label.status === 'delivered' && 'Entregada'}
                    </span>
                  </div>
                )}
                {order.shipping_label.generated_at && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Fecha de generación:</p>
                    <p className="text-gray-900">
                      {new Date(order.shipping_label.generated_at).toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Resumen de pago */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <PaymentIcon className="w-5 h-5" />
              Resumen de Pago
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatPrice(parseFloat(String(order.subtotal || 0)))}</span>
              </div>
              <div className="flex justify-between">
                <span>Impuestos</span>
                <span>{formatPrice(parseFloat(String(order.tax_amount || 0)))}</span>
              </div>
              <div className="flex justify-between">
                <span>Envío</span>
                <span>{formatPrice(parseFloat(String(order.delivery_fee || 0)))}</span>
              </div>
              {parseFloat(String(order.discount_amount || 0)) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Descuento</span>
                  <span>-{formatPrice(parseFloat(String(order.discount_amount || 0)))}</span>
                </div>
              )}
              {parseFloat(String(order.tip_amount || 0)) > 0 && (
                <div className="flex justify-between">
                  <span>Propina</span>
                  <span>{formatPrice(parseFloat(String(order.tip_amount || 0)))}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                <span>Total</span>
                <span>{formatPrice(parseFloat(String(order.total_amount || 0)))}</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              {/* Mostrar desglose de pagos si hay múltiples transacciones */}
              {order.payment_transactions && order.payment_transactions.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Método de pago: <span className="font-normal">Pago diferido en {order.payment_transactions.length} método{order.payment_transactions.length > 1 ? 's' : ''}</span>
                  </div>
                  {order.payment_transactions.map((transaction, index) => {
                    const getPaymentMethodLabel = (method: string) => {
                      const labels: Record<string, string> = {
                        wallet: 'Monedero electrónico',
                        karlopay: 'Tarjeta de crédito/débito',
                        card: 'Tarjeta de crédito/débito',
                        cash: 'Efectivo',
                        transfer: 'Transferencia bancaria',
                      };
                      return labels[method] || method;
                    };

                    const getStatusLabel = (status: string) => {
                      const labels: Record<string, string> = {
                        completed: 'Completado',
                        pending: 'Pendiente',
                        failed: 'Fallido',
                        cancelled: 'Cancelado',
                        refunded: 'Reembolsado',
                      };
                      return labels[status] || status;
                    };

                    const getStatusColor = (status: string) => {
                      switch (status) {
                        case 'completed':
                          return 'text-green-600';
                        case 'pending':
                          return 'text-yellow-600';
                        case 'failed':
                          return 'text-red-600';
                        case 'cancelled':
                          return 'text-gray-600';
                        case 'refunded':
                          return 'text-purple-600';
                        default:
                          return 'text-gray-600';
                      }
                    };

                    return (
                      <div key={transaction.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-sm font-medium text-gray-700">
                            {getPaymentMethodLabel(transaction.payment_method)}
                          </span>
                          <span className="text-sm font-bold text-gray-900">
                            {formatPrice(parseFloat(String(transaction.amount || 0)))}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-gray-500">
                            Estado: <span className={`font-medium ${getStatusColor(transaction.status)}`}>
                              {getStatusLabel(transaction.status)}
                            </span>
                          </span>
                          {transaction.last_four && (
                            <span className="text-xs text-gray-500">
                              Terminada en {transaction.last_four}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-200 mt-2">
                    <span className="font-semibold text-gray-700">Total pagado:</span>
                    <span className="font-bold text-gray-900">
                      {formatPrice(
                        order.payment_transactions!.reduce(
                          (sum, t) => sum + parseFloat(String(t.amount || 0)),
                          0
                        )
                      )}
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Método de pago:</span>
                    <span className="font-medium">{order.payment_method || 'No especificado'}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-600">Estado de pago:</span>
                    <span className={`font-medium ${
                      order.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {order.payment_status === 'paid' ? 'Pagado' : 'Pendiente'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Botón de regresar */}
          <div className="text-center">
            <ContextualLink
              href="/orders"
              className="px-6 py-3 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors inline-block font-medium"
            >
              Volver a Mis Pedidos
            </ContextualLink>
          </div>
            </div>
          </div>
        </div>
      </StoreLayout>
    </>
  );
}

