import { apiRequest } from './api';

export interface ProductType {
  value: string;
  label: string;
}

export interface AvailableField {
  value: string;
  label: string;
}

export interface FieldConfig {
  id: string;
  productType: string;
  fieldName: string;
  isVisible: boolean;
  isRequired: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface BulkUpdateFieldConfig {
  field_name: string;
  is_visible: boolean;
  is_required: boolean;
  display_order: number;
}

/**
 * Obtener todas las configuraciones de campos
 */
export async function getAllFieldConfigs(): Promise<FieldConfig[]> {
  const response = await apiRequest<FieldConfig[]>(
    '/catalog/product-type-field-config',
    { method: 'GET' }
  );
  return response || [];
}

/**
 * Obtener configuración de campos para un tipo de producto específico
 */
export async function getFieldConfigByProductType(
  productType: string
): Promise<FieldConfig[]> {
  const response = await apiRequest<FieldConfig[]>(
    `/catalog/product-type-field-config/${productType}`,
    { method: 'GET' }
  );
  return response || [];
}

/**
 * Obtener lista de tipos de producto disponibles
 */
export async function getProductTypes(): Promise<ProductType[]> {
  const response = await apiRequest<ProductType[]>(
    '/catalog/product-type-field-config/product-types',
    { method: 'GET' }
  );
  return response || [];
}

/**
 * Obtener lista de campos disponibles para configuración
 */
export async function getAvailableFields(): Promise<AvailableField[]> {
  const response = await apiRequest<AvailableField[]>(
    '/catalog/product-type-field-config/available-fields',
    { method: 'GET' }
  );
  return response || [];
}

/**
 * Actualizar configuración de campos para un tipo de producto (bulk update)
 */
export async function bulkUpdateFieldConfig(
  productType: string,
  fieldConfigs: BulkUpdateFieldConfig[]
): Promise<FieldConfig[]> {
  const response = await apiRequest<FieldConfig[]>(
    `/catalog/product-type-field-config/${productType}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        field_configs: fieldConfigs,
      }),
    }
  );
  return response || [];
}


