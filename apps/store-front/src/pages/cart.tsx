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
import TaxBreakdownComponent from '@/components/TaxBreakdown';
import ContextualLink from '@/components/ContextualLink';
import { useStoreRouting } from '@/hooks/useStoreRouting';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

export default function CartPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { cart, loading, updateItem, removeItem, clearCart, refreshCart } = useCart();
  const { getCheckoutUrl } = useStoreRouting();
  const [productsData, setProductsData] = useState<Record<string, Product>>({});
  const [itemsTaxBreakdowns, setItemsTaxBreakdowns] = useState<Record<string, TaxBreakdown>>({});

  // No redirigir automáticamente - permitir ver carrito sin login
  // Solo requerir login al proceder al checkout

  // Cargar información de productos
  useEffect(() => {
    if (cart && cart.items && cart.items.length > 0) {
      const loadProducts = async () => {
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
      };
      
      loadProducts();
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
    }
  }, [cart]);

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

  const subtotal = useMemo(() => {
    if (!cart || !cart.items) return 0;
    return cart.items.reduce((sum, item) => sum + parseFloat(String(item.item_subtotal || 0)), 0);
  }, [cart]);

  const totalTax = useMemo(() => {
    return Object.values(itemsTaxBreakdowns).reduce((sum, breakdown) => sum + (breakdown.total_tax || 0), 0);
  }, [itemsTaxBreakdowns]);

  const deliveryFee = 0; // TODO: Calcular según distancia
  const total = subtotal + totalTax + deliveryFee;

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
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Tu carrito está vacío</h1>
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
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Carrito de Compras</h1>

          {/* Items del carrito */}
          <div className="bg-white rounded-lg shadow-sm mb-6">
            {cart.items.map((item: CartItem) => (
              <div key={item.id} className="border-b border-gray-200 last:border-b-0 p-6">
                <div className="flex gap-4">
                  {item.product_image_url && (
                    <img
                      src={item.product_image_url}
                      alt={item.product_name}
                      className="w-24 h-24 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{item.product_name}</h3>
                    {item.product_description && (
                      <p className="text-sm text-gray-600 mb-2">{item.product_description}</p>
                    )}
                    <p className="text-lg font-bold text-black mb-2">
                      {formatPrice(parseFloat(String(item.item_subtotal || 0)))}
                    </p>
                    {itemsTaxBreakdowns[item.id] && (
                      <TaxBreakdownComponent taxBreakdown={itemsTaxBreakdowns[item.id]} compact />
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <DeleteIcon />
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                        className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                      >
                        <RemoveIcon className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                        className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                      >
                        <AddIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Resumen */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Resumen</h2>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Impuestos</span>
                <span>{formatPrice(totalTax)}</span>
              </div>
              <div className="flex justify-between">
                <span>Envío</span>
                <span>{formatPrice(deliveryFee)}</span>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">Total</span>
                <span className="text-2xl font-bold">{formatPrice(total)}</span>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-3">
            <ContextualLink
              href="/products"
              className="flex-1 px-6 py-3 bg-gray-100 text-black rounded-lg hover:bg-gray-200 transition-colors text-center font-medium"
            >
              Seguir Comprando
            </ContextualLink>
            {isAuthenticated && (
              <button
                onClick={handleClearCart}
                className="px-6 py-2 text-red-500 hover:text-red-700 transition-colors font-medium"
              >
                Vaciar Carrito
              </button>
            )}
            {isAuthenticated ? (
              <ContextualLink
                href={getCheckoutUrl()}
                className="flex-1 px-6 py-3 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors text-center font-medium"
              >
                Proceder al Pago
              </ContextualLink>
            ) : (
              <ContextualLink
                href="/auth/login"
                className="flex-1 px-6 py-3 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors text-center font-medium"
              >
                Iniciar Sesión para Comprar
              </ContextualLink>
            )}
          </div>
        </div>
      </StoreLayout>
    </>
  );
}

