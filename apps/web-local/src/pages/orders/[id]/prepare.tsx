import Head from 'next/head';
import { useRouter } from 'next/router';
import LocalLayout from '@/components/layout/LocalLayout';
import { useState, useEffect, useCallback } from 'react';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { ordersService, Order, OrderItem } from '@/lib/orders';
import { productsService, Product } from '@/lib/products';
import { businessService } from '@/lib/business';

interface ProductStockInfo {
  productId: string;
  product: Product;
  orderItem: OrderItem;
  requestedQuantity: number;
  availableStock: number | null; // null = sin límite
  branchId: string;
  branchName: string;
  adjustedQuantity: number;
  stockShortage: number; // Cantidad faltante (si hay)
}

interface StockShortageOption {
  type: 'refund' | 'other_branch' | 'wallet';
  label: string;
  description: string;
  selectedBranchId?: string; // Para opción 'other_branch'
  otherBranches?: Array<{
    branch_id: string;
    branch_name: string;
    stock: number | null;
  }>; // Lista de otras sucursales con stock disponible
}

export default function PrepareOrderPage() {
  const router = useRouter();
  const { id } = router.query;
  const { selectedBusiness } = useSelectedBusiness();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [productsStock, setProductsStock] = useState<ProductStockInfo[]>([]);
  const [saving, setSaving] = useState(false);
  const [shortageOptions, setShortageOptions] = useState<Record<string, StockShortageOption>>({});

  useEffect(() => {
    if (id && router.isReady) {
      const businessId = selectedBusiness?.business_id || sessionStorage.getItem('temp_order_business_id');
      if (businessId) {
        loadOrderData(businessId);
      } else {
        setLoading(false);
        setError('No se pudo determinar la tienda del pedido');
      }
    }
  }, [id, router.isReady, selectedBusiness?.business_id]);

  const loadOrderData = async (businessId: string) => {
    if (!id || !businessId) return;

    try {
      setLoading(true);
      setError(null);

      // Cargar pedido
      const orderData = await ordersService.getOrder(businessId, id as string);
      setOrder(orderData);

      console.log('🔵 [PREPARE] Pedido cargado:', { 
        orderId: orderData.id, 
        itemsCount: orderData.items?.length || 0,
        items: orderData.items 
      });

      if (!orderData.items || orderData.items.length === 0) {
        setError('El pedido no tiene items');
        setLoading(false);
        return;
      }

      // Obtener información de la sucursal
      const branch = await businessService.getMyBusiness(businessId);
      if (!branch) {
        setError('No se pudo obtener información de la sucursal');
        setLoading(false);
        return;
      }

      // Guardar groupId para usarlo después
      const groupId = branch.business_group_id || undefined;

      // Cargar stock de cada producto
      const stockInfoPromises = orderData.items
        .filter(item => item.product_id)
        .map(async (item) => {
          try {
            // Obtener producto
            const product = await productsService.getProduct(item.product_id!);
            
            // Obtener disponibilidad en la sucursal
            const availabilityResponse = await productsService.getProductBranchAvailability(
              item.product_id!
            );

            // Buscar la sucursal específica del pedido
            const branchAvailability = availabilityResponse.availabilities?.find(
              (av: any) => av.branch_id === businessId
            );

            console.log('🔵 [PREPARE] Disponibilidad:', {
              productId: item.product_id,
              businessId,
              availabilities: availabilityResponse.availabilities?.length || 0,
              branchAvailability: branchAvailability ? {
                branch_id: branchAvailability.branch_id,
                stock: branchAvailability.stock,
                is_enabled: branchAvailability.is_enabled
              } : null
            });

            const availableStock = branchAvailability?.stock ?? null;
            const requestedQuantity = item.quantity;
            const stockShortage = availableStock !== null && requestedQuantity > availableStock
              ? requestedQuantity - availableStock
              : 0;

            return {
              productId: item.product_id!,
              product,
              orderItem: item,
              requestedQuantity,
              availableStock,
              branchId: businessId,
              branchName: branch.name,
              adjustedQuantity: availableStock !== null && requestedQuantity > availableStock
                ? availableStock
                : requestedQuantity,
              stockShortage,
            } as ProductStockInfo;
          } catch (err) {
            console.error(`Error cargando producto ${item.product_id}:`, err);
            return null;
          }
        });

      const stockInfoResults = await Promise.all(stockInfoPromises);
      const validStockInfo = stockInfoResults.filter((info): info is ProductStockInfo => info !== null);
      
      console.log('🔵 [PREPARE] Stock info cargado:', {
        totalItems: orderData.items.length,
        validStockInfo: validStockInfo.length,
        stockInfo: validStockInfo
      });
      
      setProductsStock(validStockInfo);

      // Inicializar opciones de escasez para productos con stock insuficiente
      const initialShortageOptions: Record<string, StockShortageOption> = {};
      validStockInfo.forEach((info) => {
        if (info.stockShortage > 0) {
          initialShortageOptions[info.productId] = {
            type: 'wallet',
            label: 'Monedero electrónico',
            description: 'Devolver el saldo al monedero para usar en futuras compras',
          };
        }
      });
      setShortageOptions(initialShortageOptions);

    } catch (err: any) {
      console.error('Error cargando datos:', err);
      setError('Error al cargar los datos del pedido');
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    setProductsStock((prev) =>
      prev.map((info) => {
        if (info.productId === productId) {
          const maxQuantity = info.availableStock !== null 
            ? Math.min(newQuantity, info.availableStock)
            : newQuantity;
          
          const stockShortage = info.availableStock !== null && newQuantity > info.availableStock
            ? newQuantity - info.availableStock
            : 0;

          return {
            ...info,
            adjustedQuantity: maxQuantity,
            stockShortage,
          };
        }
        return info;
      })
    );
  };

  const handleShortageOptionChange = async (productId: string, optionType: 'refund' | 'other_branch' | 'wallet') => {
    const productInfo = productsStock.find(p => p.productId === productId);
    if (!productInfo) return;

    let newOption: StockShortageOption = {
      type: optionType,
      label: optionType === 'refund' ? 'Devolución' : 
             optionType === 'other_branch' ? 'Buscar en otra sucursal' :
             'Monedero electrónico',
      description: optionType === 'refund' ? 'Devolver el dinero al cliente' :
                    optionType === 'other_branch' ? 'Buscar el producto en otra sucursal del grupo' :
                    'Devolver el saldo al monedero para usar en futuras compras',
    };

    // Si se selecciona "otra sucursal", buscar sucursales con stock disponible
    if (optionType === 'other_branch') {
      try {
        // Obtener el grupo empresarial de la sucursal actual
        const branch = await businessService.getMyBusiness(productInfo.branchId);
        const groupId = branch?.business_group_id || undefined;
        
        const availabilityResponse = await productsService.getProductBranchAvailability(
          productId
        );
        
        // Filtrar sucursales que no sean la actual y que tengan stock disponible
        const otherBranches = availabilityResponse.availabilities
          .filter((av: any) => av.branch_id !== productInfo.branchId && av.is_enabled)
          .map((av: any) => ({
            branch_id: av.branch_id,
            branch_name: av.branch_name,
            stock: av.stock,
          }));

        newOption.otherBranches = otherBranches;
        if (otherBranches.length > 0) {
          newOption.selectedBranchId = otherBranches[0].branch_id;
        }
      } catch (err) {
        console.error('Error buscando otras sucursales:', err);
      }
    }

    setShortageOptions((prev) => ({
      ...prev,
      [productId]: newOption,
    }));
  };

  const handleMarkAsCompleted = async () => {
    if (!order) return;

    const businessId = selectedBusiness?.business_id || sessionStorage.getItem('temp_order_business_id');
    if (!businessId) {
      alert('No se pudo determinar la tienda del pedido');
      return;
    }

    // Validar que todas las cantidades ajustadas sean válidas
    const hasInvalidQuantities = productsStock.some(
      (info) => info.adjustedQuantity <= 0
    );

    if (hasInvalidQuantities) {
      alert('Todas las cantidades deben ser mayores a 0');
      return;
    }

    // Validar que todos los productos con escasez tengan una opción seleccionada
    const productsWithShortage = productsStock.filter((info) => info.stockShortage > 0);
    const hasUnresolvedShortage = productsWithShortage.some(
      (info) => !shortageOptions[info.productId]
    );

    if (hasUnresolvedShortage) {
      alert('Debes seleccionar una opción para todos los productos con stock insuficiente');
      return;
    }

    // Confirmar acción
    if (!confirm('¿Estás seguro de que deseas marcar este pedido como completado? El pedido quedará listo para distribución.')) {
      return;
    }

    try {
      setSaving(true);

      // Primero guardar la preparación
      const items = productsStock.map((info) => ({
        item_id: info.orderItem.id,
        quantity: info.adjustedQuantity,
      }));

      const shortageOptionsArray = productsStock
        .filter((info) => info.stockShortage > 0)
        .map((info) => {
          const option = shortageOptions[info.productId];
          if (!option) return null;

          return {
            product_id: info.productId,
            option_type: option.type,
            alternative_branch_id: option.type === 'other_branch' ? option.selectedBranchId : undefined,
            shortage_quantity: info.stockShortage,
          };
        })
        .filter((opt): opt is NonNullable<typeof opt> => opt !== null);

      // Guardar preparación
      await ordersService.prepareOrder(businessId, order.id, {
        items,
        shortage_options: shortageOptionsArray.length > 0 ? shortageOptionsArray : undefined,
      });

      // Luego marcar como completado
      await ordersService.updateOrderStatus(businessId, order.id, {
        status: 'completed',
      });

      // Generar guía de envío automáticamente
      try {
        const { logisticsService } = await import('@/lib/logistics');
        console.log('🚚 Intentando crear guía de envío para orden:', order.id);
        const shippingLabel = await logisticsService.createShippingLabel({
          orderId: order.id,
          packageWeight: 1.0, // Peso por defecto, se puede calcular basado en items
          packageDimensions: '30x20x15 cm', // Dimensiones por defecto
          declaredValue: parseFloat(order.subtotal.toString()), // Valor declarado = subtotal (sin envío)
        });
        console.log('✅ Guía de envío generada automáticamente:', {
          trackingNumber: shippingLabel.tracking_number,
          carrier: shippingLabel.carrier_name,
          status: shippingLabel.status,
        });
      } catch (logisticsError: any) {
        console.error('❌ Error generando guía de envío:', {
          message: logisticsError.message,
          statusCode: logisticsError.statusCode,
          response: logisticsError.response,
          orderId: order.id,
        });
        // Mostrar alerta al usuario para que sepa que hubo un problema
        alert(`⚠️ La orden se marcó como completada, pero hubo un problema al generar la guía de envío: ${logisticsError.message || 'Error desconocido'}. Puedes generar la guía manualmente desde el detalle de la orden.`);
        // No bloquear el flujo si falla la generación de guía
      }

      // Regresar a la página de detalle del pedido
      router.push(`/orders/${order.id}`);
    } catch (err: any) {
      console.error('Error marcando pedido como completado:', err);
      alert('Error al marcar el pedido como completado: ' + (err.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  if (loading) {
    return (
      <LocalLayout>
        <Head>
          <title>Preparar pedido - AGORA Local</title>
        </Head>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando datos del pedido...</p>
          </div>
        </div>
      </LocalLayout>
    );
  }

  if (error || !order) {
    return (
      <LocalLayout>
        <Head>
          <title>Error - AGORA Local</title>
        </Head>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || 'Pedido no encontrado'}</p>
            <button
              onClick={() => router.push('/orders')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Volver a pedidos
            </button>
          </div>
        </div>
      </LocalLayout>
    );
  }

  return (
    <LocalLayout>
      <Head>
        <title>Preparar pedido #{order.id.slice(-8).toUpperCase()} - AGORA Local</title>
      </Head>
      <div className="w-full h-full flex flex-col bg-white">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center text-gray-500 hover:text-gray-700 font-normal"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>
          <h1 className="text-2xl font-medium text-gray-700">
            No. de orden {order.id.slice(-8).toUpperCase()} - Agregar envío
          </h1>
        </div>

        {/* Items listos para envío */}
        <div className="flex-1 overflow-auto bg-white">
          <div className="bg-white w-full h-full flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-base font-normal text-gray-600">Ítems listos para envío</h2>
            </div>
            
            <div className="flex-1 overflow-auto">
              <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre del Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Almacén
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productsStock.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No hay items para preparar
                    </td>
                  </tr>
                ) : (
                  productsStock.map((info) => (
                  <tr key={info.productId} className={info.stockShortage > 0 ? 'bg-yellow-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded flex items-center justify-center mr-3">
                          {info.product.primary_image_url || info.product.image_url ? (
                            <img
                              src={info.product.primary_image_url || info.product.image_url}
                              alt={info.product.name}
                              className="h-10 w-10 rounded object-cover"
                            />
                          ) : (
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          )}
                        </div>
                        <div className="text-sm font-normal text-gray-700">
                          {info.product.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-normal text-gray-500">
                      {info.product.sku || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="0"
                          max={info.availableStock !== null ? info.availableStock : undefined}
                          value={info.adjustedQuantity}
                          onChange={(e) => {
                            const newValue = parseInt(e.target.value) || 0;
                            handleQuantityChange(info.productId, newValue);
                          }}
                          className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-500">
                          / {info.requestedQuantity}
                        </span>
                      </div>
                      {info.stockShortage > 0 && (
                        <p className="text-xs text-red-600 mt-1">
                          Faltan {info.stockShortage} unidades
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-normal text-gray-600">
                      {info.availableStock !== null ? info.availableStock : 'Sin límite'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 text-gray-500"
                      >
                        <option>{info.branchName}</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {info.stockShortage > 0 && (
                        <div className="space-y-2">
                          <select
                            value={shortageOptions[info.productId]?.type || 'wallet'}
                            onChange={(e) => {
                              const optionType = e.target.value as 'refund' | 'other_branch' | 'wallet';
                              handleShortageOptionChange(info.productId, optionType);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="wallet">Monedero electrónico</option>
                            <option value="other_branch">Buscar en otra sucursal</option>
                            <option value="refund">Devolución</option>
                          </select>
                          {shortageOptions[info.productId]?.type === 'other_branch' && 
                           shortageOptions[info.productId]?.otherBranches && 
                           shortageOptions[info.productId]!.otherBranches!.length > 0 && (
                            <select
                              value={shortageOptions[info.productId]?.selectedBranchId || ''}
                              onChange={(e) => {
                                setShortageOptions((prev) => ({
                                  ...prev,
                                  [info.productId]: {
                                    ...prev[info.productId]!,
                                    selectedBranchId: e.target.value,
                                  },
                                }));
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              {shortageOptions[info.productId]!.otherBranches!.map((branch) => (
                                <option key={branch.branch_id} value={branch.branch_id}>
                                  {branch.branch_name} {branch.stock !== null ? `(Stock: ${branch.stock})` : '(Sin límite)'}
                                </option>
                              ))}
                            </select>
                          )}
                          {shortageOptions[info.productId]?.type === 'other_branch' && 
                           (!shortageOptions[info.productId]?.otherBranches || 
                            shortageOptions[info.productId]!.otherBranches!.length === 0) && (
                            <p className="text-xs text-yellow-600">
                              No hay otras sucursales con stock disponible
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Botones de acción */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 flex-shrink-0 bg-white">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-normal text-gray-600 bg-white hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleMarkAsCompleted}
              disabled={saving}
              className="px-4 py-2 bg-black text-white rounded-md text-sm font-normal hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Completando...' : 'Marcar como completado'}
            </button>
          </div>
          </div>
        </div>
      </div>
    </LocalLayout>
  );
}

