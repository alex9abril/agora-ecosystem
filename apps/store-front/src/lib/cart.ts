/**
 * Servicio para manejar el carrito de compras
 * El carrito se guarda en la base de datos mediante el backend API
 */

import { apiRequest } from './api';

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
  unit_price: number | string;
  variant_price_adjustment: number | string;
  item_subtotal: number | string;
  special_instructions?: string;
  product_name: string;
  product_description?: string;
  product_image_url?: string;
  product_is_available: boolean;
  business_id: string;
  business_name: string;
  tax_breakdown?: TaxBreakdown;
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
  /**
   * Obtener el carrito del usuario (desde BD)
   */
  async getCart(): Promise<Cart | null> {
    try {
      const result = await apiRequest<Cart>('/cart', {
        method: 'GET',
      });
      return result;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      console.error('Error obteniendo carrito:', error);
      throw error;
    }
  }

  /**
   * Agregar item al carrito (se guarda en BD)
   */
  async addItem(payload: AddToCartPayload): Promise<Cart> {
    try {
      const requestBody: any = {
        productId: payload.productId,
        quantity: payload.quantity,
        variantSelections: payload.variantSelections || {},
        specialInstructions: payload.specialInstructions,
      };
      
      // Incluir branchId si está disponible (para contexto global con sucursal seleccionada)
      if (payload.branchId) {
        requestBody.branchId = payload.branchId;
      }
      
      return await apiRequest<Cart>('/cart/items', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });
    } catch (error) {
      console.error('Error agregando item al carrito:', error);
      throw error;
    }
  }

  /**
   * Actualizar item del carrito (se actualiza en BD)
   */
  async updateItem(itemId: string, quantity: number, specialInstructions?: string): Promise<Cart> {
    try {
      return await apiRequest<Cart>(`/cart/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          quantity,
          specialInstructions,
        }),
      });
    } catch (error) {
      console.error('Error actualizando item del carrito:', error);
      throw error;
    }
  }

  /**
   * Eliminar item del carrito (se elimina de BD)
   */
  async removeItem(itemId: string): Promise<Cart | null> {
    try {
      return await apiRequest<Cart | null>(`/cart/items/${itemId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error eliminando item del carrito:', error);
      throw error;
    }
  }

  /**
   * Vaciar carrito (se elimina de BD)
   */
  async clearCart(): Promise<void> {
    try {
      await apiRequest('/cart', {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error vaciando carrito:', error);
      throw error;
    }
  }
}

export const cartService = new CartService();

