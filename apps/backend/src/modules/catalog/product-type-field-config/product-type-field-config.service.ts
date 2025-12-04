import { Injectable, ServiceUnavailableException, NotFoundException, BadRequestException } from '@nestjs/common';
import { BulkUpdateFieldConfigDto, UpdateFieldConfigDto } from './dto/update-field-config.dto';
import { dbPool } from '../../../config/database.config';

export interface ProductTypeFieldConfig {
  id: string;
  product_type: string;
  field_name: string;
  is_visible: boolean;
  is_required: boolean;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class ProductTypeFieldConfigService {
  /**
   * Obtener todas las configuraciones de campos por tipo de producto
   */
  async findAll(productType?: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;

    try {
      let sqlQuery: string;
      let queryParams: any[] = [];

      if (productType) {
        sqlQuery = `
          SELECT 
            id,
            product_type::text,
            field_name,
            is_visible,
            is_required,
            display_order,
            created_at,
            updated_at
          FROM catalog.product_type_field_config
          WHERE product_type = $1::catalog.product_type
          ORDER BY display_order, field_name
        `;
        queryParams = [productType];
      } else {
        sqlQuery = `
          SELECT 
            id,
            product_type::text,
            field_name,
            is_visible,
            is_required,
            display_order,
            created_at,
            updated_at
          FROM catalog.product_type_field_config
          ORDER BY product_type, display_order, field_name
        `;
      }

      const result = await pool.query(sqlQuery, queryParams);

      return result.rows.map(row => ({
        id: row.id,
        productType: row.product_type,
        fieldName: row.field_name,
        isVisible: row.is_visible,
        isRequired: row.is_required,
        displayOrder: row.display_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error: any) {
      console.error('❌ Error obteniendo configuraciones de campos:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        productType,
      });

      // Si la tabla no existe, retornar array vacío
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('⚠️ Tabla catalog.product_type_field_config no existe.');
        return [];
      }

      throw new ServiceUnavailableException(`Error al obtener configuraciones: ${error.message}`);
    }
  }

  /**
   * Obtener configuración de un tipo de producto específico
   */
  async findByProductType(productType: string) {
    return this.findAll(productType);
  }

  /**
   * Actualizar configuración de campos en bulk para un tipo de producto
   */
  async bulkUpdate(productType: string, updateDto: BulkUpdateFieldConfigDto) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;

    try {
      // Verificar que el tipo de producto sea válido
      const validTypes = ['refaccion', 'accesorio', 'servicio_instalacion', 'servicio_mantenimiento', 'fluido'];
      if (!validTypes.includes(productType)) {
        throw new BadRequestException(`Tipo de producto inválido: ${productType}`);
      }

      // Iniciar transacción
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Actualizar cada configuración
        for (const fieldConfig of updateDto.field_configs) {
          const updateQuery = `
            INSERT INTO catalog.product_type_field_config (
              product_type,
              field_name,
              is_visible,
              is_required,
              display_order
            )
            VALUES ($1::catalog.product_type, $2, $3, $4, $5)
            ON CONFLICT (product_type, field_name)
            DO UPDATE SET
              is_visible = EXCLUDED.is_visible,
              is_required = EXCLUDED.is_required,
              display_order = EXCLUDED.display_order,
              updated_at = CURRENT_TIMESTAMP
          `;

          await client.query(updateQuery, [
            productType,
            fieldConfig.field_name,
            fieldConfig.is_visible,
            fieldConfig.is_required,
            fieldConfig.display_order,
          ]);
        }

        await client.query('COMMIT');

        // Retornar las configuraciones actualizadas
        return this.findByProductType(productType);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('❌ Error actualizando configuraciones de campos:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        productType,
      });

      if (error instanceof BadRequestException || error instanceof ServiceUnavailableException) {
        throw error;
      }

      throw new ServiceUnavailableException(`Error al actualizar configuraciones: ${error.message}`);
    }
  }

  /**
   * Obtener lista de tipos de producto disponibles dinámicamente desde la base de datos
   */
  async getProductTypes() {
    if (!dbPool) {
      // Fallback a valores por defecto si no hay conexión a BD
      return [
        { value: 'food', label: 'Alimento' },
        { value: 'beverage', label: 'Bebida' },
        { value: 'medicine', label: 'Medicamento' },
        { value: 'grocery', label: 'Abarrotes' },
        { value: 'non_food', label: 'No Alimenticio' },
      ];
    }

    const pool = dbPool;

    try {
      // Obtener los valores del ENUM desde la base de datos
      const enumQuery = `
        SELECT 
          e.enumlabel as value,
          e.enumlabel as label
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        JOIN pg_namespace n ON t.typnamespace = n.oid
        WHERE n.nspname = 'catalog' 
          AND t.typname = 'product_type'
        ORDER BY e.enumsortorder
      `;

      const result = await pool.query(enumQuery);

      if (result.rows.length === 0) {
        // Si no hay valores en el ENUM, usar valores por defecto
        console.warn('⚠️ No se encontraron tipos de producto en el ENUM. Usando valores por defecto.');
        return [
          { value: 'food', label: 'Alimento' },
          { value: 'beverage', label: 'Bebida' },
          { value: 'medicine', label: 'Medicamento' },
          { value: 'grocery', label: 'Abarrotes' },
          { value: 'non_food', label: 'No Alimenticio' },
        ];
      }

      // Mapear los valores del ENUM a labels más legibles
      const labelMap: Record<string, string> = {
        'food': 'Alimento',
        'beverage': 'Bebida',
        'medicine': 'Medicamento',
        'grocery': 'Abarrotes',
        'non_food': 'No Alimenticio',
        'refaccion': 'Refacción',
        'accesorio': 'Accesorio',
        'servicio_instalacion': 'Servicio de Instalación',
        'servicio_mantenimiento': 'Servicio de Mantenimiento',
        'fluido': 'Fluidos y Lubricantes',
      };

      return result.rows.map(row => ({
        value: row.value,
        label: labelMap[row.value] || row.value.charAt(0).toUpperCase() + row.value.slice(1).replace(/_/g, ' '),
      }));
    } catch (error: any) {
      console.error('❌ Error obteniendo tipos de producto desde la base de datos:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
      });

      // Fallback a valores por defecto en caso de error
      return [
        { value: 'food', label: 'Alimento' },
        { value: 'beverage', label: 'Bebida' },
        { value: 'medicine', label: 'Medicamento' },
        { value: 'grocery', label: 'Abarrotes' },
        { value: 'non_food', label: 'No Alimenticio' },
      ];
    }
  }

  /**
   * Obtener lista de campos disponibles para configuración
   */
  async getAvailableFields() {
    return [
      { value: 'name', label: 'Nombre' },
      { value: 'description', label: 'Descripción' },
      { value: 'image_url', label: 'URL de Imagen' },
      { value: 'price', label: 'Precio' },
      { value: 'category_id', label: 'Categoría' },
      { value: 'product_type', label: 'Tipo de Producto' },
      { value: 'is_available', label: 'Disponible' },
      { value: 'is_featured', label: 'Destacado' },
      { value: 'display_order', label: 'Orden de Visualización' },
      { value: 'variant_groups', label: 'Grupos de Variantes' },
      { value: 'variants', label: 'Variantes (Compatibilidad de Vehículos)' },
      { value: 'nutritional_info', label: 'Especificaciones Técnicas' },
      { value: 'allergens', label: 'Alérgenos (No aplica)' },
      { value: 'requires_prescription', label: 'Requiere Prescripción (No aplica)' },
      { value: 'age_restriction', label: 'Restricción de Edad (No aplica)' },
      { value: 'max_quantity_per_order', label: 'Cantidad Máxima por Pedido' },
      { value: 'requires_pharmacist_validation', label: 'Requiere Validación (No aplica)' },
    ];
  }
}

