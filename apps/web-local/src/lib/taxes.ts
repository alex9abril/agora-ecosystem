/**
 * Servicio para gestión de impuestos
 */

import { apiRequest } from './api';

export interface TaxType {
  id: string;
  name: string;
  description?: string;
  code?: string;
  rate: number;
  rate_type: 'percentage' | 'fixed';
  fixed_amount?: number;
  applies_to_subtotal: boolean;
  applies_to_delivery: boolean;
  applies_to_tip: boolean;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductTax {
  id: string;
  product_id: string;
  tax_type_id: string;
  override_rate?: number;
  override_fixed_amount?: number;
  display_order: number;
  created_at: string;
  // Información del tipo de impuesto
  tax_name?: string;
  tax_description?: string;
  tax_code?: string;
  default_rate?: number;
  rate_type?: 'percentage' | 'fixed';
  default_fixed_amount?: number;
}

export interface TaxBreakdown {
  taxes: Array<{
    tax_type_id: string;
    tax_name: string;
    tax_code?: string;
    rate: number;
    rate_type: 'percentage' | 'fixed';
    amount: number;
    applied_to: string;
  }>;
  total_tax: number;
}

export interface AssignTaxToProductData {
  tax_type_id: string;
  override_rate?: number;
  override_fixed_amount?: number;
  display_order?: number;
}

export const taxesService = {
  /**
   * Obtener todos los tipos de impuestos disponibles
   */
  async getTaxTypes(includeInactive: boolean = false): Promise<TaxType[]> {
    const url = `/catalog/taxes${includeInactive ? '?includeInactive=true' : ''}`;
    const response = await apiRequest<TaxType[]>(url, {
      method: 'GET',
    });
    return response;
  },

  /**
   * Obtener impuestos asignados a un producto
   */
  async getProductTaxes(productId: string): Promise<ProductTax[]> {
    const response = await apiRequest<ProductTax[]>(`/catalog/taxes/products/${productId}`, {
      method: 'GET',
    });
    return response;
  },

  /**
   * Asignar un impuesto a un producto
   */
  async assignTaxToProduct(
    productId: string,
    data: AssignTaxToProductData
  ): Promise<ProductTax> {
    const response = await apiRequest<ProductTax>(`/catalog/taxes/products/${productId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  },

  /**
   * Desasignar un impuesto de un producto
   */
  async removeTaxFromProduct(productId: string, taxTypeId: string): Promise<void> {
    await apiRequest(`/catalog/taxes/products/${productId}/${taxTypeId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Calcular impuestos para un producto y subtotal
   */
  async calculateProductTaxes(
    productId: string,
    subtotal: number
  ): Promise<TaxBreakdown> {
    const response = await apiRequest<TaxBreakdown>(
      `/catalog/taxes/products/${productId}/calculate?subtotal=${subtotal}`,
      {
        method: 'POST',
      }
    );
    return response;
  },
};

