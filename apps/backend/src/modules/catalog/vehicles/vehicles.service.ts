import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { dbPool } from '../../../config/database.config';

export interface VehicleBrand {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface VehicleModel {
  id: string;
  brand_id: string;
  name: string;
  code: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface VehicleYear {
  id: string;
  model_id: string;
  year_start: number;
  year_end: number | null;
  generation: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VehicleSpec {
  id: string;
  year_id: string;
  engine_code: string | null;
  engine_displacement: string | null;
  engine_cylinders: number | null;
  transmission_type: string | null;
  transmission_speeds: number | null;
  drivetrain: string | null;
  body_type: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductVehicleCompatibility {
  id: string;
  product_id: string;
  vehicle_spec_id: string | null;
  vehicle_year_id: string | null;
  vehicle_model_id: string | null;
  vehicle_brand_id: string | null;
  is_universal: boolean;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class VehiclesService {
  /**
   * Obtener todas las marcas activas
   */
  async getBrands(): Promise<VehicleBrand[]> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      const result = await dbPool.query(
        `SELECT id, name, code, is_active, display_order, created_at, updated_at
         FROM catalog.vehicle_brands
         WHERE is_active = TRUE
         ORDER BY display_order ASC, name ASC`
      );
      return result.rows;
    } catch (error: any) {
      console.error('❌ Error obteniendo marcas:', error);
      throw new ServiceUnavailableException(`Error al obtener marcas: ${error.message}`);
    }
  }

  /**
   * Obtener modelos por marca
   */
  async getModelsByBrand(brandId: string): Promise<VehicleModel[]> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      const result = await dbPool.query(
        `SELECT id, brand_id, name, code, is_active, display_order, created_at, updated_at
         FROM catalog.vehicle_models
         WHERE brand_id = $1 AND is_active = TRUE
         ORDER BY display_order ASC, name ASC`,
        [brandId]
      );
      return result.rows;
    } catch (error: any) {
      console.error('❌ Error obteniendo modelos:', error);
      throw new ServiceUnavailableException(`Error al obtener modelos: ${error.message}`);
    }
  }

  /**
   * Obtener años/generaciones por modelo
   */
  async getYearsByModel(modelId: string): Promise<VehicleYear[]> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      const result = await dbPool.query(
        `SELECT id, model_id, year_start, year_end, generation, is_active, created_at, updated_at
         FROM catalog.vehicle_years
         WHERE model_id = $1 AND is_active = TRUE
         ORDER BY year_start DESC`,
        [modelId]
      );
      return result.rows;
    } catch (error: any) {
      console.error('❌ Error obteniendo años:', error);
      throw new ServiceUnavailableException(`Error al obtener años: ${error.message}`);
    }
  }

  /**
   * Obtener especificaciones por año
   */
  async getSpecsByYear(yearId: string): Promise<VehicleSpec[]> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      const result = await dbPool.query(
        `SELECT id, year_id, engine_code, engine_displacement, engine_cylinders,
                transmission_type, transmission_speeds, drivetrain, body_type,
                is_active, created_at, updated_at
         FROM catalog.vehicle_specs
         WHERE year_id = $1 AND is_active = TRUE
         ORDER BY engine_code, transmission_type`,
        [yearId]
      );
      return result.rows;
    } catch (error: any) {
      console.error('❌ Error obteniendo especificaciones:', error);
      throw new ServiceUnavailableException(`Error al obtener especificaciones: ${error.message}`);
    }
  }

  /**
   * Verificar compatibilidad de un producto con un vehículo
   */
  async checkProductCompatibility(
    productId: string,
    brandId?: string,
    modelId?: string,
    yearId?: string,
    specId?: string
  ): Promise<boolean> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      const result = await dbPool.query(
        `SELECT catalog.check_product_vehicle_compatibility(
          $1::UUID,
          $2::UUID,
          $3::UUID,
          $4::UUID,
          $5::UUID
        ) as is_compatible`,
        [productId, brandId || null, modelId || null, yearId || null, specId || null]
      );
      return result.rows[0]?.is_compatible || false;
    } catch (error: any) {
      console.error('❌ Error verificando compatibilidad:', error);
      throw new ServiceUnavailableException(`Error al verificar compatibilidad: ${error.message}`);
    }
  }

  /**
   * Obtener vehículos compatibles con un producto
   */
  async getCompatibleVehicles(productId: string): Promise<any[]> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      const result = await dbPool.query(
        `SELECT * FROM catalog.get_compatible_vehicles($1::UUID)`,
        [productId]
      );
      return result.rows;
    } catch (error: any) {
      console.error('❌ Error obteniendo vehículos compatibles:', error);
      throw new ServiceUnavailableException(`Error al obtener vehículos compatibles: ${error.message}`);
    }
  }

  /**
   * Obtener compatibilidades de un producto
   */
  async getProductCompatibilities(productId: string): Promise<ProductVehicleCompatibility[]> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      const result = await dbPool.query(
        `SELECT 
          pvc.id,
          pvc.product_id,
          pvc.vehicle_spec_id,
          pvc.vehicle_year_id,
          pvc.vehicle_model_id,
          pvc.vehicle_brand_id,
          pvc.is_universal,
          pvc.notes,
          pvc.is_active,
          pvc.created_at,
          pvc.updated_at,
          vb.name as brand_name,
          vm.name as model_name,
          vy.year_start,
          vy.year_end,
          vy.generation,
          vs.engine_code,
          vs.transmission_type
         FROM catalog.product_vehicle_compatibility pvc
         LEFT JOIN catalog.vehicle_brands vb ON pvc.vehicle_brand_id = vb.id
         LEFT JOIN catalog.vehicle_models vm ON pvc.vehicle_model_id = vm.id
         LEFT JOIN catalog.vehicle_years vy ON pvc.vehicle_year_id = vy.id
         LEFT JOIN catalog.vehicle_specs vs ON pvc.vehicle_spec_id = vs.id
         WHERE pvc.product_id = $1
         ORDER BY pvc.is_universal DESC, vb.name, vm.name, vy.year_start`,
        [productId]
      );
      return result.rows;
    } catch (error: any) {
      console.error('❌ Error obteniendo compatibilidades:', error);
      throw new ServiceUnavailableException(`Error al obtener compatibilidades: ${error.message}`);
    }
  }

  /**
   * Agregar compatibilidad a un producto
   */
  async addProductCompatibility(
    productId: string,
    userId: string,
    data: {
      vehicle_brand_id?: string;
      vehicle_model_id?: string;
      vehicle_year_id?: string;
      vehicle_spec_id?: string;
      is_universal?: boolean;
      notes?: string;
    }
  ): Promise<ProductVehicleCompatibility> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      // Validar que el producto existe
      const productCheck = await dbPool.query(
        'SELECT id FROM catalog.products WHERE id = $1',
        [productId]
      );
      if (productCheck.rows.length === 0) {
        throw new NotFoundException('Producto no encontrado');
      }

      // Validar que no sea universal y específico al mismo tiempo
      if (data.is_universal && (data.vehicle_brand_id || data.vehicle_model_id || data.vehicle_year_id || data.vehicle_spec_id)) {
        throw new Error('No se puede tener compatibilidad universal y específica al mismo tiempo');
      }

      // Validar que tenga al menos una referencia si no es universal
      if (!data.is_universal && !data.vehicle_brand_id && !data.vehicle_model_id && !data.vehicle_year_id && !data.vehicle_spec_id) {
        throw new Error('Debe especificar al menos una referencia de vehículo o marcar como universal');
      }

      const result = await dbPool.query(
        `INSERT INTO catalog.product_vehicle_compatibility (
          product_id,
          vehicle_brand_id,
          vehicle_model_id,
          vehicle_year_id,
          vehicle_spec_id,
          is_universal,
          notes,
          is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
        RETURNING *`,
        [
          productId,
          data.vehicle_brand_id || null,
          data.vehicle_model_id || null,
          data.vehicle_year_id || null,
          data.vehicle_spec_id || null,
          data.is_universal || false,
          data.notes || null,
        ]
      );

      return result.rows[0];
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('❌ Error agregando compatibilidad:', error);
      throw new ServiceUnavailableException(`Error al agregar compatibilidad: ${error.message}`);
    }
  }

  /**
   * Eliminar compatibilidad de un producto
   */
  async removeProductCompatibility(compatibilityId: string, userId: string): Promise<void> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      // Eliminación lógica
      await dbPool.query(
        `UPDATE catalog.product_vehicle_compatibility
         SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [compatibilityId]
      );
    } catch (error: any) {
      console.error('❌ Error eliminando compatibilidad:', error);
      throw new ServiceUnavailableException(`Error al eliminar compatibilidad: ${error.message}`);
    }
  }
}

