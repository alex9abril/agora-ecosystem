/**
 * Contexto del carrito de compras
 * Maneja el estado del carrito guardado en la base de datos
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { cartService, Cart, CartItem, TaxBreakdown } from '@/lib/cart';
import { guestCartService, GuestCart } from '@/lib/guest-cart';
import { useAuth } from './AuthContext';
import { useStoreContext } from './StoreContext';
import { branchesService, BranchTaxSettings } from '@/lib/branches';
import { taxesService } from '@/lib/taxes';

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  itemCount: number;
  isAnimating: boolean;
  addItem: (productId: string, quantity: number, variantSelections?: Record<string, string | string[]>, specialInstructions?: string, branchId?: string, businessId?: string) => Promise<void>;
  updateItem: (itemId: string, quantity: number, specialInstructions?: string) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  triggerAnimation: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { branchId, contextType } = useStoreContext();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Enriquecer items con impuestos calculados si no vienen desde backend
  const enrichCartWithTaxes = useCallback(async (cartData: Cart | null): Promise<Cart | null> => {
    if (!cartData || !cartData.items || cartData.items.length === 0) return cartData;

    // Obtener sucursales Ãºnicas del carrito
    const uniqueBranchIds = Array.from(
      new Set(
        cartData.items
          .map((item) => item.branch_id || item.business_id)
          .filter((id): id is string => !!id)
      )
    );

    // Cargar configuraciÃ³n de impuestos por sucursal
    const branchSettings: Record<string, BranchTaxSettings> = {};
    await Promise.all(
      uniqueBranchIds.map(async (id) => {
        try {
          branchSettings[id] = await branchesService.getBranchTaxSettings(id);
        } catch {
          // Si falla, dejar sin configuraciÃ³n para usar fallback
        }
      })
    );

    const enrichedItems = await Promise.all(
      cartData.items.map(async (item) => {
        // Si ya trae desglose, mantenerlo
        if (item.tax_breakdown && item.tax_breakdown.total_tax !== undefined) {
          return item;
        }

        const businessId = item.branch_id || item.business_id || '';
        const settings = branchSettings[businessId];
        const subtotal = parseFloat(String(item.item_subtotal || 0));

        // Si la sucursal marca precios con impuestos incluidos, asumir 0 adicional
        if (settings?.included_in_price) {
          const emptyBreakdown: TaxBreakdown = { taxes: [], total_tax: 0 };
          return { ...item, tax_breakdown: emptyBreakdown };
        }

        try {
          const taxBreakdown = await taxesService.calculateProductTaxes(item.product_id, subtotal);
          return { ...item, tax_breakdown: taxBreakdown };
        } catch {
          const emptyBreakdown: TaxBreakdown = { taxes: [], total_tax: 0 };
          return { ...item, tax_breakdown: emptyBreakdown };
        }
      })
    );

    return { ...cartData, items: enrichedItems };
  }, []);

  const loadCart = useCallback(async () => {
    try {
      setLoading(true);
      const cartData = await cartService.getCart();
      console.log('🛒 Carrito cargado desde backend:', cartData);
      if (cartData && cartData.items) {
        // Log para debugging de imágenes
        console.log('🖼️ [loadCart] Carrito cargado con imágenes:', {
          itemsCount: cartData.items.length,
          itemsWithImages: cartData.items.filter(item => item.product_image_url).length,
          items: cartData.items.map(item => ({
            id: item.id,
            product_name: item.product_name,
            product_image_url: item.product_image_url,
            hasImage: !!item.product_image_url,
          })),
        });
      }
      const enriched = await enrichCartWithTaxes(cartData);
      setCart(enriched);
    } catch (error: any) {
      console.error('Error cargando carrito:', error);
      if (error.statusCode === 404) {
        setCart(null);
      }
    } finally {
      setLoading(false);
    }
  }, [enrichCartWithTaxes]);

  const migrateGuestCart = useCallback(async () => {
    try {
      // Verificar que el token esté disponible
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (!token) {
        console.warn('⚠️ [migrateGuestCart] No hay token disponible, esperando...');
        // Reintentar después de un momento
        setTimeout(() => migrateGuestCart(), 1000);
        return;
      }

      const guestCart = guestCartService.getCart();
      console.log('🔄 [migrateGuestCart] Iniciando migración. Items en carrito de invitado:', guestCart.items.length);
      
      if (guestCart.items.length === 0) {
        console.log('✅ [migrateGuestCart] No hay items para migrar');
        return;
      }

      // Guardar una copia del carrito antes de limpiarlo (por si acaso)
      const itemsToMigrate = [...guestCart.items];
      console.log('📦 [migrateGuestCart] Items a migrar:', itemsToMigrate.length);

      // Migrar cada item del carrito de invitado a la BD
      let successCount = 0;
      let errorCount = 0;
      
      for (const item of itemsToMigrate) {
        try {
          // Validar que productId sea un UUID válido
          if (!item.productId || typeof item.productId !== 'string') {
            console.error('❌ [migrateGuestCart] productId inválido:', {
              productId: item.productId,
              type: typeof item.productId,
              item: item,
            });
            errorCount++;
            continue;
          }

          // Validar formato UUID básico (debe tener guiones y longitud correcta)
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(item.productId)) {
            console.error('❌ [migrateGuestCart] productId no es un UUID válido:', {
              productId: item.productId,
              item: item,
            });
            errorCount++;
            continue;
          }

          console.log('🔄 [migrateGuestCart] Migrando item:', {
            productId: item.productId,
            quantity: item.quantity,
            branchId: item.branchId,
            productIdType: typeof item.productId,
            productIdLength: item.productId?.length,
          });
          
          // Obtener businessId del producto si no está en el item
          let businessIdToUse = item.businessId;
          if (!businessIdToUse && item.branchId) {
            // Si hay branchId, ese ES el business_id
            businessIdToUse = item.branchId;
          }
          
          await cartService.addItem({
            productId: item.productId.trim(), // Asegurar que no haya espacios
            quantity: item.quantity,
            variantSelections: item.variantSelections,
            specialInstructions: item.specialInstructions,
            branchId: item.branchId,
          });
          
          successCount++;
          console.log('✅ [migrateGuestCart] Item migrado exitosamente');
        } catch (error: any) {
          errorCount++;
          console.error('❌ [migrateGuestCart] Error migrando item:', {
            productId: item.productId,
            productIdType: typeof item.productId,
            productIdValue: JSON.stringify(item.productId),
            error: error.message || error,
            errorResponse: error.response || error.data,
          });
          // Continuar con los demás items aunque uno falle
        }
      }

      console.log(`📊 [migrateGuestCart] Migración completada: ${successCount} exitosos, ${errorCount} errores`);

      // Solo limpiar el carrito de invitado si al menos un item se migró exitosamente
      if (successCount > 0) {
        guestCartService.clearCart();
        console.log('✅ [migrateGuestCart] Carrito de invitado limpiado');
      } else {
        console.warn('⚠️ [migrateGuestCart] No se migró ningún item, manteniendo carrito de invitado');
      }
      
      // Recargar carrito desde BD
      await loadCart();
      console.log('✅ [migrateGuestCart] Carrito recargado desde BD');
    } catch (error: any) {
      console.error('❌ [migrateGuestCart] Error general en migración:', error);
      // No limpiar el carrito de invitado si hay un error general
    }
  }, [loadCart]);

  const loadGuestCart = useCallback(async () => {
    try {
      const guestCart = guestCartService.getCart();
      console.log('🛒 [loadGuestCart] Carrito de invitado:', guestCart);
      
      if (guestCart.items.length === 0) {
        setCart(null);
        return;
      }

      // Convertir GuestCart a formato Cart para compatibilidad
      // Necesitamos cargar información de productos para mostrar en el carrito
      const { productsService } = await import('@/lib/products');
      
      const cartItems: CartItem[] = await Promise.all(
        guestCart.items.map(async (item, index) => {
          try {
            // Cargar información del producto
            // Si hay branchId, cargar con ese branchId para obtener precio específico
            const product = await productsService.getProduct(item.productId, item.branchId);
            console.log('🖼️ [loadGuestCart] Producto cargado:', {
              productId: item.productId,
              name: product.name,
              image_url: product.image_url,
              primary_image_url: product.primary_image_url,
            });
            
            // Si no hay primary_image_url, intentar cargar las imágenes del producto
            let productImageUrl = product.primary_image_url || product.image_url;
            if (!productImageUrl) {
              try {
                const images = await productsService.getProductImages(item.productId);
                console.log('🖼️ [loadGuestCart] Imágenes cargadas:', images);
                if (images && images.length > 0) {
                  // Buscar la imagen principal, o usar la primera
                  const primaryImage = images.find(img => img.is_primary && img.is_active) || images.find(img => img.is_active);
                  if (primaryImage) {
                    productImageUrl = primaryImage.public_url;
                    console.log('✅ [loadGuestCart] Usando imagen principal:', productImageUrl);
                  }
                }
              } catch (imageError) {
                console.error('⚠️ [loadGuestCart] Error cargando imágenes del producto:', imageError);
              }
            }
            
            // Determinar precio: usar branch_price si está disponible, sino usar price
            let unitPrice = product.price;
            if (item.branchId && product.branch_price !== undefined) {
              unitPrice = product.branch_price;
            }

            const cartItem: CartItem = {
              id: `guest-${item.productId}-${item.branchId || 'global'}-${index}`, // ID único para el item
              product_id: item.productId,
              quantity: item.quantity,
              unit_price: unitPrice,
              variant_price_adjustment: 0, // No calculamos ajustes de variantes en guest cart
              item_subtotal: unitPrice * item.quantity,
              variant_selections: item.variantSelections,
              special_instructions: item.specialInstructions,
              product_name: product.name,
              product_description: product.description || undefined,
              product_image_url: productImageUrl || undefined,
              product_is_available: product.is_available,
              business_id: item.businessId || item.branchId || product.business_id || 'unknown',
              business_name: 'Tienda', // Por ahora genérico, se puede mejorar cargando info de la sucursal
              // Guardar branchId en special_instructions temporalmente para poder recuperarlo después
              // O mejor, usar un campo personalizado (pero CartItem no lo tiene)
            };
            
            // Guardar el branchId en el localStorage del item para poder recuperarlo después
            // Usaremos el itemId como clave
            if (typeof window !== 'undefined' && item.branchId) {
              try {
                const branchIdKey = `cart_item_branch_${cartItem.id}`;
                localStorage.setItem(branchIdKey, item.branchId);
              } catch (e) {
                console.warn('No se pudo guardar branchId en localStorage:', e);
              }
            }
            
            console.log('✅ [loadGuestCart] Item del carrito creado:', {
              product_id: cartItem.product_id,
              product_image_url: cartItem.product_image_url,
            });
            
            return cartItem;
          } catch (error) {
            console.error(`Error cargando producto ${item.productId}:`, error);
            // Retornar un item básico si no se puede cargar el producto
            return {
              id: `guest-${item.productId}-${item.branchId || 'global'}-${index}`,
              product_id: item.productId,
              quantity: item.quantity,
              unit_price: 0,
              variant_price_adjustment: 0,
              item_subtotal: 0,
              variant_selections: item.variantSelections,
              special_instructions: item.specialInstructions,
              product_name: 'Producto no disponible',
              product_is_available: false,
              business_id: item.businessId || item.branchId || 'unknown',
              business_name: 'Tienda',
            } as CartItem;
          }
        })
      );

      // Calcular subtotal
      const subtotal = cartItems.reduce((sum, item) => sum + parseFloat(String(item.item_subtotal || 0)), 0);
      const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

      const cart: Cart = {
        id: 'guest-cart',
        user_id: 'guest',
        business_id: cartItems.length > 0 ? cartItems[0].business_id : undefined,
        created_at: guestCart.lastUpdated || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items: cartItems,
        subtotal: subtotal.toFixed(2),
        itemCount: totalQuantity,
        totalQuantity: totalQuantity,
      };

      console.log('✅ [loadGuestCart] Carrito convertido:', cart);
      const enriched = await enrichCartWithTaxes(cart);
      setCart(enriched);
    } catch (error) {
      console.error('❌ [loadGuestCart] Error cargando carrito de invitado:', error);
      setCart(null);
    }
  }, []);

  // Cargar carrito al iniciar o cuando se autentica
  useEffect(() => {
    if (isAuthenticated) {
      // Verificar que el token esté disponible antes de proceder
      const checkTokenAndMigrate = async () => {
        // Esperar a que el token esté disponible
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
          const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
          if (token) {
            console.log('✅ [CartContext] Token disponible, procediendo con carga y migración');
            // Primero cargar el carrito de la BD
            await loadCart();
            // Luego migrar el carrito de invitado si existe
            await migrateGuestCart();
            break;
          }
          attempts++;
          console.log(`⏳ [CartContext] Esperando token... intento ${attempts}/${maxAttempts}`);
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        if (attempts >= maxAttempts) {
          console.warn('⚠️ [CartContext] No se pudo obtener el token después de varios intentos');
          // Intentar cargar el carrito de todas formas
          await loadCart();
        }
      };
      
      checkTokenAndMigrate();
    } else {
      // Para invitados, cargar desde localStorage
      loadGuestCart();
    }
  }, [isAuthenticated, migrateGuestCart, loadCart, loadGuestCart]);

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
    branchId?: string,
    businessId?: string
  ) => {
    try {
      // Validar productId antes de proceder
      if (!productId || typeof productId !== 'string') {
        const error = new Error(`productId inválido: ${productId} (tipo: ${typeof productId})`);
        console.error('❌ [addItem]', error.message);
        throw error;
      }

      // Validar formato UUID básico
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const trimmedProductId = productId.trim();
      if (!uuidRegex.test(trimmedProductId)) {
        const error = new Error(`productId no es un UUID válido: "${productId}" (longitud: ${productId.length})`);
        console.error('❌ [addItem]', error.message);
        throw error;
      }

      console.log('🛒 [addItem] Agregando item al carrito:', {
        productId: trimmedProductId,
        productIdOriginal: productId,
        productIdType: typeof productId,
        quantity,
        branchId,
        businessId,
        isAuthenticated,
      });

      if (isAuthenticated) {
        // Usuario autenticado: guardar en BD
        const updatedCart = await cartService.addItem({
          productId: trimmedProductId,
          quantity,
          variantSelections,
          specialInstructions,
          branchId,
        });
        const enriched = await enrichCartWithTaxes(updatedCart);
        setCart(enriched);
      } else {
        // Invitado: guardar en localStorage
        // businessId: si hay branchId, ese ES el business_id; si no, usar el businessId pasado o undefined
        const businessIdToUse = branchId || businessId || undefined;
        console.log('🛒 [addItem] Agregando a carrito de invitado:', {
          productId: trimmedProductId,
          quantity,
          branchId,
          businessIdToUse,
        });
        guestCartService.addItem(
          trimmedProductId,
          quantity,
          branchId,
          businessIdToUse,
          variantSelections,
          specialInstructions
        );
        // Actualizar carrito completo (carga productos y convierte a formato Cart)
        await loadGuestCart();
        console.log('✅ [addItem] Carrito de invitado actualizado');
      }
      triggerAnimation();
    } catch (error) {
      console.error('❌ [addItem] Error agregando item al carrito:', error);
      throw error;
    }
  };

  const updateItem = async (itemId: string, quantity: number, specialInstructions?: string) => {
    try {
      console.log('🛒 [updateItem] Iniciando actualización:', { itemId, quantity, isAuthenticated });
      
      // Verificar si realmente hay un token válido antes de llamar al backend
      const hasValidToken = typeof window !== 'undefined' && localStorage.getItem('auth_token');
      
      if (isAuthenticated && hasValidToken) {
        try {
          console.log('✅ [updateItem] Usuario autenticado, llamando al backend');
          const updatedCart = await cartService.updateItem(itemId, quantity, specialInstructions);
          const enriched = await enrichCartWithTaxes(updatedCart);
          setCart(enriched);
          return;
        } catch (error: any) {
          // Si el error es 401, el token puede haber expirado
          if (error.statusCode === 401 || error.message?.includes('401')) {
            console.warn('⚠️ [updateItem] Token inválido o expirado, usando localStorage como fallback');
            // Continuar con la lógica de invitado
          } else {
            throw error;
          }
        }
      }
      
      // Usuario invitado o token inválido - usar localStorage
      console.log('👤 [updateItem] Usuario invitado o token inválido, usando localStorage');
      
      // Para invitados, necesitamos extraer productId y branchId del itemId
      // Formato: guest-${productId}-${branchId || 'global'}-${index}
      // El itemId puede tener múltiples guiones, así que necesitamos una mejor estrategia
      if (!cart || !cart.items) {
        console.error('❌ [updateItem] No hay carrito disponible');
        return;
      }

      // Buscar el item en el carrito actual para obtener productId
      const cartItem = cart.items.find(item => item.id === itemId);
      if (!cartItem) {
        console.error('❌ [updateItem] Item no encontrado en el carrito:', itemId);
        return;
      }

      const productId = cartItem.product_id;
      
      // Obtener branchId del localStorage o del guestCart
      let branchId: string | undefined = undefined;
      if (typeof window !== 'undefined') {
        try {
          const branchIdKey = `cart_item_branch_${itemId}`;
          const storedBranchId = localStorage.getItem(branchIdKey);
          if (storedBranchId) {
            branchId = storedBranchId;
          }
        } catch (e) {
          console.warn('No se pudo leer branchId de localStorage:', e);
        }
      }
      
      // Si no está en localStorage, buscar en el guestCart
      if (!branchId) {
        const guestCart = guestCartService.getCart();
        const guestItem = guestCart.items.find(
          item => item.productId === productId
        );
        if (guestItem) {
          branchId = guestItem.branchId;
        }
      }

      console.log('🛒 [updateItem] Actualizando item de invitado:', { 
        itemId, 
        productId, 
        branchId, 
        quantity,
        cartItemProductId: cartItem.product_id 
      });
      
      guestCartService.updateItem(productId, branchId, quantity);
      // Recargar el carrito completo para actualizar el estado
      await loadGuestCart();
      console.log('✅ [updateItem] Item actualizado y carrito recargado');
    } catch (error) {
      console.error('❌ [updateItem] Error actualizando item del carrito:', error);
      throw error;
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      console.log('🛒 [removeItem] Iniciando eliminación:', { itemId, isAuthenticated });
      
      // Verificar si realmente hay un token válido antes de llamar al backend
      const hasValidToken = typeof window !== 'undefined' && localStorage.getItem('auth_token');
      
      if (isAuthenticated && hasValidToken) {
        try {
          console.log('✅ [removeItem] Usuario autenticado, llamando al backend');
          const updatedCart = await cartService.removeItem(itemId);
          const enriched = await enrichCartWithTaxes(updatedCart);
          setCart(enriched);
          return;
        } catch (error: any) {
          // Si el error es 401, el token puede haber expirado
          if (error.statusCode === 401 || error.message?.includes('401')) {
            console.warn('⚠️ [removeItem] Token inválido o expirado, usando localStorage como fallback');
            // Continuar con la lógica de invitado
          } else {
            throw error;
          }
        }
      }
      
      // Usuario invitado o token inválido - usar localStorage
      console.log('👤 [removeItem] Usuario invitado o token inválido, usando localStorage');
      
      // Para invitados, buscar el item en el carrito actual
      if (!cart || !cart.items) {
        console.error('❌ [removeItem] No hay carrito disponible');
        return;
      }

      const cartItem = cart.items.find(item => item.id === itemId);
      if (!cartItem) {
        console.error('❌ [removeItem] Item no encontrado en el carrito:', itemId);
        return;
      }

      const productId = cartItem.product_id;
      
      // Obtener branchId del localStorage o del guestCart
      let branchId: string | undefined = undefined;
      if (typeof window !== 'undefined') {
        try {
          const branchIdKey = `cart_item_branch_${itemId}`;
          const storedBranchId = localStorage.getItem(branchIdKey);
          if (storedBranchId) {
            branchId = storedBranchId;
          }
          // Limpiar el localStorage después de obtenerlo
          localStorage.removeItem(branchIdKey);
        } catch (e) {
          console.warn('No se pudo leer branchId de localStorage:', e);
        }
      }
      
      // Si no está en localStorage, buscar en el guestCart
      if (!branchId) {
        const guestCart = guestCartService.getCart();
        const guestItem = guestCart.items.find(
          item => item.productId === productId
        );
        if (guestItem) {
          branchId = guestItem.branchId;
        }
      }

      console.log('🛒 [removeItem] Eliminando item de invitado:', { 
        itemId, 
        productId, 
        branchId,
        cartItemProductId: cartItem.product_id 
      });
      
      guestCartService.removeItem(productId, branchId);
      // Recargar el carrito completo para actualizar el estado
      await loadGuestCart();
      console.log('✅ [removeItem] Item eliminado y carrito recargado');
    } catch (error) {
      console.error('Error eliminando item del carrito:', error);
      throw error;
    }
  };

  const clearCart = async () => {
    try {
      if (isAuthenticated) {
        await cartService.clearCart();
        setCart(null);
      } else {
        guestCartService.clearCart();
        loadGuestCart();
      }
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
    if (isAuthenticated) {
      if (!cart) return 0;
      if (cart.totalQuantity !== undefined && cart.totalQuantity !== null) {
        return cart.totalQuantity;
      }
      if (cart.items && Array.isArray(cart.items) && cart.items.length > 0) {
        return cart.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      }
      return 0;
    } else {
      // Para invitados, contar desde localStorage
      return guestCartService.getItemCount();
    }
  }, [cart, isAuthenticated]);

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

