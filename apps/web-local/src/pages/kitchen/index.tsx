/**
 * Panel de Kitchen Staff
 * Interfaz aislada enfocada en preparación de órdenes
 * Estructura de dos paneles: lista a la izquierda, detalle a la derecha
 */

import Head from 'next/head';
import { useState, useEffect, useRef } from 'react';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { useRouteGuard } from '@/lib/role-guards';
import { ordersService, Order } from '@/lib/orders';
import { productsService, Product, ProductVariant } from '@/lib/products';
import KitchenLayout from '@/components/kitchen/KitchenLayout';
import KitchenTimer from '@/components/kitchen/KitchenTimer';

export default function KitchenPage() {
  useRouteGuard('canPrepareOrders');
  
  const { selectedBusiness } = useSelectedBusiness();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  // Ref para mantener una referencia estable a la lista de órdenes
  // Esto nos permite acceder a la lista anterior durante las actualizaciones
  const ordersRef = useRef<Order[]>([]);
  const selectedOrderRef = useRef<Order | null>(null);
  
  // Sincronizar refs con estado
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);
  
  useEffect(() => {
    selectedOrderRef.current = selectedOrder;
  }, [selectedOrder]);

  // Auto-refresh cada 3 segundos (más frecuente que operations)
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
        // Solo cargar órdenes confirmadas y en preparación
        const allOrders = await ordersService.getOrders(businessId, {});
        
        if (!isMounted) return;
        
        // Filtrar solo confirmed y preparing
        const kitchenOrders = allOrders.filter(
          o => o.status === 'confirmed' || o.status === 'preparing'
        );
        
        // Ordenar por tiempo de creación (más antiguas primero)
        kitchenOrders.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        // Normalizar items de cada orden
        // IMPORTANTE: findAllByBusiness ahora SÍ incluye items (modificado en backend)
        const normalizedOrders = kitchenOrders.map(order => ({
          ...order,
          items: normalizeOrderItems(order.items || []),
        }));
        
        // Preservar items de órdenes existentes SOLO si la nueva versión no tiene items
        // (puede pasar si hay un error en el backend o si la orden fue eliminada)
        const prevOrders = ordersRef.current;
        const prevSelectedOrder = selectedOrderRef.current;
        
        // Construir la lista actualizada
        const updatedOrdersList = normalizedOrders.map(newOrder => {
          // Si la nueva versión tiene items, usarla (es la fuente de verdad)
          if (newOrder.items && newOrder.items.length > 0) {
            return newOrder;
          }
          
          // Si la nueva versión NO tiene items, intentar preservar los de la lista anterior
          const existingOrder = prevOrders.find(o => o.id === newOrder.id);
          if (existingOrder && existingOrder.items && existingOrder.items.length > 0) {
            return {
              ...newOrder,
              items: existingOrder.items,
            };
          }
          
          // Si ninguna tiene items, usar la nueva versión
          return newOrder;
        });
        
        // Actualizar la lista de órdenes
        setOrders(updatedOrdersList);
        setError(null);
        
        // Actualizar orden seleccionada
        if (prevSelectedOrder) {
          // Si hay una orden seleccionada, buscar su versión actualizada
          const updated = updatedOrdersList.find(o => o.id === prevSelectedOrder.id);
          
          if (updated) {
            // Si la nueva versión tiene items, usarla (es la fuente de verdad del backend)
            if (updated.items && updated.items.length > 0) {
              setSelectedOrder(updated);
            } else if (prevSelectedOrder.items && prevSelectedOrder.items.length > 0) {
              // Si la nueva versión NO tiene items pero la seleccionada sí, preservar los items
              setSelectedOrder({
                ...updated,
                items: prevSelectedOrder.items,
              });
            } else {
              // Ninguna tiene items, usar la versión actualizada
              setSelectedOrder(updated);
            }
          } else {
            // Si la orden seleccionada ya no está en la lista filtrada,
            // mantenerla seleccionada con todos sus datos (puede haber cambiado de estado)
            // NO hacer nada, mantener la selección actual
          }
        } else if (updatedOrdersList.length > 0) {
          // Si no hay orden seleccionada, seleccionar la primera
          const firstOrder = updatedOrdersList[0];
          setSelectedOrder(firstOrder);
        }
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
    
    // Auto-refresh cada 3 segundos solo si la ventana está activa
    intervalId = setInterval(() => {
      if (!document.hidden) {
        loadOrders();
      }
    }, 3000);

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
  }, [selectedBusiness?.business_id]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    if (!selectedBusiness?.business_id) return;

    try {
      await ordersService.updateOrderStatus(
        selectedBusiness.business_id,
        orderId,
        { status: newStatus }
      );
      
      // Recargar órdenes
      const allOrders = await ordersService.getOrders(
        selectedBusiness.business_id,
        {}
      );
      const kitchenOrders = allOrders.filter(
        o => o.status === 'confirmed' || o.status === 'preparing'
      );
      kitchenOrders.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      // Normalizar items de cada orden
      // IMPORTANTE: getOrders puede no incluir items completos
      const normalizedOrders = kitchenOrders.map(order => ({
        ...order,
        items: normalizeOrderItems(order.items || []),
      }));
      
      // Preservar items de órdenes existentes
      setOrders(prevOrders => {
        return normalizedOrders.map(newOrder => {
          const existingOrder = prevOrders.find(o => o.id === newOrder.id);
          if (existingOrder && existingOrder.items && existingOrder.items.length > 0) {
            return {
              ...newOrder,
              items: existingOrder.items,
            };
          }
          return newOrder;
        });
      });
      
      // Si se marcó como "ready", limpiar el detalle si era la orden seleccionada
      if (newStatus === 'ready' && selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(null);
      }
      
      // Actualizar orden seleccionada solo si no se marcó como ready
      if (newStatus !== 'ready' && selectedOrder && selectedOrder.id === orderId) {
        const updated = normalizedOrders.find(o => o.id === orderId);
        if (updated) {
          // CRÍTICO: SIEMPRE preservar items si la orden seleccionada los tiene
          if (selectedOrder.items && selectedOrder.items.length > 0) {
            setSelectedOrder({
              ...updated, // Actualizar campos básicos
              items: selectedOrder.items, // Preservar items completos
            });
          } else if (updated.items && updated.items.length > 0) {
            // Si la nueva versión tiene items, usarla
            setSelectedOrder(updated);
          } else {
            // Ninguna tiene items, usar la versión actualizada
            setSelectedOrder(updated);
          }
        }
      }
      
      // Si no hay órdenes después de marcar como ready, asegurar que no haya orden seleccionada
      if (newStatus === 'ready' && normalizedOrders.length === 0) {
        setSelectedOrder(null);
      }
      
      // Si hay órdenes y no hay orden seleccionada (y no acabamos de marcar como ready), seleccionar la primera
      if (normalizedOrders.length > 0 && !selectedOrder && newStatus !== 'ready') {
        setSelectedOrder(normalizedOrders[0]);
      }
    } catch (err: any) {
      console.error('Error actualizando estado:', err);
      alert(err.message || 'Error al actualizar estado');
    }
  };

  const handleOrderSelect = async (order: Order) => {
    // CRÍTICO: findAllByBusiness NO incluye items, siempre debemos cargar el detalle completo
    // Incluso si order.items existe, puede estar vacío o incompleto
    try {
      if (!selectedBusiness?.business_id) {
        console.warn('No business_id available');
        return;
      }
      
      // Asegurar que los productos estén cargados antes de cargar la orden
      if (products.length === 0 && !loadingProducts) {
        try {
          setLoadingProducts(true);
          const productsResponse = await productsService.getProducts(selectedBusiness.business_id);
          setProducts(productsResponse.data);
        } catch (err: any) {
          console.error('Error cargando productos:', err);
          // Continuar aunque falle la carga de productos
        } finally {
          setLoadingProducts(false);
        }
      }
      
      // SIEMPRE cargar el detalle completo de la orden para asegurar que tenemos los items más actualizados
      const fullOrder = await ordersService.getOrder(
        selectedBusiness.business_id,
        order.id
      );
      
      // Normalizar items
      const normalizedOrder = {
        ...fullOrder,
        items: normalizeOrderItems(fullOrder.items || []),
      };
      
      // Actualizar la orden seleccionada con el detalle completo
      setSelectedOrder(normalizedOrder);
      
      // Actualizar también en la lista para preservar los items en futuros refreshes
      setOrders(prev => prev.map(o => 
        o.id === order.id ? normalizedOrder : o
      ));
    } catch (err: any) {
      console.error('Error cargando detalle de orden:', err);
      // Si falla, usar la orden básica pero no perder la selección
      setSelectedOrder(order);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return {
          label: 'Pendiente',
          color: 'bg-red-100 text-red-700 border-red-300',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        };
      case 'preparing':
        return {
          label: 'En preparación',
          color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          ),
        };
      case 'ready':
        return {
          label: 'Listo',
          color: 'bg-green-100 text-green-700 border-green-300',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ),
        };
      default:
        return {
          label: status,
          color: 'bg-gray-100 text-gray-700 border-gray-300',
          icon: null,
        };
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-MX', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Cargar productos para obtener nombres de variantes
  useEffect(() => {
    const loadProducts = async () => {
      if (!selectedBusiness?.business_id) return;
      
      try {
        setLoadingProducts(true);
        const productsResponse = await productsService.getProducts(selectedBusiness.business_id);
        setProducts(productsResponse.data);
      } catch (err: any) {
        console.error('Error cargando productos:', err);
        // No bloquear la UI si falla la carga de productos
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProducts();
  }, [selectedBusiness?.business_id]);

  // Helper para obtener el nombre legible de una variante
  const getVariantName = (productId: string | undefined, variantGroupId: string, variantId: string | string[]): string => {
    if (!productId) {
      return String(variantId);
    }
    
    const product = products.find(p => p.id === productId);
    if (!product || !product.variant_groups || product.variant_groups.length === 0) {
      return String(variantId);
    }
    
    // Manejar formato legacy: "legacy-0", "legacy-1", etc.
    let variantGroup: any = null;
    if (variantGroupId.startsWith('legacy-')) {
      // Extraer el índice del formato "legacy-X"
      const legacyIndex = parseInt(variantGroupId.replace('legacy-', ''), 10);
      if (!isNaN(legacyIndex) && legacyIndex >= 0 && legacyIndex < product.variant_groups.length) {
        variantGroup = product.variant_groups[legacyIndex];
      }
    } else {
      // Buscar por ID o nombre real
      // El backend puede devolver variant_group_id en lugar de id
      variantGroup = product.variant_groups.find(
        vg => 
          vg.id === variantGroupId || 
          (vg as any).variant_group_id === variantGroupId ||
          vg.name === variantGroupId || 
          (vg as any).variant_group_name === variantGroupId ||
          String(vg.id) === String(variantGroupId) ||
          String((vg as any).variant_group_id) === String(variantGroupId)
      );
    }
    
    if (!variantGroup || !variantGroup.variants || variantGroup.variants.length === 0) {
      return String(variantId);
    }
    
    // Si variantId es un array (selección múltiple)
    if (Array.isArray(variantId)) {
      const variantNames = variantId.map(id => {
        // Manejar formato legacy para variantes: "legacy-0-1", "legacy-1-0", etc.
        if (typeof id === 'string' && id.startsWith('legacy-')) {
          // Formato: "legacy-X-Y" donde X es el grupo e Y es la variante
          const parts = id.replace('legacy-', '').split('-');
          if (parts.length >= 2) {
            const variantIndex = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(variantIndex) && variantIndex >= 0 && variantIndex < variantGroup.variants.length) {
              const variant = variantGroup.variants[variantIndex];
              return variant?.name || (variant as any)?.variant_name || String(id);
            }
          }
        }
        
        // Buscar por ID o nombre real
        // El backend puede devolver variant_id en lugar de id
        const variant = variantGroup.variants.find(
          (v: ProductVariant) => 
            v.id === id || 
            (v as any).variant_id === id ||
            v.name === id || 
            (v as any).variant_name === id ||
            String(v.id) === String(id) || 
            String((v as any).variant_id) === String(id) ||
            String(v.name) === String(id) || 
            String((v as any).variant_name) === String(id)
        );
        return variant ? (variant.name || (variant as any).variant_name) : String(id);
      });
      return variantNames.join(', ');
    }
    
    // Si variantId es un string (selección única)
    // Manejar formato legacy para variantes: "legacy-0-1", "legacy-1-0", etc.
    if (typeof variantId === 'string' && variantId.startsWith('legacy-')) {
      // Formato: "legacy-X-Y" donde X es el grupo e Y es la variante
      const parts = variantId.replace('legacy-', '').split('-');
      if (parts.length >= 2) {
        const variantIndex = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(variantIndex) && variantIndex >= 0 && variantIndex < variantGroup.variants.length) {
          const variant = variantGroup.variants[variantIndex];
          return variant?.name || (variant as any)?.variant_name || String(variantId);
        }
      }
    }
    
    // Buscar por ID o nombre real
    // El backend puede devolver variant_id en lugar de id
    const variant = variantGroup.variants.find(
      (v: ProductVariant) => 
        v.id === variantId || 
        (v as any).variant_id === variantId ||
        v.name === variantId || 
        (v as any).variant_name === variantId ||
        String(v.id) === String(variantId) || 
        String((v as any).variant_id) === String(variantId) ||
        String(v.name) === String(variantId) || 
        String((v as any).variant_name) === String(variantId)
    );
    
    return variant ? (variant.name || (variant as any).variant_name) : String(variantId);
  };

  // Helper para obtener el nombre del grupo de variantes
  const getVariantGroupName = (productId: string | undefined, variantGroupId: string): string => {
    if (!productId) {
      return String(variantGroupId);
    }
    
    const product = products.find(p => p.id === productId);
    if (!product || !product.variant_groups || product.variant_groups.length === 0) {
      return String(variantGroupId);
    }
    
    // Manejar formato legacy: "legacy-0", "legacy-1", etc.
    let variantGroup: any = null;
    if (variantGroupId.startsWith('legacy-')) {
      // Extraer el índice del formato "legacy-X"
      const legacyIndex = parseInt(variantGroupId.replace('legacy-', ''), 10);
      if (!isNaN(legacyIndex) && legacyIndex >= 0 && legacyIndex < product.variant_groups.length) {
        variantGroup = product.variant_groups[legacyIndex];
      }
    } else {
      // Buscar por ID o nombre real
      // El backend puede devolver variant_group_id en lugar de id
      variantGroup = product.variant_groups.find(
        vg => 
          vg.id === variantGroupId || 
          (vg as any).variant_group_id === variantGroupId ||
          vg.name === variantGroupId || 
          (vg as any).variant_group_name === variantGroupId ||
          String(vg.id) === String(variantGroupId) ||
          String((vg as any).variant_group_id) === String(variantGroupId)
      );
    }
    
    return variantGroup ? (variantGroup.name || (variantGroup as any).variant_group_name) : String(variantGroupId);
  };

  // Helper para parsear variant_selection
  const parseVariantSelection = (variantSelection: any): Record<string, any> | null => {
    if (!variantSelection) return null;
    
    if (typeof variantSelection === 'string') {
      try {
        return JSON.parse(variantSelection);
      } catch (e) {
        console.warn('Error parsing variant_selection:', e);
        return null;
      }
    }
    
    if (typeof variantSelection === 'object') {
      return variantSelection;
    }
    
    return null;
  };

  // Helper para normalizar items de una orden
  const normalizeOrderItems = (items: any[]): any[] => {
    if (!items || !Array.isArray(items)) return [];
    
    return items.map(item => ({
      ...item,
      variant_selection: parseVariantSelection(item.variant_selection),
    }));
  };

  const getOrderSummary = (order: Order) => {
    // Si la orden tiene items, mostrarlos
    if (order.items && order.items.length > 0) {
      const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
      const firstItem = order.items[0];
      const remaining = order.items.length - 1;
      if (remaining === 0) {
        return `${totalItems} ${totalItems === 1 ? 'item' : 'items'} • ${firstItem.item_name}`;
      }
      return `${totalItems} ${totalItems === 1 ? 'item' : 'items'} • ${firstItem.item_name} +${remaining} más`;
    }
    
    // Si no tiene items pero tiene item_count (del backend), usar eso
    if (order.item_count && order.item_count > 0) {
      return `${order.item_count} ${order.item_count === 1 ? 'item' : 'items'}`;
    }
    
    return 'Sin items';
  };

  return (
    <>
      <Head>
        <title>Control de Cocina - AGORA</title>
      </Head>
      <KitchenLayout>
        <div className="w-full h-full flex flex-col bg-gray-50">
          {/* Header naranja */}
          <div className="bg-orange-600 text-white px-6 py-4">
            <h1 className="text-xl font-semibold">Control de Cocina</h1>
          </div>

          {/* Contenido principal: dos paneles */}
          <div className="flex-1 flex overflow-hidden">
            {/* Panel izquierdo: Lista de órdenes */}
            <div className="w-1/3 border-r border-gray-200 bg-white flex flex-col">
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="text-base font-semibold text-gray-900">Órdenes Pendientes</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {orders.length} {orders.length === 1 ? 'orden activa' : 'órdenes activas'}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto">
                {error && (
                  <div className="m-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">Cargando órdenes...</div>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <p className="text-gray-500 text-sm mb-2">No hay órdenes pendientes</p>
                      <p className="text-gray-400 text-xs">Las órdenes confirmadas aparecerán aquí</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    {orders.map((order) => {
                      const isSelected = selectedOrder?.id === order.id;
                      const statusBadge = getStatusBadge(order.status);
                      
                      return (
                        <div
                          key={order.id}
                          onClick={() => handleOrderSelect(order)}
                          className={`
                            p-4 rounded-lg border-2 cursor-pointer transition-all
                            ${isSelected 
                              ? 'border-orange-500 bg-orange-50 shadow-md' 
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                            }
                          `}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-gray-900">
                                  #{order.order_number || order.id.slice(-8).toUpperCase()}
                                </span>
                              </div>
                              <div className="text-xs text-gray-600 mb-2">
                                {formatTime(order.created_at)}
                              </div>
                              <div className="text-sm text-gray-700">
                                {getOrderSummary(order)}
                              </div>
                            </div>
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium ${statusBadge.color}`}>
                              {statusBadge.icon}
                              <span>{statusBadge.label}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Panel derecho: Detalle de orden seleccionada */}
            <div className="flex-1 bg-gray-50 flex flex-col">
              {selectedOrder ? (
                <>
                  {/* Header del detalle */}
                  <div className="bg-white border-b border-gray-200 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-semibold text-gray-900">
                          Orden #{selectedOrder.order_number || selectedOrder.id.slice(-8).toUpperCase()}
                        </h2>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-gray-600">
                            {formatTime(selectedOrder.created_at)}
                          </p>
                          <span className="text-gray-400">•</span>
                          <p className="text-xs text-gray-600">
                            Tiempo estimado: <span className="font-semibold text-gray-900">15 min</span>
                          </p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium ${getStatusBadge(selectedOrder.status).color}`}>
                        {getStatusBadge(selectedOrder.status).icon}
                        <span>{getStatusBadge(selectedOrder.status).label}</span>
                      </div>
                    </div>
                  </div>

                  {/* Contenido del detalle */}
                  <div className="flex-1 overflow-y-auto p-4">

                    {/* Items de la orden */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Items de la Orden</h3>
                      {!selectedOrder.items || selectedOrder.items.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <p>No hay items en esta orden</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {selectedOrder.items?.map((item, itemIndex) => {
                            // variant_selection ya está parseado por normalizeOrderItems
                            const variantSelection = item.variant_selection;

                            return (
                              <div 
                                key={item.id} 
                                className={`bg-white rounded-lg border border-gray-300 p-4 ${
                                  itemIndex < (selectedOrder.items?.length ?? 0) - 1 ? 'mb-4' : ''
                                }`}
                              >
                                {/* Nombre y cantidad del item */}
                                <div className="mb-3 pb-2 border-b border-gray-200">
                                  <span className="text-base font-bold text-gray-900">
                                    {item.quantity}x {item.item_name}
                                  </span>
                                </div>

                                {/* Variantes del producto */}
                                {variantSelection && typeof variantSelection === 'object' && Object.keys(variantSelection).length > 0 && (
                                  <div className="mb-3">
                                    <div className="text-xs font-semibold text-gray-700 mb-2">Variantes:</div>
                                    <div className="space-y-2">
                                      {Object.entries(variantSelection).map(([groupKey, variantValue]: [string, any]) => {
                                        // Obtener el producto completo para acceder a los grupos de variantes
                                        const product = products.find(p => p.id === item.product_id);
                                        
                                        // Obtener el grupo de variantes completo
                                        let variantGroup: any = null;
                                        if (groupKey.startsWith('legacy-')) {
                                          const legacyIndex = parseInt(groupKey.replace('legacy-', ''), 10);
                                          if (!isNaN(legacyIndex) && product?.variant_groups && legacyIndex >= 0 && legacyIndex < product.variant_groups.length) {
                                            variantGroup = product.variant_groups[legacyIndex];
                                          }
                                        } else if (product?.variant_groups) {
                                          variantGroup = product.variant_groups.find(
                                            vg => 
                                              vg.id === groupKey || 
                                              (vg as any).variant_group_id === groupKey ||
                                              String(vg.id) === String(groupKey) ||
                                              String((vg as any).variant_group_id) === String(groupKey)
                                          );
                                        }
                                        
                                        const groupName = getVariantGroupName(item.product_id, groupKey);
                                        const isMultiple = variantGroup?.selection_type === 'multiple' || (variantGroup as any)?.selection_type === 'multiple';
                                        
                                        // Normalizar los IDs de variantes seleccionadas
                                        const selectedVariantIds: string[] = Array.isArray(variantValue) 
                                          ? variantValue.map(v => {
                                              if (typeof v === 'string' && v.startsWith('legacy-')) {
                                                return v;
                                              }
                                              return String(v);
                                            })
                                          : [String(variantValue)];
                                        
                                        // Si es selección múltiple y tenemos el grupo completo, mostrar todas las opciones
                                        if (isMultiple && variantGroup && variantGroup.variants && variantGroup.variants.length > 0) {
                                          return (
                                            <div key={groupKey} className="mb-2">
                                              <div className="text-xs font-semibold text-gray-700 mb-1.5">{groupName}:</div>
                                              <div className="grid grid-cols-2 gap-1.5">
                                                {variantGroup.variants.map((variant: any, idx: number) => {
                                                  const variantId = variant.id || (variant as any).variant_id || `variant-${idx}`;
                                                  const variantName = variant.name || (variant as any).variant_name || `Variante ${idx + 1}`;
                                                  
                                                  // Verificar si esta variante fue seleccionada
                                                  const isSelected = selectedVariantIds.some(selectedId => {
                                                    const selectedIdStr = String(selectedId);
                                                    
                                                    // Comparar por ID real (UUID)
                                                    if (String(variantId) === selectedIdStr) return true;
                                                    
                                                    // Comparar por variant_id del backend
                                                    if ((variant as any).variant_id && String((variant as any).variant_id) === selectedIdStr) return true;
                                                    
                                                    // Comparar por nombre
                                                    if (variantName === selectedIdStr) return true;
                                                    
                                                    // Comparar por formato legacy: "legacy-X-Y" donde Y es el índice de la variante
                                                    if (selectedIdStr.startsWith('legacy-')) {
                                                      const parts = selectedIdStr.replace('legacy-', '').split('-');
                                                      if (parts.length >= 2) {
                                                        const variantIndex = parseInt(parts[parts.length - 1], 10);
                                                        if (!isNaN(variantIndex) && variantIndex === idx) return true;
                                                      }
                                                    }
                                                    
                                                    return false;
                                                  });
                                                  
                                                  return (
                                                    <div
                                                      key={idx}
                                                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded border-2 transition-all ${
                                                        isSelected
                                                          ? 'bg-green-50 border-green-500 text-green-900'
                                                          : 'bg-red-50 border-red-300 text-red-700 line-through opacity-70'
                                                      }`}
                                                    >
                                                      {isSelected ? (
                                                        <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                      ) : (
                                                        <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                      )}
                                                      <span className={`text-xs font-semibold ${isSelected ? 'text-green-900' : 'text-red-700'}`}>
                                                        {variantName}
                                                      </span>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          );
                                        }
                                        
                                        // Si es selección única o no tenemos el grupo completo, mostrar formato simple pero más grande
                                        let variantName: string;
                                        if (Array.isArray(variantValue)) {
                                          variantName = variantValue.map(v => 
                                            getVariantName(item.product_id, groupKey, v)
                                          ).join(', ');
                                        } else if (typeof variantValue === 'object' && variantValue !== null) {
                                          const variantId = variantValue.id || variantValue.variant_id || variantValue;
                                          variantName = getVariantName(item.product_id, groupKey, variantId);
                                        } else {
                                          variantName = getVariantName(item.product_id, groupKey, variantValue);
                                        }
                                        
                                        const displayGroupName = groupName === groupKey ? groupKey : groupName;
                                        const displayVariantName = variantName === String(variantValue) ? String(variantValue) : variantName;
                                        
                                        return (
                                          <div key={groupKey} className="mb-2">
                                            <div className="text-xs font-semibold text-gray-700 mb-1">{displayGroupName}:</div>
                                            <div className="px-2.5 py-1.5 bg-gray-100 border border-gray-300 rounded">
                                              <span className="text-xs font-medium text-gray-900">{displayVariantName}</span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Instrucciones especiales del cliente */}
                                {item.special_instructions && (
                                  <div className="mt-2 p-2 bg-yellow-50 border-l-3 border-yellow-500 rounded">
                                    <div className="flex items-start gap-1.5">
                                      <svg className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                      </svg>
                                      <div>
                                        <div className="text-xs font-semibold text-yellow-800 mb-0.5">
                                          Instrucción especial:
                                        </div>
                                        <div className="text-xs text-yellow-900 font-medium">
                                          {item.special_instructions}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Botón de acción principal */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      {selectedOrder.status === 'confirmed' && (
                        <button
                          onClick={() => handleStatusChange(selectedOrder.id, 'preparing')}
                          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-4 px-6 rounded-lg text-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          Iniciar Preparación
                        </button>
                      )}
                      {selectedOrder.status === 'preparing' && (
                        <button
                          onClick={() => handleStatusChange(selectedOrder.id, 'ready')}
                          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg text-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Marcar como Listo
                        </button>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-gray-500 text-lg mb-2">Selecciona una orden</p>
                    <p className="text-gray-400 text-sm">Elige una orden del panel izquierdo para ver sus detalles</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </KitchenLayout>
    </>
  );
}

