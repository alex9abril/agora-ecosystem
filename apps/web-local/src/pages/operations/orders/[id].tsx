/**
 * Detalle de orden para Operations Staff
 * Vista operativa con acciones rápidas
 */

import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { useRouteGuard } from '@/lib/role-guards';
import { ordersService, Order } from '@/lib/orders';
import { productsService, Product } from '@/lib/products';
import OperationsLayout from '@/components/operations/OperationsLayout';

export default function OperationsOrderDetailPage() {
  useRouteGuard('canManageOrders');
  
  const router = useRouter();
  const { id } = router.query;
  const { selectedBusiness } = useSelectedBusiness();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!id || !selectedBusiness?.business_id || typeof id !== 'string') return;

    let isInitialLoad = true;
    
    const loadOrder = async (isInitial = false) => {
      try {
        // Solo mostrar loading en la carga inicial
        if (isInitial) {
          setLoading(true);
        }
        setError(null);
        const orderData = await ordersService.getOrder(
          selectedBusiness.business_id,
          id
        );
        setOrder(orderData);
      } catch (err: any) {
        console.error('Error cargando orden:', err);
        setError(err.message || 'Error al cargar la orden');
      } finally {
        if (isInitial) {
          setLoading(false);
        }
      }
    };

    loadOrder(true);
    
    // No hacer auto-refresh en el detalle para evitar parpadeos
    // La orden se actualizará solo cuando el usuario cambie el estado manualmente
  }, [id, selectedBusiness?.business_id]);

  // Cargar productos para resolver nombres de variantes
  useEffect(() => {
    if (!selectedBusiness?.business_id) return;

    const loadProducts = async () => {
      try {
        const productsResponse = await productsService.getProducts(selectedBusiness.business_id);
        setProducts(productsResponse.data);
      } catch (err: any) {
        console.error('Error cargando productos:', err);
        // No bloquear la UI si falla la carga de productos
      }
    };

    loadProducts();
  }, [selectedBusiness?.business_id]);

  // Helper para parsear variant_selection
  const parseVariantSelection = (variantSelection: any): Record<string, any> | null => {
    if (!variantSelection) return null;
    
    if (typeof variantSelection === 'string') {
      try {
        return JSON.parse(variantSelection);
      } catch (e) {
        return null;
      }
    }
    
    if (typeof variantSelection === 'object') {
      return variantSelection;
    }
    
    return null;
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
      const legacyIndex = parseInt(variantGroupId.replace('legacy-', ''), 10);
      if (!isNaN(legacyIndex) && legacyIndex >= 0 && legacyIndex < product.variant_groups.length) {
        variantGroup = product.variant_groups[legacyIndex];
      }
    } else {
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
      const legacyIndex = parseInt(variantGroupId.replace('legacy-', ''), 10);
      if (!isNaN(legacyIndex) && legacyIndex >= 0 && legacyIndex < product.variant_groups.length) {
        variantGroup = product.variant_groups[legacyIndex];
      }
    } else {
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
        if (typeof id === 'string' && id.startsWith('legacy-')) {
          const parts = id.replace('legacy-', '').split('-');
          if (parts.length >= 2) {
            const variantIndex = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(variantIndex) && variantIndex >= 0 && variantIndex < variantGroup.variants.length) {
              const variant = variantGroup.variants[variantIndex];
              return variant?.name || (variant as any)?.variant_name || String(id);
            }
          }
        }
        
        const variant = variantGroup.variants.find(
          v => 
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
    if (typeof variantId === 'string' && variantId.startsWith('legacy-')) {
      const parts = variantId.replace('legacy-', '').split('-');
      if (parts.length >= 2) {
        const variantIndex = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(variantIndex) && variantIndex >= 0 && variantIndex < variantGroup.variants.length) {
          const variant = variantGroup.variants[variantIndex];
          return variant?.name || (variant as any)?.variant_name || String(variantId);
        }
      }
    }
    
    const variant = variantGroup.variants.find(
      v => 
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

  const getStatusActions = (status: string) => {
    const actions: Record<string, { label: string; nextStatus: string; color: string }[]> = {
      pending: [
        { label: 'Aceptar Orden', nextStatus: 'confirmed', color: 'bg-green-600 hover:bg-green-700' },
        { label: 'Rechazar', nextStatus: 'cancelled', color: 'bg-red-600 hover:bg-red-700' },
      ],
      confirmed: [
        { label: 'Iniciar Preparación', nextStatus: 'preparing', color: 'bg-orange-600 hover:bg-orange-700' },
      ],
      preparing: [
        { label: 'Marcar como Listo', nextStatus: 'ready', color: 'bg-green-600 hover:bg-green-700' },
      ],
      ready: [
        { label: 'Marcar como Entregado', nextStatus: 'delivered', color: 'bg-blue-600 hover:bg-blue-700' },
      ],
    };
    return actions[status] || [];
  };

  if (loading) {
    return (
      <OperationsLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">Cargando orden...</div>
        </div>
      </OperationsLayout>
    );
  }

  if (error || !order) {
    return (
      <OperationsLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-red-600">{error || 'Orden no encontrada'}</div>
        </div>
      </OperationsLayout>
    );
  }

  const statusActions = getStatusActions(order.status);

  return (
    <>
      <Head>
        <title>Orden #{order.order_number || order.id.slice(-8).toUpperCase()} - Operaciones</title>
      </Head>
      <OperationsLayout>
        <div className="w-full h-full flex flex-col bg-gray-50">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/operations')}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  Orden #{order.order_number || order.id.slice(-8).toUpperCase()}
                </h1>
                <p className="text-sm text-gray-600">
                  {new Date(order.created_at).toLocaleString('es-MX')}
                </p>
              </div>
            </div>
          </div>

          {/* Contenido */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Información del cliente */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-4">Cliente</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Nombre:</span>
                    <p className="font-medium text-gray-900">
                      {order.client_first_name} {order.client_last_name}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <p className="font-medium text-gray-900">{order.client_email}</p>
                  </div>
                  {order.client_phone && (
                    <div>
                      <span className="text-gray-600">Teléfono:</span>
                      <p className="font-medium text-gray-900">{order.client_phone}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Items del pedido */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-4">Items del Pedido</h2>
                <div className="space-y-4">
                  {order.items?.map((item) => {
                    const variantSelection = parseVariantSelection(item.variant_selection);
                    
                    return (
                      <div key={item.id} className="pb-4 border-b border-gray-200 last:border-0 last:pb-0">
                        {/* Nombre y cantidad */}
                        <p className="text-base font-semibold text-gray-900 mb-3">
                          {item.quantity}x {item.item_name}
                        </p>
                        
                        {/* Variantes */}
                        {variantSelection && typeof variantSelection === 'object' && Object.keys(variantSelection).length > 0 && (
                          <div className="mb-3 space-y-3">
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
                                  <div key={groupKey}>
                                    <div className="text-sm font-semibold text-gray-900 mb-2">{groupName}:</div>
                                    <div className="grid grid-cols-2 gap-2">
                                      {variantGroup.variants.map((variant: any, idx: number) => {
                                        const variantId = variant.id || (variant as any).variant_id || `variant-${idx}`;
                                        const variantName = variant.name || (variant as any).variant_name || `Variante ${idx + 1}`;
                                        
                                        // Verificar si esta variante fue seleccionada
                                        const isSelected = selectedVariantIds.some(selectedId => {
                                          const selectedIdStr = String(selectedId);
                                          
                                          if (String(variantId) === selectedIdStr) return true;
                                          if ((variant as any).variant_id && String((variant as any).variant_id) === selectedIdStr) return true;
                                          if (variantName === selectedIdStr) return true;
                                          
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
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                                              isSelected
                                                ? 'bg-green-50 border-green-500 text-green-900 shadow-sm'
                                                : 'bg-red-50 border-red-300 text-red-700 line-through opacity-70'
                                            }`}
                                          >
                                            {isSelected ? (
                                              <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                              </svg>
                                            ) : (
                                              <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                              </svg>
                                            )}
                                            <span className={`text-sm font-semibold ${isSelected ? 'text-green-900' : 'text-red-700'}`}>
                                              {variantName}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              }
                              
                              // Si es selección única o no tenemos el grupo completo, mostrar formato simple
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
                                <div key={groupKey}>
                                  <div className="text-sm font-semibold text-gray-900 mb-1.5">{displayGroupName}:</div>
                                  <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg">
                                    <span className="text-sm font-medium text-gray-900">{displayVariantName}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        {/* Instrucciones especiales */}
                        {item.special_instructions && (
                          <div className="mt-3 p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg">
                            <div className="flex items-start gap-2">
                              <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <div>
                                <div className="text-xs font-semibold text-yellow-800 mb-1">
                                  Instrucción especial:
                                </div>
                                <div className="text-sm text-yellow-900 font-medium">
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
              </div>

              {/* Resumen de pago */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-4">Resumen de Pago</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-900">${parseFloat(String(order.subtotal || order.total_amount || 0)).toFixed(2)}</span>
                  </div>
                  {order.delivery_fee && parseFloat(String(order.delivery_fee)) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Envío</span>
                      <span className="text-gray-900">${parseFloat(String(order.delivery_fee)).toFixed(2)}</span>
                    </div>
                  )}
                  {order.tip_amount && parseFloat(String(order.tip_amount)) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Propina</span>
                      <span className="text-gray-900">${parseFloat(String(order.tip_amount)).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="font-semibold text-gray-900 text-lg">
                      ${parseFloat(String(order.total_amount || order.total || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Acciones */}
              {statusActions.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-base font-semibold text-gray-900 mb-4">Acciones</h2>
                  <div className="flex gap-3">
                    {statusActions.map((action, index) => (
                      <button
                        key={index}
                        onClick={() => handleStatusChange(action.nextStatus)}
                        disabled={updating}
                        className={`${action.color} text-white font-medium px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {updating ? 'Procesando...' : action.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </OperationsLayout>
    </>
  );
}

