import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { dbPool } from '../../config/database.config';
import { ListServiceRegionsDto } from './dto/list-service-regions.dto';

export interface ServiceRegion {
  id: string;
  name: string;
  description?: string;
  city: string;
  state: string;
  country: string;
  center_longitude: number;
  center_latitude: number;
  is_active: boolean;
  is_default: boolean;
  max_delivery_radius_meters: number;
  min_order_amount: number;
  coverage_area_geojson?: string;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class ServiceRegionsService {
  async findAll(query: ListServiceRegionsDto) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      const page = query.page || 1;
      const limit = query.limit || 20;
      const offset = (page - 1) * limit;

      // Construir WHERE clause
      const whereConditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (query.isActive !== undefined) {
        whereConditions.push(`sr.is_active = $${paramIndex}`);
        params.push(query.isActive);
        paramIndex++;
      }

      if (query.isDefault !== undefined) {
        whereConditions.push(`sr.is_default = $${paramIndex}`);
        params.push(query.isDefault);
        paramIndex++;
      }

      if (query.search) {
        whereConditions.push(
          `(sr.name ILIKE $${paramIndex} OR sr.city ILIKE $${paramIndex} OR sr.state ILIKE $${paramIndex})`
        );
        params.push(`%${query.search}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Construir ORDER BY
      const sortBy = query.sortBy || 'created_at';
      const sortOrder = query.sortOrder || 'desc';
      const validSortColumns = ['created_at', 'name', 'city', 'state'];
      const orderByColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
      const orderBy = `ORDER BY sr.${orderByColumn} ${sortOrder.toUpperCase()}`;

      // Query principal
      const sqlQuery = `
        SELECT 
          sr.id,
          sr.name,
          sr.description,
          sr.city,
          sr.state,
          sr.country,
          (sr.center_point)[0]::DOUBLE PRECISION as center_longitude,
          (sr.center_point)[1]::DOUBLE PRECISION as center_latitude,
          sr.is_active,
          sr.is_default,
          sr.max_delivery_radius_meters,
          sr.min_order_amount,
          ST_AsGeoJSON(sr.coverage_area)::TEXT as coverage_area_geojson,
          sr.created_at,
          sr.updated_at
        FROM core.service_regions sr
        ${whereClause}
        ${orderBy}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limit, offset);

      const result = await dbPool.query(sqlQuery, params);
      const regions = result.rows as ServiceRegion[];

      // Query de conteo
      const countQuery = `
        SELECT COUNT(*) as total
        FROM core.service_regions sr
        ${whereClause}
      `;

      const countParams = params.slice(0, -2); // Remover limit y offset
      const countResult = await dbPool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total, 10);

      return {
        data: regions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      console.error('❌ Error en findAll service-regions:', error);
      throw new ServiceUnavailableException(
        `Error al obtener zonas: ${error.message}`
      );
    }
  }

  async findOne(id: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      const sqlQuery = `
        SELECT 
          sr.id,
          sr.name,
          sr.description,
          sr.city,
          sr.state,
          sr.country,
          (sr.center_point)[0]::DOUBLE PRECISION as center_longitude,
          (sr.center_point)[1]::DOUBLE PRECISION as center_latitude,
          sr.is_active,
          sr.is_default,
          sr.max_delivery_radius_meters,
          sr.min_order_amount,
          ST_AsGeoJSON(sr.coverage_area)::TEXT as coverage_area_geojson,
          sr.created_at,
          sr.updated_at
        FROM core.service_regions sr
        WHERE sr.id = $1
      `;

      const result = await dbPool.query(sqlQuery, [id]);

      if (result.rows.length === 0) {
        throw new NotFoundException(`Zona con ID ${id} no encontrada`);
      }

      return result.rows[0] as ServiceRegion;
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('❌ Error en findOne service-regions:', error);
      throw new ServiceUnavailableException(
        `Error al obtener zona: ${error.message}`
      );
    }
  }

  async getStatistics() {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      const sqlQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE is_active = TRUE) as active,
          COUNT(*) FILTER (WHERE is_active = FALSE) as inactive,
          COUNT(*) FILTER (WHERE is_default = TRUE) as default_count
        FROM core.service_regions
      `;

      const result = await dbPool.query(sqlQuery);
      const stats = result.rows[0];

      return {
        total: parseInt(stats.total, 10),
        active: parseInt(stats.active, 10),
        inactive: parseInt(stats.inactive, 10),
        default_count: parseInt(stats.default_count, 10),
      };
    } catch (error: any) {
      console.error('❌ Error en getStatistics service-regions:', error);
      throw new ServiceUnavailableException(
        `Error al obtener estadísticas: ${error.message}`
      );
    }
  }

  async getBusinessesByRegion(regionId: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      // Buscar tiendas que estén dentro del polígono de la zona usando PostGIS
      // También incluimos tiendas dentro del radio máximo de entrega como fallback
      // NOTA: ST_MakePoint(longitude, latitude) - el orden es importante
      const sqlQuery = `
        SELECT DISTINCT
          b.id,
          b.name,
          b.description,
          b.category,
          b.is_active,
          (b.location)[0]::DOUBLE PRECISION as longitude,
          (b.location)[1]::DOUBLE PRECISION as latitude
        FROM core.businesses b
        CROSS JOIN core.service_regions sr
        WHERE sr.id = $1
          AND sr.is_active = TRUE
          AND b.location IS NOT NULL
          AND (
            -- Opción 1: Dentro del polígono de cobertura
            ST_Within(
              ST_SetSRID(
                ST_MakePoint(
                  (b.location)[0]::DOUBLE PRECISION, 
                  (b.location)[1]::DOUBLE PRECISION
                ), 
                4326
              ),
              sr.coverage_area
            )
            OR
            -- Opción 2: Dentro del radio máximo de entrega desde el centro (fallback)
            ST_DWithin(
              ST_SetSRID(
                ST_MakePoint(
                  (b.location)[0]::DOUBLE PRECISION, 
                  (b.location)[1]::DOUBLE PRECISION
                )::geography,
                4326
              ),
              ST_SetSRID(
                ST_MakePoint(
                  (sr.center_point)[0]::DOUBLE PRECISION,
                  (sr.center_point)[1]::DOUBLE PRECISION
                )::geography,
                4326
              ),
              sr.max_delivery_radius_meters
            )
          )
        ORDER BY b.name ASC
      `;

      const result = await dbPool.query(sqlQuery, [regionId]);
      
      // Log para debugging
      if (result.rows.length > 0) {
      }
      
      return result.rows;
    } catch (error: any) {
      console.error('❌ Error en getBusinessesByRegion:', error);
      throw new ServiceUnavailableException(
        `Error al obtener tiendas de la zona: ${error.message}`
      );
    }
  }
}




