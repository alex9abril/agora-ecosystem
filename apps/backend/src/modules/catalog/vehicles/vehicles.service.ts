import {
  Injectable,
  NotFoundException,
  BadRequestException,
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

export interface VehicleVariant {
  id: string;
  make: string;
  model: string;
  year: number;
  body_trim: string | null;
  engine_transmission: string | null;
}

export interface ProductVehicleCompatibility {
  id: string;
  product_id: string;
  vehicle_variant_id: string | null;
  vehicle_spec_id: string | null;
  vehicle_year_id: string | null;
  vehicle_model_id: string | null;
  vehicle_brand_id: string | null;
  is_universal: boolean;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  /** Campos desde vehicle_variants (estructura radical) */
  make: string | null;
  model: string | null;
  year: number | null;
  body_trim: string | null;
  engine_transmission: string | null;
  brand_name?: string;
  model_name?: string;
  year_start?: number;
  year_end?: number | null;
  generation?: string | null;
  engine_code?: string | null;
  transmission_type?: string | null;
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
   * Opciones para desplegables: marcas distintas desde vehicle_variants
   */
  async getVariantMakes(): Promise<string[]> {
    if (!dbPool) throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    const result = await dbPool.query(
      `SELECT DISTINCT make FROM catalog.vehicle_variants WHERE is_active = TRUE ORDER BY make`
    );
    return result.rows.map((r: any) => r.make);
  }

  /**
   * Modelos distintos para una marca
   */
  async getVariantModels(make: string): Promise<string[]> {
    if (!dbPool) throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    const result = await dbPool.query(
      `SELECT DISTINCT model FROM catalog.vehicle_variants WHERE is_active = TRUE AND make = $1 ORDER BY model`,
      [make]
    );
    return result.rows.map((r: any) => r.model);
  }

  /**
   * Años distintos para make + model
   */
  async getVariantYears(make: string, model: string): Promise<number[]> {
    if (!dbPool) throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    const result = await dbPool.query(
      `SELECT DISTINCT year FROM catalog.vehicle_variants WHERE is_active = TRUE AND make = $1 AND model = $2 ORDER BY year`,
      [make, model]
    );
    return result.rows.map((r: any) => Number(r.year));
  }

  /**
   * body_trim distintos para make + model + year
   */
  async getVariantBodyTrims(make: string, model: string, year: number): Promise<(string | null)[]> {
    if (!dbPool) throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    const result = await dbPool.query(
      `SELECT DISTINCT body_trim FROM catalog.vehicle_variants WHERE is_active = TRUE AND make = $1 AND model = $2 AND year = $3 ORDER BY body_trim NULLS LAST`,
      [make, model, year]
    );
    return result.rows.map((r: any) => r.body_trim ?? null);
  }

  /**
   * engine_transmission distintos para make + model + year (opcionalmente filtrado por body_trim).
   * Si bodyTrim no se envía, se devuelven todos los engine_transmission de ese make/model/year.
   */
  async getVariantEngineTransmissions(
    make: string,
    model: string,
    year: number,
    bodyTrim?: string | null
  ): Promise<(string | null)[]> {
    if (!dbPool) throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    const filterByBodyTrim = bodyTrim != null && bodyTrim !== '';
    const sql = filterByBodyTrim
      ? `SELECT DISTINCT engine_transmission FROM catalog.vehicle_variants
         WHERE is_active = TRUE AND make = $1 AND model = $2 AND year = $3
           AND COALESCE(body_trim, '') = $4
         ORDER BY engine_transmission NULLS LAST`
      : `SELECT DISTINCT engine_transmission FROM catalog.vehicle_variants
         WHERE is_active = TRUE AND make = $1 AND model = $2 AND year = $3
         ORDER BY engine_transmission NULLS LAST`;
    const params = filterByBodyTrim ? [make, model, year, bodyTrim] : [make, model, year];
    const result = await dbPool.query(sql, params);
    return result.rows.map((r: any) => r.engine_transmission ?? null);
  }

  /**
   * Listar/buscar variantes de vehículo (catalog.vehicle_variants)
   */
  async getVehicleVariants(params: {
    q?: string;
    make?: string;
    model?: string;
    year?: number;
    body_trim?: string | null;
    engine_transmission?: string | null;
    limit?: number;
  }): Promise<VehicleVariant[]> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 100);
    const conditions: string[] = ['vv.is_active = TRUE'];
    const values: any[] = [];
    let idx = 1;
    if (params.q && params.q.trim()) {
      const term = `%${params.q.trim()}%`;
      conditions.push(
        `(vv.make ILIKE $${idx} OR vv.model ILIKE $${idx} OR vv.body_trim ILIKE $${idx} OR vv.engine_transmission ILIKE $${idx})`
      );
      values.push(term);
      idx++;
    }
    if (params.make && params.make.trim()) {
      conditions.push(`vv.make = $${idx}`);
      values.push(params.make.trim());
      idx++;
    }
    if (params.model && params.model.trim()) {
      conditions.push(`vv.model = $${idx}`);
      values.push(params.model.trim());
      idx++;
    }
    if (params.year != null) {
      conditions.push(`vv.year = $${idx}`);
      values.push(params.year);
      idx++;
    }
    if (params.body_trim !== undefined && params.body_trim !== null) {
      conditions.push(`COALESCE(vv.body_trim, '') = COALESCE($${idx}, '')`);
      values.push(params.body_trim === '' ? null : params.body_trim);
      idx++;
    }
    if (params.engine_transmission !== undefined && params.engine_transmission !== null) {
      conditions.push(`COALESCE(vv.engine_transmission, '') = COALESCE($${idx}, '')`);
      values.push(params.engine_transmission === '' ? null : params.engine_transmission);
      idx++;
    }
    values.push(limit);
    try {
      const result = await dbPool.query(
        `SELECT vv.id, vv.make, vv.model, vv.year, vv.body_trim, vv.engine_transmission
         FROM catalog.vehicle_variants vv
         WHERE ${conditions.join(' AND ')}
         ORDER BY vv.make, vv.model, vv.year
         LIMIT $${idx}`,
        values
      );
      return result.rows.map((r: any) => ({
        id: r.id,
        make: r.make,
        model: r.model,
        year: Number(r.year),
        body_trim: r.body_trim ?? null,
        engine_transmission: r.engine_transmission ?? null,
      }));
    } catch (error: any) {
      console.error('❌ Error obteniendo variantes:', error);
      throw new ServiceUnavailableException(`Error al obtener variantes: ${error.message}`);
    }
  }

  /**
   * Verificar compatibilidad de un producto con un vehículo.
   * Si vehicleVariantId está presente, usa product_vehicle_compatibility (variant_id o is_universal).
   * Si no, usa la función legacy con brandId/modelId/yearId/specId (si existe).
   */
  async checkProductCompatibility(
    productId: string,
    brandId?: string,
    modelId?: string,
    yearId?: string,
    specId?: string,
    vehicleVariantId?: string
  ): Promise<boolean> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    if (vehicleVariantId && vehicleVariantId.trim()) {
      try {
        const result = await dbPool.query(
          `SELECT 1 FROM catalog.product_vehicle_compatibility pvc
           WHERE pvc.product_id = $1::UUID AND pvc.is_active = TRUE
             AND (pvc.vehicle_variant_id = $2::UUID OR pvc.is_universal = TRUE)
           LIMIT 1`,
          [productId, vehicleVariantId.trim()]
        );
        return (result.rows.length ?? 0) > 0;
      } catch (error: any) {
        console.error('❌ Error verificando compatibilidad por variante:', error);
        throw new ServiceUnavailableException(`Error al verificar compatibilidad: ${error.message}`);
      }
    }

    try {
      const result = await dbPool.query(
        `SELECT EXISTS (
           SELECT 1
           FROM catalog.product_vehicle_compatibility pvc
           WHERE pvc.product_id = $1::UUID
             AND pvc.is_active = TRUE
             AND (
               pvc.is_universal = TRUE
               OR (
                 ($2::UUID IS NOT NULL OR $3::UUID IS NOT NULL OR $4::UUID IS NOT NULL OR $5::UUID IS NOT NULL)
                 AND EXISTS (
                   SELECT 1
                   FROM catalog.vehicle_variants vv
                   LEFT JOIN catalog.vehicle_brands vb
                     ON LOWER(TRIM(vv.make)) = LOWER(TRIM(vb.name))
                    AND vb.is_active = TRUE
                   LEFT JOIN catalog.vehicle_models vm
                     ON vm.brand_id = vb.id
                    AND LOWER(regexp_replace(TRIM(vv.model), '[^a-z0-9]', '', 'gi'))
                      = LOWER(regexp_replace(TRIM(vm.name), '[^a-z0-9]', '', 'gi'))
                    AND vm.is_active = TRUE
                   LEFT JOIN catalog.vehicle_years vy
                     ON vy.model_id = vm.id
                    AND vy.is_active = TRUE
                    AND vv.year BETWEEN vy.year_start AND COALESCE(vy.year_end, vy.year_start)
                   WHERE vv.id = pvc.vehicle_variant_id
                     AND ($2::UUID IS NULL OR vb.id = $2::UUID)
                     AND ($3::UUID IS NULL OR vm.id = $3::UUID)
                     AND ($4::UUID IS NULL OR vy.id = $4::UUID)
                     AND (
                       $5::UUID IS NULL
                       OR EXISTS (
                         SELECT 1
                         FROM catalog.vehicle_specs vs
                         WHERE vs.id = $5::UUID
                           AND vs.is_active = TRUE
                           AND vs.year_id = vy.id
                       )
                     )
                 )
               )
             )
         ) AS is_compatible`,
        [productId, brandId || null, modelId || null, yearId || null, specId || null]
      );
      return result.rows[0]?.is_compatible || false;
    } catch (error: any) {
      console.error('❌ Error verificando compatibilidad por catálogo/variantes:', error);
      return false;
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
   * Obtener compatibilidades de un producto (estructura radical: vehicle_variants).
   * Usa la vista product_vehicle_compatibility_detail que expone make, model, year, body_trim, engine_transmission.
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
          pvc.vehicle_variant_id,
          pvc.is_universal,
          pvc.notes,
          pvc.is_active,
          pvc.created_at,
          pvc.updated_at,
          vv.make,
          vv.model,
          vv.year,
          vv.body_trim,
          vv.engine_transmission
         FROM catalog.product_vehicle_compatibility pvc
         LEFT JOIN catalog.vehicle_variants vv ON vv.id = pvc.vehicle_variant_id
         WHERE pvc.product_id = $1 AND pvc.is_active = TRUE
         ORDER BY pvc.is_universal DESC, vv.make NULLS LAST, vv.model NULLS LAST, vv.year NULLS LAST`,
        [productId]
      );
      const rows = result.rows.map((r: any) => ({
        id: r.id,
        product_id: r.product_id,
        vehicle_variant_id: r.vehicle_variant_id ?? null,
        vehicle_spec_id: null,
        vehicle_year_id: null,
        vehicle_model_id: null,
        vehicle_brand_id: null,
        is_universal: r.is_universal,
        notes: r.notes,
        is_active: r.is_active,
        created_at: r.created_at,
        updated_at: r.updated_at,
        make: r.make ?? null,
        model: r.model ?? null,
        year: r.year != null ? Number(r.year) : null,
        body_trim: r.body_trim ?? null,
        engine_transmission: r.engine_transmission ?? null,
        brand_name: r.make ?? undefined,
        model_name: r.model ?? undefined,
        year_start: r.year != null ? Number(r.year) : undefined,
        year_end: r.year != null ? Number(r.year) : undefined,
        generation: undefined,
        engine_code: r.engine_transmission ?? undefined,
        transmission_type: r.engine_transmission ?? undefined,
      }));
      return rows;
    } catch (error: any) {
      console.error('❌ Error obteniendo compatibilidades:', error);
      throw new ServiceUnavailableException(`Error al obtener compatibilidades: ${error.message}`);
    }
  }

  /**
   * Agregar compatibilidad a un producto (estructura radical: vehicle_variant_id).
   * Acepta is_universal o referencias antiguas (vehicle_brand_id, vehicle_model_id, vehicle_year_id, vehicle_spec_id)
   * y resuelve a una variante en vehicle_variants (find-or-create).
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
      const productCheck = await dbPool.query(
        'SELECT id FROM catalog.products WHERE id = $1',
        [productId]
      );
      if (productCheck.rows.length === 0) {
        throw new NotFoundException('Producto no encontrado');
      }

      if (data.is_universal && (data.vehicle_brand_id || data.vehicle_model_id || data.vehicle_year_id || data.vehicle_spec_id)) {
        throw new BadRequestException('No se puede tener compatibilidad universal y específica al mismo tiempo');
      }

      if (data.is_universal) {
        const row = await this.upsertCompatibilityRow(productId, null, true, data.notes);
        return {
          id: row.id,
          product_id: row.product_id,
          vehicle_variant_id: null,
          vehicle_spec_id: null,
          vehicle_year_id: null,
          vehicle_model_id: null,
          vehicle_brand_id: null,
          is_universal: true,
          notes: row.notes,
          is_active: row.is_active,
          created_at: row.created_at,
          updated_at: row.updated_at,
          make: null,
          model: null,
          year: null,
          body_trim: null,
          engine_transmission: null,
        };
      }

      if (!data.vehicle_brand_id && !data.vehicle_model_id && !data.vehicle_year_id && !data.vehicle_spec_id) {
        throw new BadRequestException('Debe especificar al menos una referencia de vehículo o marcar como universal');
      }

      let make: string | null = null;
      let model: string | null = null;
      let year: number | null = null;
      let body_trim: string | null = null;
      let engine_transmission: string | null = null;

      if (data.vehicle_brand_id) {
        const b = await dbPool.query('SELECT name FROM catalog.vehicle_brands WHERE id = $1', [data.vehicle_brand_id]);
        if (b.rows.length > 0) make = b.rows[0].name;
      }
      if (data.vehicle_model_id) {
        const m = await dbPool.query('SELECT name FROM catalog.vehicle_models WHERE id = $1', [data.vehicle_model_id]);
        if (m.rows.length > 0) model = m.rows[0].name;
      }
      if (data.vehicle_year_id) {
        const y = await dbPool.query('SELECT year_start FROM catalog.vehicle_years WHERE id = $1', [data.vehicle_year_id]);
        if (y.rows.length > 0) year = y.rows[0].year_start;
      }
      if (data.vehicle_spec_id) {
        const s = await dbPool.query(
          'SELECT engine_displacement, engine_cylinders, transmission_type FROM catalog.vehicle_specs WHERE id = $1',
          [data.vehicle_spec_id]
        );
        if (s.rows.length > 0) {
          const r = s.rows[0];
          const parts: string[] = [];
          if (r.engine_displacement && r.engine_cylinders) parts.push(`${r.engine_displacement} L${r.engine_cylinders}`);
          else if (r.engine_displacement) parts.push(r.engine_displacement);
          if (r.transmission_type) parts.push(r.transmission_type);
          engine_transmission = parts.length ? parts.join(' - ') : null;
        }
      }

      if (!make || !model || year == null) {
        throw new BadRequestException('No se pudo resolver marca, modelo y año para la variante');
      }

      const bodyTrimNorm = body_trim || '';
      const engineNorm = engine_transmission || '';
      let variantRes = await dbPool.query(
        `SELECT id FROM catalog.vehicle_variants
         WHERE make = $1 AND model = $2 AND year = $3
           AND COALESCE(body_trim, '') = $4 AND COALESCE(engine_transmission, '') = $5`,
        [make, model, year, bodyTrimNorm, engineNorm]
      );
      let variantId: string;
      if (variantRes.rows.length > 0) {
        variantId = variantRes.rows[0].id;
      } else {
        const insV = await dbPool.query(
          `INSERT INTO catalog.vehicle_variants (make, model, year, body_trim, engine_transmission, is_active)
           VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING id`,
          [make, model, year, body_trim || null, engine_transmission || null]
        );
        variantId = insV.rows[0].id;
      }

      const row = await this.upsertCompatibilityRow(productId, variantId, false, data.notes);
      return {
        id: row.id,
        product_id: row.product_id,
        vehicle_variant_id: row.vehicle_variant_id,
        vehicle_spec_id: null,
        vehicle_year_id: null,
        vehicle_model_id: null,
        vehicle_brand_id: null,
        is_universal: false,
        notes: row.notes,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
        make,
        model,
        year,
        body_trim,
        engine_transmission,
        brand_name: make ?? undefined,
        model_name: model ?? undefined,
        year_start: year ?? undefined,
        year_end: year ?? undefined,
        engine_code: engine_transmission ?? undefined,
        transmission_type: engine_transmission ?? undefined,
      };
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
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

    // Validar que el ID no esté vacío
    if (!compatibilityId || compatibilityId.trim() === '') {
      throw new BadRequestException('ID de compatibilidad inválido');
    }

    try {
      // Verificar que la compatibilidad existe
      const checkResult = await dbPool.query(
        `SELECT id, product_id FROM catalog.product_vehicle_compatibility WHERE id = $1`,
        [compatibilityId]
      );

      if (checkResult.rows.length === 0) {
        throw new NotFoundException('Compatibilidad no encontrada');
      }

      // Eliminación lógica
      const result = await dbPool.query(
        `UPDATE catalog.product_vehicle_compatibility
         SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND is_active = TRUE
         RETURNING id`,
        [compatibilityId]
      );

      if (result.rows.length === 0) {
        // Ya estaba desactivada, pero no es un error crítico
      }
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('❌ Error eliminando compatibilidad:', error);
      throw new ServiceUnavailableException(`Error al eliminar compatibilidad: ${error.message}`);
    }
  }

  /**
   * Desactiva toda la compatibilidad previa de un producto (universal incluida)
   * para reemplazarla por un set nuevo.
   */
  async clearProductCompatibilities(productId: string): Promise<number> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const result = await dbPool.query(
      `UPDATE catalog.product_vehicle_compatibility
       SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE product_id = $1 AND is_active = TRUE
       RETURNING id`,
      [productId],
    );
    return result.rowCount || 0;
  }

  /**
   * Crea compatibilidad desde make/model/años usando el catálogo jerárquico
   * (vehicle_brands → vehicle_models → vehicle_years → vehicle_specs) y luego
   * vehicle_variants, igual que admin-local. Si falta marca/modelo/año, lo registra.
   */
  async addCompatibilityByApplication(
    productId: string,
    data: {
      is_universal?: boolean;
      make?: string;
      model?: string;
      year_start?: number;
      year_end?: number;
      body_trim?: string;
      engine_transmission?: string;
      notes?: string;
    },
  ): Promise<void> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const productCheck = await dbPool.query('SELECT id FROM catalog.products WHERE id = $1', [productId]);
    if (productCheck.rows.length === 0) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (data.is_universal) {
      await this.upsertCompatibilityRow(productId, null, true, data.notes);
      return;
    }

    const make = data.make?.trim();
    const model = data.model?.trim();
    if (!make || !model || !data.year_start) {
      throw new BadRequestException('Se requieren marca, modelo y año para la compatibilidad');
    }

    const start = Math.min(Math.max(data.year_start, 1900), 2100);
    const end = Math.min(Math.max(data.year_end || start, start), start + 39);
    const brand = await this.findOrCreateBrand(make);
    const modelRow = await this.findOrCreateModel(brand.id, model);
    const yearRows = await this.findOrCreateYearsForRange(modelRow.id, start, end);

    for (const yearRow of yearRows) {
      const specId = data.engine_transmission?.trim()
        ? await this.findOrCreateSpec(yearRow.id, data.engine_transmission.trim())
        : undefined;

      try {
        await this.addProductCompatibility(productId, 'system', {
          vehicle_brand_id: brand.id,
          vehicle_model_id: modelRow.id,
          vehicle_year_id: yearRow.id,
          vehicle_spec_id: specId,
          notes: data.notes,
        });
      } catch (error: any) {
        if (!String(error?.message || '').includes('Ya existe')) {
          throw error;
        }
      }

      const yearStart = Number(yearRow.year_start);
      const yearEnd = Number(yearRow.year_end ?? yearRow.year_start);
      for (let year = yearStart; year <= yearEnd; year += 1) {
        await this.linkVariantYear(productId, brand.name, modelRow.name, year, data.notes);
      }
    }
  }

  private normalizeVehicleCode(value: string): string {
    const code = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toUpperCase()
      .slice(0, 40);
    return code || `VEH_${Date.now().toString().slice(-6)}`;
  }

  private async findOrCreateBrand(name: string): Promise<VehicleBrand> {
    const existing = await dbPool.query(
      `SELECT id, name, code, is_active, display_order, created_at, updated_at
       FROM catalog.vehicle_brands
       WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))
          OR LOWER(TRIM(code)) = LOWER(TRIM($1))
       LIMIT 1`,
      [name],
    );
    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      if (!row.is_active) {
        await dbPool.query(
          `UPDATE catalog.vehicle_brands SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [row.id],
        );
        row.is_active = true;
      }
      return row;
    }

    let code = this.normalizeVehicleCode(name);
    const codeClash = await dbPool.query(`SELECT id FROM catalog.vehicle_brands WHERE code = $1`, [code]);
    if (codeClash.rows.length > 0) {
      code = `${code}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    }

    const created = await dbPool.query(
      `INSERT INTO catalog.vehicle_brands (name, code, is_active, display_order)
       VALUES ($1, $2, TRUE, 0)
       RETURNING id, name, code, is_active, display_order, created_at, updated_at`,
      [name, code],
    );
    return created.rows[0];
  }

  private async findOrCreateModel(brandId: string, name: string): Promise<VehicleModel> {
    const existing = await dbPool.query(
      `SELECT id, brand_id, name, code, is_active, display_order, created_at, updated_at
       FROM catalog.vehicle_models
       WHERE brand_id = $1
         AND (
           LOWER(TRIM(name)) = LOWER(TRIM($2))
           OR LOWER(TRIM(code)) = LOWER(TRIM($2))
           OR LOWER(regexp_replace(TRIM(name), '[^a-z0-9]', '', 'gi'))
            = LOWER(regexp_replace(TRIM($2), '[^a-z0-9]', '', 'gi'))
         )
       LIMIT 1`,
      [brandId, name],
    );
    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      if (!row.is_active) {
        await dbPool.query(
          `UPDATE catalog.vehicle_models SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [row.id],
        );
        row.is_active = true;
      }
      return row;
    }

    let code = this.normalizeVehicleCode(name);
    const codeClash = await dbPool.query(
      `SELECT id FROM catalog.vehicle_models WHERE brand_id = $1 AND code = $2`,
      [brandId, code],
    );
    if (codeClash.rows.length > 0) {
      code = `${code}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    }

    const created = await dbPool.query(
      `INSERT INTO catalog.vehicle_models (brand_id, name, code, is_active, display_order)
       VALUES ($1, $2, $3, TRUE, 0)
       RETURNING id, brand_id, name, code, is_active, display_order, created_at, updated_at`,
      [brandId, name, code],
    );
    return created.rows[0];
  }

  private async findOrCreateYearsForRange(
    modelId: string,
    start: number,
    end: number,
  ): Promise<VehicleYear[]> {
    const existing = await this.getYearsByModel(modelId);
    const overlapping = existing.filter((year) => {
      const yearStart = Number(year.year_start);
      const yearEnd = year.year_end == null ? 2100 : Number(year.year_end);
      return yearStart <= end && start <= yearEnd;
    });

    const covered = new Set<number>();
    for (const year of existing) {
      const yearStart = Number(year.year_start);
      const yearEnd = year.year_end == null ? 2100 : Number(year.year_end);
      for (let value = Math.max(yearStart, start); value <= Math.min(yearEnd, end); value += 1) {
        covered.add(value);
      }
    }

    const missing: Array<{ year_start: number; year_end: number }> = [];
    for (let value = start; value <= end; value += 1) {
      if (covered.has(value)) continue;
      const last = missing[missing.length - 1];
      if (last && last.year_end + 1 === value) {
        last.year_end = value;
      } else {
        missing.push({ year_start: value, year_end: value });
      }
    }

    const created: VehicleYear[] = [];
    for (const range of missing) {
      const inserted = await dbPool.query(
        `INSERT INTO catalog.vehicle_years (model_id, year_start, year_end, generation, is_active)
         VALUES ($1, $2, $3, NULL, TRUE)
         RETURNING id, model_id, year_start, year_end, generation, is_active, created_at, updated_at`,
        [modelId, range.year_start, range.year_end],
      );
      created.push(inserted.rows[0]);
    }

    return [...overlapping, ...created];
  }

  private async findOrCreateSpec(yearId: string, engineTransmission: string): Promise<string> {
    const existing = await dbPool.query(
      `SELECT id
       FROM catalog.vehicle_specs
       WHERE year_id = $1
         AND is_active = TRUE
         AND (
           LOWER(TRIM(COALESCE(engine_code, ''))) = LOWER(TRIM($2))
           OR LOWER(TRIM(COALESCE(engine_displacement, ''))) = LOWER(TRIM($2))
           OR LOWER(CONCAT_WS(' ', engine_displacement, engine_code, transmission_type, drivetrain))
              = LOWER(TRIM($2))
         )
       LIMIT 1`,
      [yearId, engineTransmission],
    );
    if (existing.rows.length > 0) return existing.rows[0].id;

    const displacement = engineTransmission.match(/\d+(\.\d+)?\s*L/i)?.[0]?.replace(/\s+/g, '') || null;
    const drivetrain = engineTransmission.match(/\b(FWD|RWD|AWD|4WD)\b/i)?.[0]?.toUpperCase() || null;
    const transmission = engineTransmission.match(/\b(CVT|DCT|Manual|Autom[aá]tica|AT|MT)\b/i)?.[0] || null;

    const created = await dbPool.query(
      `INSERT INTO catalog.vehicle_specs (
         year_id, engine_code, engine_displacement, transmission_type, drivetrain, is_active
       ) VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING id`,
      [yearId, engineTransmission.slice(0, 50), displacement, transmission, drivetrain],
    );
    return created.rows[0].id;
  }

  private async linkVariantYear(
    productId: string,
    make: string,
    model: string,
    year: number,
    notes?: string,
  ): Promise<void> {
    let variantRes = await dbPool.query(
      `SELECT id FROM catalog.vehicle_variants
       WHERE LOWER(TRIM(make)) = LOWER(TRIM($1))
         AND LOWER(TRIM(model)) = LOWER(TRIM($2))
         AND year = $3
         AND COALESCE(body_trim, '') = ''
         AND COALESCE(engine_transmission, '') = ''`,
      [make, model, year],
    );

    let variantId: string;
    if (variantRes.rows.length > 0) {
      variantId = variantRes.rows[0].id;
    } else {
      const created = await dbPool.query(
        `INSERT INTO catalog.vehicle_variants (make, model, year, body_trim, engine_transmission, is_active)
         VALUES ($1, $2, $3, NULL, NULL, TRUE)
         RETURNING id`,
        [make, model, year],
      );
      variantId = created.rows[0].id;
    }

    await this.upsertCompatibilityRow(productId, variantId, false, notes);
  }

  private async upsertCompatibilityRow(
    productId: string,
    variantId: string | null,
    isUniversal: boolean,
    notes?: string,
  ): Promise<{
    id: string;
    product_id: string;
    vehicle_variant_id: string | null;
    is_universal: boolean;
    notes: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }> {
    const existing = isUniversal
      ? await dbPool.query(
          `SELECT id, product_id, vehicle_variant_id, is_universal, notes, is_active, created_at, updated_at
           FROM catalog.product_vehicle_compatibility
           WHERE product_id = $1 AND is_universal = TRUE
           LIMIT 1`,
          [productId],
        )
      : await dbPool.query(
          `SELECT id, product_id, vehicle_variant_id, is_universal, notes, is_active, created_at, updated_at
           FROM catalog.product_vehicle_compatibility
           WHERE product_id = $1 AND vehicle_variant_id = $2 AND is_universal = FALSE
           LIMIT 1`,
          [productId, variantId],
        );

    if (existing.rows.length > 0) {
      const updated = await dbPool.query(
        `UPDATE catalog.product_vehicle_compatibility
         SET is_active = TRUE, notes = COALESCE($2, notes), updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING id, product_id, vehicle_variant_id, is_universal, notes, is_active, created_at, updated_at`,
        [existing.rows[0].id, notes || null],
      );
      return updated.rows[0];
    }

    const inserted = await dbPool.query(
      `INSERT INTO catalog.product_vehicle_compatibility (product_id, vehicle_variant_id, is_universal, is_active, notes)
       VALUES ($1, $2, $3, TRUE, $4)
       RETURNING id, product_id, vehicle_variant_id, is_universal, notes, is_active, created_at, updated_at`,
      [productId, variantId, isUniversal, notes || null],
    );
    return inserted.rows[0];
  }
}

