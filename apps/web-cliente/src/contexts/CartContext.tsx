/**
 * Contexto del carrito de compras
 * Maneja el estado del carrito y las animaciones
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { cartService, Cart, CartItem } from '@/lib/cart';
import { useAuth } from './AuthContext';

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  itemCount: number;
  isAnimating: boolean;
  addItem: (productId: string, quantity: number, variantSelections?: Record<string, string | string[]>, specialInstructions?: string) => Promise<void>;
  updateItem: (itemId: string, quantity: number, specialInstructions?: string) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  triggerAnimation: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]); // loadCart es estable (useCallback sin dependencias)

  const loadCart = React.useCallback(async () => {
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
    // Reproducir sonido
    playAddToCartSound();
    // Resetear animación después de 600ms
    setTimeout(() => {
      setIsAnimating(false);
    }, 600);
  };

  const playAddToCartSound = () => {
    try {
      // Crear un sonido simple usando Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Frecuencia agradable (nota musical)
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      // Volumen (suave)
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      // Duración corta
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      // Si falla el audio, no hacer nada (algunos navegadores pueden bloquearlo)
      console.log('No se pudo reproducir sonido');
    }
  };

  const addItem = async (
    productId: string,
    quantity: number,
    variantSelections?: Record<string, string | string[]>,
    specialInstructions?: string
  ) => {
    try {
      const updatedCart = await cartService.addItem({
        productId,
        quantity,
        variantSelections,
        specialInstructions,
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

  const refreshCart = React.useCallback(async () => {
    await loadCart();
  }, [loadCart]);

  // Calcular itemCount: usar totalQuantity si existe, sino sumar quantity de todos los items
  const itemCount = React.useMemo(() => {
    if (!cart) return 0;
    // El backend retorna totalQuantity en la respuesta
    if (cart.totalQuantity !== undefined && cart.totalQuantity !== null) {
      return cart.totalQuantity;
    }
    // Fallback: calcular desde items
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

