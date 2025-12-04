/**
 * Contexto del carrito de compras
 * Maneja el estado del carrito guardado en la base de datos
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { cartService, Cart, CartItem } from '@/lib/cart';
import { useAuth } from './AuthContext';
import { useStoreContext } from './StoreContext';

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  itemCount: number;
  isAnimating: boolean;
  addItem: (productId: string, quantity: number, variantSelections?: Record<string, string | string[]>, specialInstructions?: string, branchId?: string) => Promise<void>;
  updateItem: (itemId: string, quantity: number, specialInstructions?: string) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  triggerAnimation: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { branchId } = useStoreContext();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Cargar carrito al iniciar o cuando se autentica
  useEffect(() => {
    if (isAuthenticated) {
      loadCart();
    } else {
      setCart(null);
    }
  }, [isAuthenticated]);

  const loadCart = useCallback(async () => {
    try {
      setLoading(true);
      const cartData = await cartService.getCart();
      console.log('🛒 Carrito cargado desde backend:', cartData);
      setCart(cartData);
    } catch (error) {
      console.error('Error cargando carrito:', error);
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerAnimation = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsAnimating(false);
    }, 600);
  };

  const addItem = async (
    productId: string,
    quantity: number,
    variantSelections?: Record<string, string | string[]>,
    specialInstructions?: string,
    branchId?: string
  ) => {
    try {
      const updatedCart = await cartService.addItem({
        productId,
        quantity,
        variantSelections,
        specialInstructions,
        branchId,
      });
      setCart(updatedCart);
      triggerAnimation();
    } catch (error) {
      console.error('Error agregando item al carrito:', error);
      throw error;
    }
  };

  const updateItem = async (itemId: string, quantity: number, specialInstructions?: string) => {
    try {
      const updatedCart = await cartService.updateItem(itemId, quantity, specialInstructions);
      setCart(updatedCart);
    } catch (error) {
      console.error('Error actualizando item del carrito:', error);
      throw error;
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      const updatedCart = await cartService.removeItem(itemId);
      setCart(updatedCart);
    } catch (error) {
      console.error('Error eliminando item del carrito:', error);
      throw error;
    }
  };

  const clearCart = async () => {
    try {
      await cartService.clearCart();
      setCart(null);
    } catch (error) {
      console.error('Error vaciando carrito:', error);
      throw error;
    }
  };

  const refreshCart = useCallback(async () => {
    await loadCart();
  }, [loadCart]);

  // Calcular itemCount
  const itemCount = React.useMemo(() => {
    if (!cart) return 0;
    if (cart.totalQuantity !== undefined && cart.totalQuantity !== null) {
      return cart.totalQuantity;
    }
    if (cart.items && Array.isArray(cart.items) && cart.items.length > 0) {
      return cart.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    }
    return 0;
  }, [cart]);

  const value: CartContextType = {
    cart,
    loading,
    itemCount,
    isAnimating,
    addItem,
    updateItem,
    removeItem,
    clearCart,
    refreshCart,
    triggerAnimation,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart debe usarse dentro de un CartProvider');
  }
  return context;
}

