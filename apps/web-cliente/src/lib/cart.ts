/**
 * Servicio para manejar el carrito de compras
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export interface TaxDetail {
  tax_type_id: string;
  tax_name: string;
  tax_code?: string;
  rate: number;
  rate_type: 'percentage' | 'fixed';
  amount: number;
  applied_to: 'subtotal' | 'delivery' | 'tip';
}

export interface TaxBreakdown {
  taxes: TaxDetail[];
  total_tax: number;
}

export interface CartItem {
  id: string;
  product_id: string;
  variant_selections?: Record<string, string | string[]>;
  quantity: number;
  unit_price: number | string; // Puede venir como string desde PostgreSQL DECIMAL
  variant_price_adjustment: number | string; // Puede venir como string desde PostgreSQL DECIMAL
  item_subtotal: number | string; // Puede venir como string desde PostgreSQL DECIMAL
  special_instructions?: string;
  product_name: string;
  product_description?: string;
  product_image_url?: string;
  product_is_available: boolean;
  business_id: string;
  business_name: string;
  tax_breakdown?: TaxBreakdown; // Calculado en tiempo real, no viene del backend
}

export interface Cart {
  id: string;
  user_id: string;
  business_id?: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  items: CartItem[];
  subtotal: string;
  itemCount: number;
  totalQuantity: number;
}

export interface AddToCartPayload {
  productId: string;
  quantity: number;
  variantSelections?: Record<string, string | string[]>;
  specialInstructions?: string;
}

class CartService {
  private getAuthHeaders(): HeadersInit {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  /**
   * Obtener el carrito del usuario
   */
  async getCart(): Promise<Cart | null> {
    try {
      const response = await fetch(`${API_URL}/cart`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Error al obtener carrito: ${response.statusText}`);
      }

      const result = await response.json();
      // El backend envuelve la respuesta en { success: true, data: {...} }
      return result.data || result;
    } catch (error) {
      console.error('Error obteniendo carrito:', error);
      throw error;
    }
  }

  /**
   * Agregar item al carrito
   */
  async addItem(payload: AddToCartPayload): Promise<Cart> {
    try {
      const response = await fetch(`${API_URL}/cart/items`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          productId: payload.productId,
          quantity: payload.quantity,
          variantSelections: payload.variantSelections || {},
          specialInstructions: payload.specialInstructions,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Error al agregar item: ${response.statusText}`);
      }

      const result = await response.json();
      // El backend envuelve la respuesta en { success: true, data: {...} }
      return result.data || result;
    } catch (error) {
      console.error('Error agregando item al carrito:', error);
      throw error;
    }
  }

  /**
   * Actualizar item del carrito
   */
  async updateItem(itemId: string, quantity: number, specialInstructions?: string): Promise<Cart> {
    try {
      const response = await fetch(`${API_URL}/cart/items/${itemId}`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          quantity,
          specialInstructions,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error al actualizar item: ${response.statusText}`);
      }

      const result = await response.json();
      // El backend envuelve la respuesta en { success: true, data: {...} }
      return result.data || result;
    } catch (error) {
      console.error('Error actualizando item del carrito:', error);
      throw error;
    }
  }

  /**
   * Eliminar item del carrito
   */
  async removeItem(itemId: string): Promise<Cart | null> {
    try {
      const response = await fetch(`${API_URL}/cart/items/${itemId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Error al eliminar item: ${response.statusText}`);
      }

      if (response.status === 204) {
        return null;
      }

      const result = await response.json();
      // El backend envuelve la respuesta en { success: true, data: {...} }
      return result.data || result || null;
    } catch (error) {
      console.error('Error eliminando item del carrito:', error);
      throw error;
    }
  }

  /**
   * Vaciar carrito
   */
  async clearCart(): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/cart`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Error al vaciar carrito: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error vaciando carrito:', error);
      throw error;
    }
  }
}

export const cartService = new CartService();

