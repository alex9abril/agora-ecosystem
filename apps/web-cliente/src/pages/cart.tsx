/**
 * Página de carrito de compras
 */

import React, { useEffect, useState, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MobileLayout from '@/components/layout/MobileLayout';
import { useI18n } from '@/contexts/I18nContext';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { CartItem, TaxBreakdown } from '@/lib/cart';
import { productsService, Product, ProductVariantGroup, ProductVariant } from '@/lib/products';
import { taxesService } from '@/lib/taxes';
import TaxBreakdownComponent from '@/components/TaxBreakdown';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function CartPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { cart, loading, updateItem, removeItem, clearCart, refreshCart } = useCart();
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const [productsData, setProductsData] = useState<Record<string, Product>>({});
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [itemsTaxBreakdowns, setItemsTaxBreakdowns] = useState<Record<string, TaxBreakdown>>({});
  const [loadingTaxes, setLoadingTaxes] = useState(false);

  // Redirigir a login si no está autenticado
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  // Recargar carrito al entrar a la página (solo una vez cuando se monta y está autenticado)
  useEffect(() => {
    if (isAuthenticated && !loading && !hasLoaded) {
      refreshCart().then(() => {
        setHasLoaded(true);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, loading]); // Solo cuando cambia isAuthenticated o loading

  // Cargar información de productos para obtener nombres de variantes
  useEffect(() => {
    if (cart && cart.items && cart.items.length > 0) {
      const loadProducts = async () => {
        setLoadingProducts(true);
        try {
          const productIds = [...new Set(cart.items.map(item => item.product_id))];
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
  }, [cart]);

  // Calcular impuestos para cada item del carrito
  useEffect(() => {
    if (cart && cart.items && cart.items.length > 0) {
      const calculateTaxes = async () => {
        setLoadingTaxes(true);
        try {
          const taxBreakdowns: Record<string, TaxBreakdown> = {};
          
          await Promise.all(
            cart.items.map(async (item: CartItem) => {
              try {
                const subtotal = parseFloat(String(item.item_subtotal || 0));
                const taxBreakdown = await taxesService.calculateProductTaxes(item.product_id, subtotal);
                taxBreakdowns[item.id] = taxBreakdown;
              } catch (error) {
                console.error(`Error calculando impuestos para item ${item.id}:`, error);
                taxBreakdowns[item.id] = { taxes: [], total_tax: 0 };
              }
            })
          );
          
          setItemsTaxBreakdowns(taxBreakdowns);
        } catch (error) {
          console.error('Error calculando impuestos:', error);
        } finally {
          setLoadingTaxes(false);
        }
      };
      
      calculateTaxes();
    }
  }, [cart]);

  // Función helper para obtener el nombre de una variante
  const getVariantName = (productId: string, variantId: string): string | null => {
    const product = productsData[productId];
    if (!product || !product.variant_groups) return null;
    
    for (const group of product.variant_groups) {
      const variant = group.variants.find(v => v.variant_id === variantId);
      if (variant) {
        return variant.variant_name;
      }
    }
    return null;
  };

  // Función helper para obtener el nombre de un grupo de variantes
  const getVariantGroupName = (productId: string, groupId: string): string | null => {
    const product = productsData[productId];
    if (!product || !product.variant_groups) return null;
    
    const group = product.variant_groups.find(g => g.variant_group_id === groupId);
    return group ? group.variant_group_name : null;
  };

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
    if (confirm('¿Estás seguro de que quieres eliminar este producto del carrito?')) {
      try {
        await removeItem(itemId);
      } catch (error: any) {
        alert(error.message || 'Error al eliminar producto');
      }
    }
  };

  const handleClearCart = async () => {
    if (confirm('¿Estás seguro de que quieres vaciar el carrito?')) {
      try {
        await clearCart();
      } catch (error: any) {
        alert(error.message || 'Error al vaciar carrito');
      }
    }
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">{t('common.loading')}</p>
        </div>
      </MobileLayout>
    );
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <>
        <Head>
          <title>Carrito - Localia</title>
        </Head>
        <MobileLayout>
          <div className="text-center py-12">
            <div className="mb-6">
              <RestaurantIcon className="text-6xl text-gray-300 mx-auto mb-4" />
            </div>
            <h1 className="text-2xl font-bold text-black mb-2">Carrito de Compras</h1>
            <p className="text-gray-500 mb-6">Tu carrito está vacío</p>
            <button
              onClick={() => router.push('/stores')}
              className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
              Explorar Tiendas
            </button>
          </div>
        </MobileLayout>
      </>
    );
  }

  const subtotal = parseFloat(cart.subtotal || '0');
  // Calcular total de impuestos sumando los impuestos de cada item
  const totalTax = Object.values(itemsTaxBreakdowns).reduce(
    (sum, breakdown) => sum + (breakdown?.total_tax || 0),
    0
  );
  const deliveryFee = 0; // Costo de envío (puede calcularse después)
  const total = subtotal + totalTax + deliveryFee;

  return (
    <>
      <Head>
        <title>Carrito - Localia</title>
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
            <h1 className="text-2xl font-bold text-black">Carrito de Compras</h1>
          </div>

          {/* Items del carrito */}
          <div className="space-y-3 mb-6">
            {cart.items.map((item: CartItem) => (
              <div
                key={item.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
              >
                <div className="flex gap-4">
                  {/* Imagen del producto */}
                  <div className="flex-shrink-0">
                    {item.product_image_url ? (
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
                        <img
                          src={item.product_image_url}
                          alt={item.product_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <RestaurantIcon className="text-3xl text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Información del producto */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base text-black mb-1 line-clamp-2">
                      {item.product_name}
                    </h3>
                    
                    {/* Variantes seleccionadas */}
                    {item.variant_selections && Object.keys(item.variant_selections).length > 0 && (
                      <div className="text-xs text-gray-600 mb-2">
                        {Object.entries(item.variant_selections).map(([groupId, variantIds]) => {
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

                    {/* Notas especiales */}
                    {item.special_instructions && (
                      <p className="text-xs text-gray-500 italic mb-2">
                        "{item.special_instructions}"
                      </p>
                    )}

                    {/* Impuestos del producto */}
                    {itemsTaxBreakdowns[item.id] && itemsTaxBreakdowns[item.id].total_tax > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <TaxBreakdownComponent
                          taxBreakdown={itemsTaxBreakdowns[item.id]}
                          showTotal={false}
                          compact={true}
                        />
                      </div>
                    )}

                    {/* Precio y cantidad */}
                    <div className="flex items-center justify-between mt-2">
                      <div>
                        <span className="text-lg font-bold text-black">
                          ${parseFloat(String(item.item_subtotal || 0)).toFixed(2)}
                        </span>
                        {itemsTaxBreakdowns[item.id] && itemsTaxBreakdowns[item.id].total_tax > 0 && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            + ${itemsTaxBreakdowns[item.id].total_tax.toFixed(2)} impuestos
                          </div>
                        )}
                      </div>
                      
                      {/* Controles de cantidad */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors"
                        >
                          <RemoveIcon className="w-4 h-4" />
                        </button>
                        <span className="text-base font-semibold w-8 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors"
                        >
                          <AddIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Botón eliminar */}
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="flex-shrink-0 p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    aria-label="Eliminar"
                  >
                    <DeleteIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Resumen del pedido */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <h2 className="text-lg font-bold text-black mb-4">Resumen del pedido</h2>
            
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-black font-medium">${subtotal.toFixed(2)}</span>
              </div>
              {totalTax > 0 && (
                <div className="space-y-1 pl-2 border-l-2 border-gray-200">
                  {Object.values(itemsTaxBreakdowns).flatMap(breakdown => 
                    breakdown?.taxes?.map(tax => (
                      <div key={tax.tax_type_id} className="flex justify-between text-xs">
                        <span className="text-gray-500">{tax.tax_name} ({(tax.rate * 100).toFixed(0)}%)</span>
                        <span className="text-gray-600">${tax.amount.toFixed(2)}</span>
                      </div>
                    )) || []
                  )}
                  <div className="flex justify-between text-sm pt-1 border-t border-gray-100 mt-1">
                    <span className="text-gray-600 font-medium">Total impuestos</span>
                    <span className="text-black font-medium">${totalTax.toFixed(2)}</span>
                  </div>
                </div>
              )}
              {deliveryFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Costo de envío</span>
                  <span className="text-black font-medium">${deliveryFee.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-black">Total</span>
                <span className="text-2xl font-bold text-black">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="space-y-3">
            <button
              onClick={() => router.push(`/stores/${cart.business_id}`)}
              className="w-full py-3 bg-gray-100 text-black rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Seguir Comprando
            </button>
            
            <button
              onClick={handleClearCart}
              className="w-full py-2 text-red-500 hover:text-red-700 transition-colors text-sm font-medium"
            >
              Vaciar Carrito
            </button>

            <button
              onClick={() => router.push('/checkout')}
              className="w-full py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
              Proceder al Pago
            </button>
          </div>
        </div>
      </MobileLayout>
    </>
  );
}
