/**
 * Servicio para manejar impuestos
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

class TaxesService {
  /**
   * Calcular impuestos para un producto y subtotal
   */
  async calculateProductTaxes(productId: string, subtotal: number): Promise<TaxBreakdown> {
    try {
      const result = await apiRequest<TaxBreakdown>(
        `/catalog/taxes/products/${productId}/calculate?subtotal=${subtotal}`,
        {
          method: 'POST',
        }
      );
      return result;
    } catch (error) {
      console.error('Error calculando impuestos:', error);
      // En caso de error, retornar breakdown vacío para no bloquear el flujo
      return { taxes: [], total_tax: 0 };
    }
  }
}

export const taxesService = new TaxesService();

