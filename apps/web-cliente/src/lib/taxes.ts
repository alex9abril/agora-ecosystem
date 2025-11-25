/**
 * Servicio para manejar impuestos
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

class TaxesService {
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
   * Calcular impuestos para un producto y subtotal
   */
  async calculateProductTaxes(productId: string, subtotal: number): Promise<TaxBreakdown> {
    try {
      const response = await fetch(
        `${API_URL}/catalog/taxes/products/${productId}/calculate?subtotal=${subtotal}`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.ok) {
        // Si hay error, retornar breakdown vacío
        console.warn(`⚠️ Error calculando impuestos para producto ${productId}:`, response.statusText);
        return { taxes: [], total_tax: 0 };
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error calculando impuestos:', error);
      // En caso de error, retornar breakdown vacío para no bloquear el flujo
      return { taxes: [], total_tax: 0 };
    }
  }
}

export const taxesService = new TaxesService();

