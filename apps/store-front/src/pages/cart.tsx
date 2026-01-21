/**
 * Página de carrito de compras - Contexto Global
 */

import React, { useEffect, useState, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import StoreLayout from '@/components/layout/StoreLayout';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { CartItem, TaxBreakdown } from '@/lib/cart';
import { productsService, Product } from '@/lib/products';
import { taxesService } from '@/lib/taxes';
import { branchesService, BranchTaxSettings } from '@/lib/branches';
import TaxBreakdownComponent from '@/components/TaxBreakdown';
import ContextualLink from '@/components/ContextualLink';
import { useStoreRouting } from '@/hooks/useStoreRouting';
import { formatPrice } from '@/lib/format';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

const DEFAULT_BRANCH_TAX_SETTINGS: BranchTaxSettings = {
  included_in_price: false,
  display_tax_breakdown: true,
  show_tax_included_label: true,
};

export default function CartPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { cart, loading, updateItem, removeItem, clearCart, refreshCart } = useCart();
  const { getCheckoutUrl } = useStoreRouting();
  const [productsData, setProductsData] = useState<Record<string, Product>>({});
  const [itemsTaxBreakdowns, setItemsTaxBreakdowns] = useState<Record<string, TaxBreakdown>>({});
  const [branchTaxSettings, setBranchTaxSettings] = useState<Record<string, BranchTaxSettings>>({});
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const getBranchSettings = (businessId: string) =>
    branchTaxSettings[businessId] || DEFAULT_BRANCH_TAX_SETTINGS;

  // No redirigir automáticamente - permitir ver carrito sin login
  // Solo requerir login al proceder al checkout

  // Cargar información de productos
  useEffect(() => {
    if (cart && cart.items && cart.items.length > 0) {
      const loadProducts = async () => {
        const productIds = Array.from(new Set(cart.items.map(item => item.product_id)));
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
      };

      loadProducts();
    }
  }, [cart]);

  // Cargar configuracion de impuestos por sucursal
  useEffect(() => {
    if (cart && cart.items && cart.items.length > 0) {
      const loadBranchSettings = async () => {
        try {
          const uniqueBusinessIds = Array.from(
            new Set(
              cart.items
                .map((item: CartItem) => item.branch_id || item.business_id)
                .filter((id): id is string => !!id)
            )
          );

          if (uniqueBusinessIds.length === 0) {
            setBranchTaxSettings({});
            return;
          }

          const settingsEntries = await Promise.all(
            uniqueBusinessIds.map(async (businessId) => {
              const settings = await branchesService.getBranchTaxSettings(businessId);
              return [businessId, settings || DEFAULT_BRANCH_TAX_SETTINGS] as const;
            })
          );

          const settingsMap: Record<string, BranchTaxSettings> = {};
          settingsEntries.forEach(([businessId, settings]) => {
            settingsMap[businessId] = settings;
          });
          setBranchTaxSettings(settingsMap);
        } catch (error) {
          console.warn('[Cart] No se pudo cargar la configuracion de impuestos por sucursal:', error);
          setBranchTaxSettings({});
        }
      };

      loadBranchSettings();
    } else {
      setBranchTaxSettings({});
    }
  }, [cart]);

  // Calcular impuestos
  useEffect(() => {
    if (cart && cart.items && cart.items.length > 0) {
      const calculateTaxes = async () => {
        const taxBreakdowns: Record<string, TaxBreakdown> = {};
        
        await Promise.all(
          cart.items.map(async (item: CartItem) => {
            try {
              const subtotal = parseFloat(String(item.item_subtotal || 0));
              const businessId = item.branch_id || item.business_id || '';
              const taxSettings = branchTaxSettings[businessId] || DEFAULT_BRANCH_TAX_SETTINGS;

              if (taxSettings.included_in_price) {
                taxBreakdowns[item.id] = { taxes: [], total_tax: 0 };
                return;
              }

              const taxBreakdown = await taxesService.calculateProductTaxes(item.product_id, subtotal);
              taxBreakdowns[item.id] = taxBreakdown;
            } catch (error) {
              taxBreakdowns[item.id] = { taxes: [], total_tax: 0 };
            }
          })
        );
        
        setItemsTaxBreakdowns(taxBreakdowns);
      };
      
      calculateTaxes();
    } else {
      setItemsTaxBreakdowns({});
    }
  }, [cart, branchTaxSettings]);

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      await removeItem(itemId);
    } else {
      try {
        await updateItem(itemId, newQuantity);
      } catch (error: any) {
        alert(error.message || 'Error al actualizar cantidad');
      }
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (confirm('¿Eliminar este producto del carrito?')) {
      await removeItem(itemId);
    }
  };

  const handleClearCart = async () => {
    if (confirm('¿Vaciar todo el carrito?')) {
      await clearCart();
    }
  };

  // Agrupar items por tienda/sucursal
  const itemsByStore = useMemo(() => {
    if (!cart || !cart.items) return {};
    
    const grouped: Record<string, CartItem[]> = {};
    cart.items.forEach((item) => {
      const storeKey = item.branch_id || item.business_id || 'unknown';
      if (!grouped[storeKey]) {
        grouped[storeKey] = [];
      }
      grouped[storeKey].push(item);
    });
    
    return grouped;
  }, [cart]);

  // Obtener información de cada tienda
  const storesInfo = useMemo(() => {
    const stores: Record<string, { name: string; items: CartItem[] }> = {};
    Object.entries(itemsByStore).forEach(([businessId, items]) => {
      if (items.length > 0) {
        stores[businessId] = {
          name: items[0].business_name || 'Tienda desconocida',
          items,
        };
      }
    });
    return stores;
  }, [itemsByStore]);

  // Calcular subtotales por tienda
  const subtotalsByStore = useMemo(() => {
    const subtotals: Record<string, number> = {};
    Object.entries(storesInfo).forEach(([businessId, store]) => {
      subtotals[businessId] = store.items.reduce(
        (sum, item) => sum + parseFloat(String(item.item_subtotal || 0)),
        0
      );
    });
    return subtotals;
  }, [storesInfo]);

  // Calcular impuestos por tienda
  const taxesByStore = useMemo(() => {
    const taxes: Record<string, number> = {};
    Object.entries(storesInfo).forEach(([businessId, store]) => {
      taxes[businessId] = store.items.reduce((sum, item) => {
        const breakdown = itemsTaxBreakdowns[item.id];
        return sum + (breakdown?.total_tax || 0);
      }, 0);
    });
    return taxes;
  }, [storesInfo, itemsTaxBreakdowns]);

  // Etiquetas desactivadas (las opciones de etiqueta/desglose no se usan)
  const hasIncludedTaxLabels = false;

  const subtotal = useMemo(() => {
    return Object.values(subtotalsByStore).reduce((sum, storeSubtotal) => sum + storeSubtotal, 0);
  }, [subtotalsByStore]);

  const totalTax = useMemo(() => {
    return Object.values(taxesByStore).reduce((sum, storeTax) => sum + storeTax, 0);
  }, [taxesByStore]);

  // El costo de envío se calculará en el checkout según la dirección de entrega
  // Por ahora no incluimos el envío en el total del carrito
  const total = subtotal + totalTax;

  if (loading) {
    return (
      <StoreLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Cargando carrito...</p>
        </div>
      </StoreLayout>
    );
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <>
        <Head>
          <title>Carrito - Agora</title>
        </Head>
        <StoreLayout>
          <div className="text-center py-12">
            <h1 className="text-2xl font-medium text-gray-900 mb-4">Tu carrito está vacío</h1>
            <p className="text-gray-600 mb-6">
              {!isAuthenticated 
                ? 'Inicia sesión o regístrate para agregar productos al carrito'
                : 'Agrega productos para comenzar'
              }
            </p>
            {!isAuthenticated ? (
              <div className="flex gap-3 justify-center">
                <ContextualLink href="/auth/login" className="px-6 py-3 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors inline-block">
                  Iniciar Sesión
                </ContextualLink>
                <ContextualLink href="/auth/register" className="px-6 py-3 bg-gray-100 text-black rounded-lg hover:bg-gray-200 transition-colors inline-block">
                  Registrarse
                </ContextualLink>
              </div>
            ) : (
              <ContextualLink href="/products" className="px-6 py-3 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors inline-block">
                Ver Productos
              </ContextualLink>
            )}
          </div>
        </StoreLayout>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Carrito - Agora</title>
      </Head>
      <StoreLayout>
        <div className="max-w-7xl mx-auto pt-6">
          <h1 className="text-3xl font-medium text-gray-900 mb-8">Carrito de Compras</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Items del carrito - Columna izquierda (2/3) */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {Object.entries(storesInfo).map(([businessId, store], storeIndex) => {
                  const storeSettings = getBranchSettings(businessId);
                  return (
                    <div
                      key={businessId}
                      className={storeIndex > 0 ? 'border-t-2 border-gray-300' : ''}
                    >
                      {/* Encabezado de la tienda */}
                      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-lg font-medium text-gray-900">{store.name}</h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                              {store.items.length} {store.items.length === 1 ? 'producto' : 'productos'}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-2" />
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Subtotal de tienda</p>
                            <p className="text-lg font-medium text-gray-900">
                              {formatPrice(subtotalsByStore[businessId] || 0)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Items de esta tienda */}
                      {store.items.map((item: CartItem) => {
                        const itemTaxBreakdown = itemsTaxBreakdowns[item.id];
                        const shouldShowTaxBreakdown = false; // Desglose desactivado globalmente

                        return (
                          <div
                            key={item.id}
                            className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
                          >
                            <div className="p-6">
                              <div className="flex gap-6">
                                {/* Imagen del producto */}
                                <div className="flex-shrink-0">
                                  <div className="w-32 h-32 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center border border-gray-200">
                                    {item.product_image_url && !imageErrors[item.id] ? (
                                      <img
                                        src={item.product_image_url}
                                        alt={item.product_name}
                                        className="w-full h-full object-contain p-2"
                                        onError={() => {
                                          setImageErrors((prev) => ({ ...prev, [item.id]: true }));
                                        }}
                                      />
                                    ) : (
                                      <svg
                                        className="w-16 h-16 text-gray-300"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={1.5}
                                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                        />
                                      </svg>
                                    )}
                                  </div>
                                </div>

                                {/* Informaci?n del producto */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-normal text-lg text-gray-900 mb-2 leading-tight">
                                        {item.product_name}
                                      </h3>
                                      {item.product_description && (
                                        <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                                          {item.product_description}
                                        </p>
                                      )}
                                      <div className="flex items-center gap-4">
                                        <div>
                                          <span className="text-xs text-gray-500 uppercase tracking-wide">
                                            Precio unitario
                                          </span>
                                          <p className="text-base font-normal text-gray-700 mt-0.5">
                                            {formatPrice(parseFloat(String(item.unit_price || 0)))}
                                          </p>
                                        </div>
                                        <div>
                                          <span className="text-xs text-gray-500 uppercase tracking-wide">
                                            Subtotal
                                          </span>
                                          <p className="text-lg font-normal text-gray-900 mt-0.5">
                                            {formatPrice(parseFloat(String(item.item_subtotal || 0)))}
                                          </p>
                                        </div>
                                      </div>
                                      {shouldShowTaxBreakdown && (
                                        <div className="mt-2">
                                          <TaxBreakdownComponent taxBreakdown={itemTaxBreakdown} compact />
                                        </div>
                                      )}
                                    </div>

                                    {/* Controles de cantidad y eliminar */}
                                    <div className="flex flex-col items-end gap-4">
                                      <button
                                        onClick={() => handleRemoveItem(item.id)}
                                        className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50"
                                        title="Eliminar producto"
                                      >
                                        <DeleteIcon className="w-5 h-5" />
                                      </button>

                                      <div className="flex flex-col items-end gap-2">
                                        <span className="text-xs text-gray-500 uppercase tracking-wide">
                                          Cantidad
                                        </span>
                                        <div className="flex items-center gap-3 border border-gray-200 rounded-lg p-1 bg-white">
                                          <button
                                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                            className="w-8 h-8 rounded flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
                                            aria-label="Disminuir cantidad"
                                          >
                                            <RemoveIcon className="w-4 h-4" />
                                          </button>
                                          <span className="w-10 text-center font-normal text-gray-900 text-base">
                                            {item.quantity}
                                          </span>
                                          <button
                                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                            className="w-8 h-8 rounded flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
                                            aria-label="Aumentar cantidad"
                                          >
                                            <AddIcon className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Resumen de la tienda */}
                      {Object.keys(storesInfo).length > 1 && (
                        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Subtotal {store.name}:</span>
                            <span className="font-medium text-gray-900">
                              {formatPrice(subtotalsByStore[businessId] || 0)}
                            </span>
                          </div>
                          {taxesByStore[businessId] > 0 && (
                            <div className="flex justify-between items-center text-sm mt-1">
                              <span className="text-gray-600">Impuestos {store.name}:</span>
                              <span className="font-medium text-gray-900">
                                {formatPrice(taxesByStore[businessId] || 0)}
                              </span>
                            </div>
                          )}
                          {/* Sin etiquetas ni desgloses por configuración desactivada */}
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Nota sobre múltiples tiendas */}
                {Object.keys(storesInfo).length > 1 && (
                  <div className="bg-blue-50 border-t-2 border-blue-200 px-6 py-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900 mb-1">
                          Productos de múltiples tiendas
                        </p>
                        <p className="text-xs text-blue-700">
                          Tu pedido contiene productos de {Object.keys(storesInfo).length} {Object.keys(storesInfo).length === 1 ? 'tienda' : 'tiendas diferentes'}. 
                          Es posible que se generen costos de envío adicionales o que el pedido se divida en múltiples entregas.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Resumen - Columna derecha (1/3) */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
                <h2 className="text-xl font-normal text-gray-900 mb-6">Resumen del Pedido</h2>
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-900 font-normal">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">Impuestos</span>
                    <span className="text-gray-900 font-normal">{formatPrice(totalTax)}</span>
                  </div>
                  {hasIncludedTaxLabels && totalTax === 0 && (
                    <p className="text-xs text-gray-500 -mt-2">
                      Los precios ya incluyen impuestos para al menos una tienda.
                    </p>
                  )}
                  <div className="flex justify-between items-start py-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Envío</span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <span className="text-xs text-gray-500 mt-1 block">
                        Se calculará al finalizar la compra
                      </span>
                    </div>
                    <span className="text-gray-400 text-sm font-normal">—</span>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-900">Total</span>
                    <span className="text-2xl font-medium text-gray-900">{formatPrice(total)}</span>
                  </div>
                </div>

                {/* Acciones */}
                <div className="space-y-3">
                  {isAuthenticated ? (
                    <ContextualLink
                      href={getCheckoutUrl()}
                      className="block w-full px-6 py-3 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors text-center font-normal shadow-md hover:shadow-lg"
                    >
                      Proceder al Pago
                    </ContextualLink>
                  ) : (
                    <ContextualLink
                      href={getCheckoutUrl()}
                      className="block w-full px-6 py-3 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors text-center font-normal shadow-md hover:shadow-lg"
                    >
                      Proceder a la compra
                    </ContextualLink>
                  )}
                  <ContextualLink
                    href="/products"
                    className="block w-full px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all text-center font-normal"
                  >
                    Seguir Comprando
                  </ContextualLink>
                  {isAuthenticated && (
                    <button
                      onClick={handleClearCart}
                      className="w-full px-6 py-3 text-gray-600 hover:text-red-600 hover:bg-red-50 transition-all rounded-lg font-normal border border-transparent hover:border-red-200"
                    >
                      Vaciar Carrito
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </StoreLayout>
    </>
  );
}

