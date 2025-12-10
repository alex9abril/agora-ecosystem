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

      if (!orderData.items || orderData.items.length === 0) {
        setError('El pedido no tiene items');
        setLoading(false);
        return;
      }

      // Obtener información de la sucursal
      const branch = await businessService.getBusiness(businessId);
      if (!branch) {
        setError('No se pudo obtener información de la sucursal');
        setLoading(false);
        return;
      }

      // Cargar stock de cada producto
      const stockInfoPromises = orderData.items
        .filter(item => item.product_id)
        .map(async (item) => {
          try {
            // Obtener producto
            const product = await productsService.getProduct(item.product_id!);
            
            // Obtener disponibilidad en la sucursal
            const availability = await productsService.getProductBranchAvailability(
              item.product_id!,
              branch.business_group_id || undefined
            );

            // Buscar la sucursal específica del pedido
            const branchAvailability = availability.find(
              (av: any) => av.branch_id === businessId
            );

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

  const handleShortageOptionChange = (productId: string, option: StockShortageOption) => {
    setShortageOptions((prev) => ({
      ...prev,
      [productId]: option,
    }));
  };

  const handleSave = async () => {
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

    try {
      setSaving(true);

      // TODO: Implementar lógica de guardado
      // 1. Actualizar cantidades de items del pedido
      // 2. Procesar opciones de escasez (devolución, otra sucursal, monedero)
      // 3. Actualizar stock de productos
      // 4. Cambiar estado del pedido a 'preparing'

      // Por ahora, solo cambiar el estado
      await ordersService.updateOrderStatus(businessId, order.id, {
        status: 'preparing',
      });

      // Regresar a la página de detalle del pedido
      router.push(`/orders/${order.id}`);
    } catch (err: any) {
      console.error('Error guardando preparación:', err);
      alert('Error al guardar la preparación: ' + (err.message || 'Error desconocido'));
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
          <title>Preparar pedido - LOCALIA Local</title>
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
          <title>Error - LOCALIA Local</title>
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
        <title>Preparar pedido #{order.id.slice(0, 8)} - LOCALIA Local</title>
      </Head>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center text-gray-600 hover:text-gray-900"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            No. de orden {order.id.slice(0, 8)} - Agregar envío
          </h1>
        </div>

        {/* Items listos para envío */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Ítems listos para envío</h2>
          </div>
          
          <div className="overflow-x-auto">
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
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Warehouse
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productsStock.map((info) => (
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
                        <div className="text-sm font-medium text-gray-900">
                          {info.product.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {info.product.sku || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="0"
                          max={info.availableStock !== null ? info.availableStock : undefined}
                          value={info.adjustedQuantity}
                          onChange={(e) => handleQuantityChange(info.productId, parseInt(e.target.value) || 0)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm"
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
                        <select
                          value={shortageOptions[info.productId]?.type || 'wallet'}
                          onChange={(e) => {
                            const optionType = e.target.value as 'refund' | 'other_branch' | 'wallet';
                            handleShortageOptionChange(info.productId, {
                              type: optionType,
                              label: optionType === 'refund' ? 'Devolución' : 
                                     optionType === 'other_branch' ? 'Buscar en otra sucursal' :
                                     'Monedero electrónico',
                              description: optionType === 'refund' ? 'Devolver el dinero al cliente' :
                                          optionType === 'other_branch' ? 'Buscar el producto en otra sucursal del grupo' :
                                          'Devolver el saldo al monedero para usar en futuras compras',
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="wallet">Monedero electrónico</option>
                          <option value="other_branch">Buscar en otra sucursal</option>
                          <option value="refund">Devolución</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Botones de acción */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Guardando...' : 'Guardar y continuar'}
            </button>
          </div>
        </div>
      </div>
    </LocalLayout>
  );
}

