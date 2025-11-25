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

export interface CreateTaxTypeDto {
  name: string;
  description?: string;
  code?: string;
  rate: number;
  rate_type: 'percentage' | 'fixed';
  fixed_amount?: number;
  applies_to_subtotal: boolean;
  applies_to_delivery: boolean;
  applies_to_tip: boolean;
  is_default: boolean;
  is_active?: boolean;
}

export interface UpdateTaxTypeDto extends Partial<CreateTaxTypeDto> {}

/**
 * Obtener todos los tipos de impuestos
 */
export async function getTaxTypes(includeInactive: boolean = false): Promise<TaxType[]> {
  const params = includeInactive ? '?includeInactive=true' : '';
  const response = await apiRequest<TaxType[]>(
    `/catalog/taxes${params}`,
    { method: 'GET' }
  );
  return response || [];
}

/**
 * Obtener un tipo de impuesto por ID
 */
export async function getTaxType(id: string): Promise<TaxType> {
  const response = await apiRequest<TaxType>(
    `/catalog/taxes/${id}`,
    { method: 'GET' }
  );
  return response;
}

/**
 * Crear un nuevo tipo de impuesto
 */
export async function createTaxType(data: CreateTaxTypeDto): Promise<TaxType> {
  const response = await apiRequest<TaxType>(
    '/catalog/taxes',
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );
  return response;
}

/**
 * Actualizar un tipo de impuesto
 */
export async function updateTaxType(id: string, data: UpdateTaxTypeDto): Promise<TaxType> {
  const response = await apiRequest<TaxType>(
    `/catalog/taxes/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    }
  );
  return response;
}

/**
 * Desactivar un tipo de impuesto
 */
export async function deleteTaxType(id: string): Promise<void> {
  await apiRequest(
    `/catalog/taxes/${id}`,
    { method: 'DELETE' }
  );
}

