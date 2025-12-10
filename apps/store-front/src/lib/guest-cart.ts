/**
 * Servicio para manejar carritos de invitados usando localStorage
 * Se migra a la BD cuando el usuario se autentica
 */

export interface GuestCartItem {
  productId: string;
  quantity: number;
  variantSelections?: Record<string, string | string[]>;
  specialInstructions?: string;
  branchId?: string;
  businessId?: string;
  addedAt: string;
}

export interface GuestCart {
  items: GuestCartItem[];
  lastUpdated: string;
}

const GUEST_CART_KEY = 'guest_cart';

export const guestCartService = {
  /**
   * Obtener carrito de invitado desde localStorage
   */
  getCart(): GuestCart {
    if (typeof window === 'undefined') {
      return { items: [], lastUpdated: new Date().toISOString() };
    }

    try {
      const stored = localStorage.getItem(GUEST_CART_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error leyendo carrito de invitado:', error);
    }

    return { items: [], lastUpdated: new Date().toISOString() };
  },

  /**
   * Guardar carrito de invitado en localStorage
   */
  saveCart(cart: GuestCart): void {
    if (typeof window === 'undefined') return;

    try {
      cart.lastUpdated = new Date().toISOString();
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
    } catch (error) {
      console.error('Error guardando carrito de invitado:', error);
    }
  },

  /**
   * Agregar item al carrito de invitado
   */
  addItem(
    productId: string,
    quantity: number,
    branchId?: string,
    businessId?: string,
    variantSelections?: Record<string, string | string[]>,
    specialInstructions?: string
  ): GuestCart {
    // Validar productId
    if (!productId || typeof productId !== 'string') {
      console.error('❌ [guestCartService.addItem] productId inválido:', {
        productId,
        type: typeof productId,
      });
      throw new Error(`productId inválido: ${productId}`);
    }

    // Validar formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const trimmedProductId = productId.trim();
    if (!uuidRegex.test(trimmedProductId)) {
      console.error('❌ [guestCartService.addItem] productId no es un UUID válido:', {
        productId: trimmedProductId,
        original: productId,
        length: productId.length,
      });
      throw new Error(`productId no es un UUID válido: ${productId}`);
    }

    const cart = this.getCart();
    
    // Buscar si ya existe un item idéntico
    const existingIndex = cart.items.findIndex(
      item =>
        item.productId === trimmedProductId &&
        item.branchId === branchId &&
        JSON.stringify(item.variantSelections) === JSON.stringify(variantSelections)
    );

    if (existingIndex >= 0) {
      // Actualizar cantidad
      cart.items[existingIndex].quantity += quantity;
    } else {
      // Agregar nuevo item
      cart.items.push({
        productId: trimmedProductId, // Guardar el productId validado y recortado
        quantity,
        branchId,
        businessId,
        variantSelections,
        specialInstructions,
        addedAt: new Date().toISOString(),
      });
    }

    this.saveCart(cart);
    return cart;
  },

  /**
   * Actualizar cantidad de un item
   */
  updateItem(productId: string, branchId: string | undefined, quantity: number): GuestCart {
    const cart = this.getCart();
    const item = cart.items.find(
      item => item.productId === productId && item.branchId === branchId
    );

    if (item) {
      if (quantity <= 0) {
        cart.items = cart.items.filter(i => i !== item);
      } else {
        item.quantity = quantity;
      }
      this.saveCart(cart);
    }

    return cart;
  },

  /**
   * Eliminar item del carrito
   */
  removeItem(productId: string, branchId: string | undefined): GuestCart {
    const cart = this.getCart();
    cart.items = cart.items.filter(
      item => !(item.productId === productId && item.branchId === branchId)
    );
    this.saveCart(cart);
    return cart;
  },

  /**
   * Vaciar carrito
   */
  clearCart(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(GUEST_CART_KEY);
  },

  /**
   * Obtener items agrupados por tienda (businessId)
   */
  getItemsGroupedByStore(): Record<string, GuestCartItem[]> {
    const cart = this.getCart();
    const grouped: Record<string, GuestCartItem[]> = {};

    cart.items.forEach(item => {
      const key = item.businessId || item.branchId || 'unknown';
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });

    return grouped;
  },

  /**
   * Obtener total de items
   */
  getItemCount(): number {
    const cart = this.getCart();
    return cart.items.reduce((sum, item) => sum + item.quantity, 0);
  },
};

