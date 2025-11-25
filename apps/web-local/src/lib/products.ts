/**
 * Servicio para gestión de productos
 */

import { apiRequest } from './api';

export type ProductType = 'food' | 'beverage' | 'medicine' | 'grocery' | 'non_food';

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  parent_category_id?: string;
  attributes?: Record<string, any>;
  display_order: number;
  is_active: boolean;
}

export interface ProductVariantGroup {
  id?: string;
  name: string;
  description?: string;
  is_required: boolean;
  selection_type: 'single' | 'multiple';
  min_selections?: number;
  max_selections?: number;
  display_order: number;
  variants: ProductVariant[];
}

export interface ProductVariant {
  id?: string;
  name: string;
  description?: string;
  price_adjustment: number;
  absolute_price?: number;
  is_available: boolean;
  display_order: number;
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  image_url?: string;
  price: number;
  product_type: ProductType;
  category_id?: string;
  category_name?: string;
  is_available: boolean;
  is_featured: boolean;
  variant_groups?: ProductVariantGroup[];
  nutritional_info?: Record<string, any>;
  allergens?: string[];
  // Campos de farmacia
  requires_prescription?: boolean;
  age_restriction?: number;
  max_quantity_per_order?: number;
  requires_pharmacist_validation?: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateProductData {
  business_id: string;
  name: string;
  description?: string;
  image_url?: string;
  price: number;
  product_type: ProductType;
  category_id?: string;
  is_available?: boolean;
  is_featured?: boolean;
  variant_groups?: ProductVariantGroup[];
  nutritional_info?: Record<string, any>;
  allergens?: string[];
  // Campos de farmacia
  requires_prescription?: boolean;
  age_restriction?: number;
  max_quantity_per_order?: number;
  requires_pharmacist_validation?: boolean;
  display_order?: number;
}

export interface UpdateProductData extends Partial<CreateProductData> {
  id: string;
}

export const productsService = {
  /**
   * Obtener todas las categorías de productos (solo lectura para locales)
   */
  async getCategories(): Promise<ProductCategory[]> {
    try {
      // Obtener solo categorías globales y activas
      const response = await apiRequest<{ data: ProductCategory[]; pagination: any }>('/catalog/categories?globalOnly=true&isActive=true&limit=100', {
        method: 'GET',
      });
      // El backend devuelve { data: [...], pagination: {...} }
      return response?.data || [];
    } catch (error: any) {
      console.error('Error obteniendo categorías:', error);
      throw error;
    }
  },

  /**
   * Obtener configuración de campos por tipo de producto
   */
  async getFieldConfigByProductType(productType: ProductType): Promise<Array<{ fieldName: string; isVisible: boolean; isRequired: boolean; displayOrder: number }>> {
    try {
      const config = await apiRequest<Array<{ fieldName: string; isVisible: boolean; isRequired: boolean; displayOrder: number }>>(`/catalog/products/field-config/${productType}`, {
        method: 'GET',
      });
      return config;
    } catch (error: any) {
      console.error('Error obteniendo configuración de campos:', error);
      throw error;
    }
  },

  /**
   * Obtener tipos de producto disponibles
   */
  getProductTypes(): Array<{ value: ProductType; label: string }> {
    return [
      { value: 'food', label: 'Alimento' },
      { value: 'beverage', label: 'Bebida' },
      { value: 'medicine', label: 'Medicamento' },
      { value: 'grocery', label: 'Abarrotes' },
      { value: 'non_food', label: 'No Alimenticio' },
    ];
  },

  /**
   * Obtener todos los productos de un negocio
   */
  async getProducts(businessId: string): Promise<Product[]> {
    try {
      const response = await apiRequest<{ data: Product[]; pagination: any }>(`/catalog/products?businessId=${businessId}`, {
        method: 'GET',
      });
      // El backend devuelve { data: [...], pagination: {...} }
      return response?.data || [];
    } catch (error: any) {
      console.error('Error obteniendo productos:', error);
      throw error;
    }
  },

  /**
   * Obtener un producto por ID
   */
  async getProduct(productId: string): Promise<Product> {
    try {
      const product = await apiRequest<Product>(`/catalog/products/${productId}`, {
        method: 'GET',
      });
      return product;
    } catch (error: any) {
      console.error('Error obteniendo producto:', error);
      throw error;
    }
  },

  /**
   * Crear un nuevo producto
   */
  async createProduct(data: CreateProductData): Promise<Product> {
    try {
      const product = await apiRequest<Product>('/catalog/products', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return product;
    } catch (error: any) {
      console.error('Error creando producto:', error);
      throw error;
    }
  },

  /**
   * Actualizar un producto
   */
  async updateProduct(data: UpdateProductData): Promise<Product> {
    try {
      const { id, ...updateData } = data;
      const product = await apiRequest<Product>(`/catalog/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });
      return product;
    } catch (error: any) {
      console.error('Error actualizando producto:', error);
      throw error;
    }
  },

  /**
   * Eliminar (desactivar) un producto
   */
  async deleteProduct(productId: string): Promise<void> {
    try {
      await apiRequest(`/catalog/products/${productId}`, {
        method: 'DELETE',
      });
    } catch (error: any) {
      console.error('Error eliminando producto:', error);
      throw error;
    }
  },

  /**
   * Subir imagen de producto
   * TODO: Implementar endpoint de subida de imágenes en el backend
   * Por ahora, retorna la URL si ya está en el formData, o lanza error
   */
  async uploadProductImage(file: File, productId?: string): Promise<string> {
    // TODO: Implementar subida real de imágenes
    // Por ahora, retornamos una URL placeholder o lanzamos error
    throw new Error('La subida de imágenes aún no está implementada. Por favor, usa una URL de imagen.');
    
    // Cuando esté implementado, usar algo como:
    // const formData = new FormData();
    // formData.append('image', file);
    // if (productId) {
    //   formData.append('product_id', productId);
    // }
    // const response = await apiRequest<{ image_url: string }>('/catalog/products/upload-image', {
    //   method: 'POST',
    //   body: formData,
    // });
    // return response.image_url;
  },
};

