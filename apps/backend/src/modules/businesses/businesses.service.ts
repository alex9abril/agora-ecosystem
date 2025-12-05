import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common';
import { supabaseAdmin } from '../../config/supabase.config';
import { dbPool } from '../../config/database.config';
import { ListBusinessesDto } from './dto/list-businesses.dto';
import { UpdateBusinessStatusDto } from './dto/update-business-status.dto';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessAddressDto } from './dto/update-business-address.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { CreateBusinessGroupDto } from './dto/create-business-group.dto';
import { UpdateBusinessGroupDto } from './dto/update-business-group.dto';

@Injectable()
export class BusinessesService {
  /**
   * Método de prueba para diagnosticar problemas de conexión
   */
  async testConnection() {
    if (!supabaseAdmin) {
      return { error: 'Supabase client no configurado' };
    }

    const results: any = {};

    // Probar diferentes variaciones del nombre de tabla
    const tableNames = ['businesses', 'core.businesses', 'public.businesses'];

    // Probar con formato 'core.table'
    try {
      const { data, error, count } = await supabaseAdmin
        .from('core.businesses')
        .select('*', { count: 'exact', head: true });

      results['core.businesses'] = {
        success: !error,
        error: error ? {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        } : null,
        count: count || 0,
      };
    } catch (e: any) {
      results['core.businesses'] = {
        success: false,
        error: {
          message: e.message,
          stack: e.stack,
        },
      };
    }

    for (const tableName of tableNames) {
      try {
        const { data, error, count } = await supabaseAdmin
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        results[tableName] = {
          success: !error,
          error: error ? {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          } : null,
          count: count || 0,
        };
      } catch (e: any) {
        results[tableName] = {
          success: false,
          error: {
            message: e.message,
            stack: e.stack,
          },
        };
      }
    }

    // También probar user_profiles para comparar
    try {
      const { data, error } = await supabaseAdmin
        .from('core.user_profiles')
        .select('*', { count: 'exact', head: true });

      results['user_profiles'] = {
        success: !error,
        error: error ? {
          message: error.message,
          code: error.code,
        } : null,
        count: data ? 1 : 0,
      };
    } catch (e: any) {
      results['user_profiles'] = {
        success: false,
        error: { message: e.message },
      };
    }

    return results;
  }

  /**
   * Listar negocios con filtros y paginación
   */
  async findAll(query: ListBusinessesDto) {
    if (!supabaseAdmin) {
      throw new ServiceUnavailableException('Servicio de base de datos no configurado');
    }

    const {
      page = 1,
      limit = 20,
      isActive,
      category,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = query;

    const offset = (page - 1) * limit;

    // Construir query base
    // IMPORTANTE: Si las tablas están en el schema 'core', Supabase PostgREST necesita
    // estar configurado para exponer ese schema, o usar el formato 'core.table'
    // Por ahora, intentamos primero sin schema prefix, luego con 'core.'
    console.log('🔍 Querying businesses with filters:', {
      page,
      limit,
      isActive,
      category,
      search,
      sortBy,
      sortOrder,
    });

    // IMPORTANTE: Las tablas están en el schema 'core'
    // PostgREST no expone schemas personalizados por defecto, así que usamos conexión directa a PostgreSQL
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada. Configura DATABASE_URL o SUPABASE_DB_URL en .env');
    }

    // TypeScript type guard: después de la verificación, dbPool no es null
    const pool = dbPool;

    // Construir query SQL directa
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (isActive !== undefined) {
      whereConditions.push(`is_active = $${paramIndex}`);
      queryParams.push(isActive);
      paramIndex++;
    }

    if (category) {
      whereConditions.push(`category = $${paramIndex}`);
      queryParams.push(category);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`, `%${search}%`);
      paramIndex += 2;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Obtener total para paginación
    const countQuery = `SELECT COUNT(*) as total FROM core.businesses ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Query principal con paginación
    // Extraer coordenadas del POINT para facilitar el uso en el frontend
    const orderBy = sortBy || 'created_at';
    const orderDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';
    
    queryParams.push(limit, offset);

    let result;
    let data: any[] = [];
    
    // Usar notación de array de PostgreSQL para POINT: (point)[0] para X, (point)[1] para Y
    // ST_X/ST_Y solo funcionan con geometry (PostGIS), no con POINT nativo
    const sqlQuery = `
      SELECT 
        *,
        (location)[0] as longitude,
        (location)[1] as latitude
      FROM core.businesses 
      ${whereClause}
      ORDER BY ${orderBy} ${orderDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    try {
      result = await pool.query(sqlQuery, queryParams);
      data = result.rows || [];
    } catch (error: any) {
      console.error('❌ Error ejecutando query de businesses:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
      });
      
      // Si falla, intentar sin extraer coordenadas y hacerlo manualmente
      console.log('🔄 Reintentando sin extraer coordenadas en SQL...');
      const fallbackQuery = `
        SELECT * FROM core.businesses 
        ${whereClause}
        ORDER BY ${orderBy} ${orderDirection}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      result = await pool.query(fallbackQuery, queryParams);
      data = result.rows || [];
      
      // Extraer coordenadas manualmente del campo location (POINT)
      if (data.length > 0 && data[0].location) {
        console.log('⚠️  Extrayendo coordenadas manualmente del campo location');
        for (const row of data) {
          if (row.location && typeof row.location === 'object') {
            // Si location es un objeto Point de PostgreSQL
            if (row.location.x !== undefined && row.location.y !== undefined) {
              row.longitude = row.location.x;
              row.latitude = row.location.y;
            }
          } else if (row.location && typeof row.location === 'string') {
            // Si location es un string en formato POINT(x y)
            const match = row.location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
            if (match) {
              row.longitude = parseFloat(match[1]);
              row.latitude = parseFloat(match[2]);
            }
          }
        }
      }
    }

    console.log('✅ Businesses query result:', {
      count: total,
      dataLength: data?.length || 0,
      firstItem: data?.[0] ? { id: data[0].id, name: data[0].name } : null,
    });

    // Enriquecer datos con información del propietario usando conexión directa a PostgreSQL
    const enrichedData = await Promise.all(
      (data || []).map(async (business: any) => {
        if (business.owner_id) {
          try {
            const profileResult = await pool.query(
              'SELECT first_name, last_name, phone FROM core.user_profiles WHERE id = $1',
              [business.owner_id]
            );
            const profile = profileResult.rows[0] || null;
            return {
              ...business,
              owner: profile,
            };
          } catch (e) {
            console.error(`Error obteniendo owner para business ${business.id}:`, e);
            return { ...business, owner: null };
          }
        }
        return { ...business, owner: null };
      })
    );

    return {
      data: enrichedData,
      pagination: {
        page,
        limit,
        total: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtener un negocio por ID
   */
  async findOne(id: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;
    
    // Usar notación de array de PostgreSQL para POINT: (point)[0] para X, (point)[1] para Y
    let result;
    try {
      result = await pool.query(
        `SELECT 
          b.*,
          (b.location)[0] as longitude,
          (b.location)[1] as latitude,
          bc.name as category_name,
          bc.description as category_description,
          bc.icon_url as category_icon_url
        FROM core.businesses b
        LEFT JOIN core.business_categories bc ON b.category_id = bc.id
        WHERE b.id = $1`,
        [id]
      );
    } catch (error: any) {
      console.error('❌ Error ejecutando findOne query:', {
        message: error.message,
        code: error.code,
      });
      
      // Si falla, intentar sin extraer coordenadas y hacerlo manualmente
      console.log('🔄 Reintentando findOne sin extraer coordenadas en SQL...');
      result = await pool.query(
        'SELECT * FROM core.businesses WHERE id = $1',
        [id]
      );
      
      // Extraer coordenadas manualmente del campo location (POINT)
      if (result.rows.length > 0 && result.rows[0].location) {
        const row = result.rows[0];
        if (row.location && typeof row.location === 'object') {
          if (row.location.x !== undefined && row.location.y !== undefined) {
            row.longitude = row.location.x;
            row.latitude = row.location.y;
          }
        } else if (row.location && typeof row.location === 'string') {
          const match = row.location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
          if (match) {
            row.longitude = parseFloat(match[1]);
            row.latitude = parseFloat(match[2]);
          }
        }
      }
    }

    if (result.rows.length === 0) {
      throw new NotFoundException(`Negocio con ID ${id} no encontrado`);
    }

    const business = result.rows[0];

    // Enriquecer con información del propietario
    if (business.owner_id) {
      try {
        const profileResult = await pool.query(
          'SELECT first_name, last_name, phone FROM core.user_profiles WHERE id = $1',
          [business.owner_id]
        );
        return {
          ...business,
          owner: profileResult.rows[0] || null,
        };
      } catch (e) {
        console.error(`Error obteniendo owner para business ${id}:`, e);
        return { ...business, owner: null };
      }
    }

    return { ...business, owner: null };
  }

  /**
   * Actualizar estado de un negocio (activar/desactivar)
   */
  async updateStatus(id: string, updateDto: UpdateBusinessStatusDto) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;
    // Verificar que el negocio existe
    await this.findOne(id);

    // Actualizar estado
    const result = await pool.query(
      `UPDATE core.businesses 
       SET is_active = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [updateDto.isActive, id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Negocio con ID ${id} no encontrado`);
    }

    return result.rows[0];
  }

  /**
   * Actualizar información básica de un negocio
   */
  async update(id: string, ownerId: string, updateDto: UpdateBusinessDto) {
    try {
      if (!dbPool) {
        throw new ServiceUnavailableException('Conexión a base de datos no configurada');
      }

      const pool = dbPool;

      // Verificar que el negocio existe y pertenece al usuario
      const business = await this.findOne(id);
      if (!business) {
        throw new NotFoundException(`Negocio con ID ${id} no encontrado`);
      }

      // Verificar que el usuario tiene permisos (es superadmin del negocio)
      const businessUserCheck = await pool.query(
        `SELECT role FROM core.business_users 
         WHERE business_id = $1 AND user_id = $2 AND is_active = TRUE`,
        [id, ownerId]
      );

      if (businessUserCheck.rows.length === 0 || businessUserCheck.rows[0].role !== 'superadmin') {
        throw new BadRequestException('No tienes permisos para actualizar este negocio');
      }

    // Resolver category_id si se proporciona category (nombre)
    let categoryId: string | null = null;
    if (updateDto.category_id) {
      const categoryCheck = await pool.query(
        'SELECT id FROM core.business_categories WHERE id = $1 AND is_active = true',
        [updateDto.category_id]
      );
      if (categoryCheck.rows.length === 0) {
        throw new BadRequestException('La categoría especificada no existe o está inactiva');
      }
      categoryId = updateDto.category_id;
    } else if (updateDto.category) {
      const categoryCheck = await pool.query(
        'SELECT id FROM core.business_categories WHERE name = $1 AND is_active = true',
        [updateDto.category]
      );
      if (categoryCheck.rows.length > 0) {
        categoryId = categoryCheck.rows[0].id;
      }
    }

    // Preparar tags - asegurar que sea un array válido o null
    const tagsArray = Array.isArray(updateDto.tags) && updateDto.tags.length > 0 
      ? updateDto.tags 
      : null;

    // Construir la consulta UPDATE dinámicamente
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (updateDto.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(updateDto.name);
    }
    if (updateDto.legal_name !== undefined) {
      updateFields.push(`legal_name = $${paramIndex++}`);
      updateValues.push(updateDto.legal_name || null);
    }
    if (updateDto.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      updateValues.push(updateDto.description || null);
    }
    if (updateDto.category !== undefined) {
      updateFields.push(`category = $${paramIndex++}`);
      updateValues.push(updateDto.category);
    }
    if (categoryId !== null) {
      updateFields.push(`category_id = $${paramIndex++}`);
      updateValues.push(categoryId);
    } else if (updateDto.category_id === null) {
      // Permitir limpiar category_id
      updateFields.push(`category_id = NULL`);
    }
    if (updateDto.tags !== undefined) {
      updateFields.push(`tags = $${paramIndex++}`);
      updateValues.push(tagsArray);
    }
    if (updateDto.phone !== undefined) {
      updateFields.push(`phone = $${paramIndex++}`);
      updateValues.push(updateDto.phone || null);
    }
    if (updateDto.email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`);
      updateValues.push(updateDto.email || null);
    }
    if (updateDto.website_url !== undefined) {
      updateFields.push(`website_url = $${paramIndex++}`);
      updateValues.push(updateDto.website_url || null);
    }
    if (updateDto.slug !== undefined) {
      updateFields.push(`slug = $${paramIndex++}`);
      updateValues.push(updateDto.slug || null);
    }
    if (updateDto.accepts_pickup !== undefined) {
      updateFields.push(`accepts_pickup = $${paramIndex++}`);
      updateValues.push(updateDto.accepts_pickup);
    }
    if (updateDto.is_active !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      updateValues.push(updateDto.is_active);
    }

    if (updateFields.length === 0) {
      throw new BadRequestException('No se proporcionaron campos para actualizar');
    }

    // Agregar updated_at
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    // El id va al final del array de valores
    updateValues.push(id);

      const updateQuery = `
        UPDATE core.businesses 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await pool.query(updateQuery, updateValues);

      if (result.rows.length === 0) {
        throw new NotFoundException(`Negocio con ID ${id} no encontrado`);
      }

      return result.rows[0];
    } catch (error: any) {
      console.error('❌ Error actualizando negocio:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        stack: error.stack,
        id,
        ownerId,
        updateDto,
      });
      
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ServiceUnavailableException) {
        throw error;
      }
      
      throw new ServiceUnavailableException(`Error al actualizar negocio: ${error.message}`);
    }
  }

  /**
   * Actualizar la dirección de un negocio
   */
  async updateAddress(id: string, ownerId: string, updateDto: UpdateBusinessAddressDto) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;

    // Verificar que el negocio existe y pertenece al usuario
    const business = await this.findOne(id);
    if (!business) {
      throw new NotFoundException(`Negocio con ID ${id} no encontrado`);
    }

    // Verificar que el usuario tiene permisos (es superadmin del negocio)
    const businessUserCheck = await pool.query(
      `SELECT role FROM core.business_users 
       WHERE business_id = $1 AND user_id = $2 AND is_active = TRUE`,
      [id, ownerId]
    );

    if (businessUserCheck.rows.length === 0 || businessUserCheck.rows[0].role !== 'superadmin') {
      throw new BadRequestException('No tienes permisos para actualizar la dirección de este negocio');
    }

    // Validar que la nueva ubicación está dentro de una zona de cobertura activa
    const locationValidation = await this.validateLocationInRegion(
      updateDto.longitude,
      updateDto.latitude
    );

    if (!locationValidation.isValid) {
      throw new BadRequestException(
        locationValidation.message || 
        'La nueva ubicación está fuera de todas las zonas de cobertura activas. Por favor, selecciona una ubicación dentro de una zona de cobertura.'
      );
    }

    // Dividir address_line1 en street y street_number si es posible
    let street = updateDto.address_line1 || null;
    let streetNumber = null;
    
    if (street) {
      const numberMatch = street.match(/(.+?)\s+(\d+)$/);
      if (numberMatch) {
        street = numberMatch[1].trim();
        streetNumber = numberMatch[2];
      }
    }

    // Si el negocio ya tiene una dirección, actualizarla; si no, crear una nueva
    let addressId: string | null = business.address_id || null;

    if (addressId) {
      // Actualizar dirección existente
      await pool.query(
        `UPDATE core.addresses 
         SET 
           street = $1,
           street_number = $2,
           neighborhood = $3,
           city = $4,
           state = $5,
           postal_code = $6,
           country = $7,
           location = ST_MakePoint($8, $9)::point,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $10`,
        [
          street,
          streetNumber,
          updateDto.address_line2 || null,
          updateDto.city || null,
          updateDto.state || null,
          updateDto.postal_code || null,
          updateDto.country || 'México',
          updateDto.longitude,
          updateDto.latitude,
          addressId,
        ]
      );
    } else {
      // Crear nueva dirección
      const addressResult = await pool.query(
        `INSERT INTO core.addresses (
          user_id, label, street, street_number, neighborhood, 
          city, state, postal_code, country, location, is_default, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, ST_MakePoint($10, $11)::point, $12, $13)
        RETURNING id`,
        [
          ownerId,
          'Local',
          street,
          streetNumber,
          updateDto.address_line2 || null,
          updateDto.city || null,
          updateDto.state || null,
          updateDto.postal_code || null,
          updateDto.country || 'México',
          updateDto.longitude,
          updateDto.latitude,
          true,
          true,
        ]
      );
      addressId = addressResult.rows[0]?.id || null;
    }

    // Log de diagnóstico antes de actualizar
    console.log('[BusinessesService.updateAddress] Actualizando coordenadas:', {
      business_id: id,
      input_longitude: updateDto.longitude,
      input_latitude: updateDto.latitude,
    });

    // Actualizar el negocio con la nueva ubicación y address_id
    // También obtener la dirección formateada con un JOIN
    const businessResult = await pool.query(
      `UPDATE core.businesses b
       SET 
         address_id = $1,
         location = ST_MakePoint($2, $3)::point,
         updated_at = CURRENT_TIMESTAMP 
       WHERE b.id = $4 
       RETURNING 
         b.*,
         (b.location)[0] as longitude,
         (b.location)[1] as latitude`,
      [addressId, updateDto.longitude, updateDto.latitude, id]
    );

    if (businessResult.rows.length === 0) {
      throw new NotFoundException(`Negocio con ID ${id} no encontrado`);
    }

    const updatedBusiness = businessResult.rows[0];

    // Obtener la dirección formateada si existe
    if (addressId) {
      const addressResult = await pool.query(
        `SELECT 
          a.street,
          a.street_number,
          a.neighborhood,
          a.city as address_city,
          a.state as address_state,
          a.postal_code,
          a.country as address_country,
          CONCAT_WS(', ',
            NULLIF(CONCAT_WS(' ', a.street, a.street_number), ''),
            NULLIF(a.neighborhood, ''),
            NULLIF(a.city, ''),
            NULLIF(a.state, ''),
            NULLIF(a.postal_code, '')
          ) as business_address
        FROM core.addresses a
        WHERE a.id = $1`,
        [addressId]
      );

      if (addressResult.rows.length > 0) {
        const addressData = addressResult.rows[0];
        updatedBusiness.street = addressData.street;
        updatedBusiness.street_number = addressData.street_number;
        updatedBusiness.neighborhood = addressData.neighborhood;
        updatedBusiness.address_city = addressData.address_city;
        updatedBusiness.address_state = addressData.address_state;
        updatedBusiness.postal_code = addressData.postal_code;
        updatedBusiness.address_country = addressData.address_country;
        updatedBusiness.business_address = addressData.business_address;
      }
    }

    // Asegurar que las coordenadas estén extraídas correctamente
    if (!updatedBusiness.longitude || !updatedBusiness.latitude) {
      if (updatedBusiness.location) {
        if (typeof updatedBusiness.location === 'object' && updatedBusiness.location.x !== undefined) {
          updatedBusiness.longitude = updatedBusiness.location.x;
          updatedBusiness.latitude = updatedBusiness.location.y;
        } else if (typeof updatedBusiness.location === 'string') {
          const match = updatedBusiness.location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
          if (match) {
            updatedBusiness.longitude = parseFloat(match[1]);
            updatedBusiness.latitude = parseFloat(match[2]);
          }
        }
      }
    }

    // Formatear el objeto location para el frontend
    if (updatedBusiness.longitude && updatedBusiness.latitude) {
      updatedBusiness.location = {
        longitude: updatedBusiness.longitude,
        latitude: updatedBusiness.latitude,
      };
    }

    // Log de diagnóstico después de actualizar
    console.log('[BusinessesService.updateAddress] Negocio actualizado:', {
      stored_location: businessResult.rows[0].location,
      extracted_longitude: updatedBusiness.longitude,
      extracted_latitude: updatedBusiness.latitude,
      formatted_location: updatedBusiness.location,
      business_address: updatedBusiness.business_address,
      address_id: addressId,
    });

    return updatedBusiness;
  }

  /**
   * Crear un nuevo negocio
   */
  async create(ownerId: string, createDto: CreateBusinessDto) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;

    try {

    // Permitir múltiples sucursales por usuario (múltiples negocios)
    // Ya no hay restricción de un solo negocio por cuenta

    // Validar que la ubicación esté dentro de la región activa
    const locationValidation = await this.validateLocationInRegion(
      createDto.longitude,
      createDto.latitude
    );

    if (!locationValidation.isValid) {
      throw new BadRequestException(
        locationValidation.message || 'La ubicación del negocio está fuera de la zona de cobertura activa. Por el momento solo operamos en La Roma, CDMX.'
      );
    }

    // Resolver category_id si se proporciona category (nombre)
    let categoryId: string | null = null;
    if (createDto.category_id) {
      // Si se proporciona category_id directamente, validar que existe
      const categoryCheck = await pool.query(
        'SELECT id FROM core.business_categories WHERE id = $1 AND is_active = true',
        [createDto.category_id]
      );
      if (categoryCheck.rows.length === 0) {
        throw new BadRequestException('La categoría especificada no existe o está inactiva');
      }
      categoryId = createDto.category_id;
    } else if (createDto.category) {
      // Si se proporciona category (nombre), buscar el ID correspondiente
      const categoryCheck = await pool.query(
        'SELECT id FROM core.business_categories WHERE name = $1 AND is_active = true',
        [createDto.category]
      );
      if (categoryCheck.rows.length > 0) {
        categoryId = categoryCheck.rows[0].id;
      }
      // Si no se encuentra en el catálogo, categoryId será null pero category (nombre) se guardará
    }

    // Crear dirección si se proporciona información de dirección
    // Mapear los campos del DTO a las columnas reales de la tabla addresses
    let addressId: string | null = null;
    if (createDto.address_line1 || createDto.city) {
      // Dividir address_line1 en street y street_number si es posible
      // Ejemplo: "Avenida Álvaro Obregón 45" -> street: "Avenida Álvaro Obregón", street_number: "45"
      let street = createDto.address_line1 || null;
      let streetNumber = null;
      
      if (street) {
        // Intentar extraer el número de la calle (último número al final)
        const numberMatch = street.match(/(.+?)\s+(\d+)$/);
        if (numberMatch) {
          street = numberMatch[1].trim();
          streetNumber = numberMatch[2];
        }
      }

      const addressResult = await pool.query(
        `INSERT INTO core.addresses (
          user_id, label, street, street_number, neighborhood, 
          city, state, postal_code, country, location, is_default, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, ST_MakePoint($10, $11)::point, $12, $13)
        RETURNING id`,
        [
          ownerId,
          'Local', // label
          street, // street (dirección completa o sin número)
          streetNumber, // street_number (número extraído)
          createDto.address_line2 || null, // neighborhood (colonia/barrio)
          createDto.city || null,
          createDto.state || null,
          createDto.postal_code || null,
          createDto.country || 'México',
          createDto.longitude,
          createDto.latitude,
          true, // is_default
          true, // is_active
        ]
      );
      addressId = addressResult.rows[0]?.id || null;
    }

    // Preparar tags - asegurar que sea un array válido
    const tagsArray = Array.isArray(createDto.tags) && createDto.tags.length > 0 
      ? createDto.tags 
      : null; // null en lugar de array vacío para evitar problemas

    // Preparar opening_hours - asegurar que sea JSONB válido
    let openingHoursJsonb = null;
    if (createDto.opening_hours) {
      try {
        // Si ya es un objeto, convertirlo a JSON
        openingHoursJsonb = typeof createDto.opening_hours === 'string' 
          ? createDto.opening_hours 
          : JSON.stringify(createDto.opening_hours);
      } catch (e) {
        console.warn('[BusinessesService] Error serializando opening_hours:', e);
        openingHoursJsonb = null;
      }
    }

    // Crear el negocio
    const businessResult = await pool.query(
      `INSERT INTO core.businesses (
        owner_id, name, legal_name, description, category, category_id, tags,
        phone, email, website_url, address_id, location,
        is_active, accepts_orders, accepts_pickup, uses_eco_packaging, opening_hours, slug
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, ST_MakePoint($12, $13)::point, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        ownerId,
        createDto.name,
        createDto.legal_name || null,
        createDto.description || null,
        createDto.category, // Mantener category (nombre) para compatibilidad
        categoryId, // category_id (FK al catálogo)
        tagsArray, // Array de tags o null
        createDto.phone || null,
        createDto.email || null,
        createDto.website_url || null,
        addressId,
        createDto.longitude,
        createDto.latitude,
        createDto.is_active !== undefined ? createDto.is_active : true, // is_active
        true, // accepts_orders
        createDto.accepts_pickup !== undefined ? createDto.accepts_pickup : false, // accepts_pickup
        createDto.uses_eco_packaging || false,
        openingHoursJsonb, // JSONB o null
        createDto.slug || null, // slug (se generará automáticamente si es null por el trigger)
      ]
    );

    const business = businessResult.rows[0];

    // Asignar rol superadmin al usuario que crea el negocio
    // Esto es necesario para que el sistema de roles funcione correctamente
    try {
      await pool.query(
        `INSERT INTO core.business_users (
          business_id, 
          user_id, 
          role, 
          permissions, 
          is_active,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (business_id, user_id) DO UPDATE SET
          role = 'superadmin',
          is_active = TRUE,
          updated_at = CURRENT_TIMESTAMP`,
        [
          business.id,
          ownerId,
          'superadmin',
          '{}', // JSONB se maneja automáticamente por PostgreSQL
          true,
        ]
      );
      console.log('[BusinessesService.create] Rol superadmin asignado al usuario:', ownerId);
    } catch (roleError: any) {
      console.error('[BusinessesService.create] Error al asignar rol superadmin:', roleError);
      // No lanzamos error aquí para no bloquear la creación del negocio
      // El usuario puede ser asignado manualmente después si es necesario
    }

    // Log de diagnóstico para verificar coordenadas guardadas
    console.log('[BusinessesService.create] Coordenadas guardadas:', {
      input_longitude: createDto.longitude,
      input_latitude: createDto.latitude,
      stored_location: business.location,
      extracted_longitude: business.longitude,
      extracted_latitude: business.latitude,
      location_type: typeof business.location,
    });

    // Extraer coordenadas del POINT si no se extrajeron en SQL
    if (business.location && (!business.longitude || !business.latitude)) {
      console.log('[BusinessesService.create] Extrayendo coordenadas manualmente...');
      if (typeof business.location === 'object' && business.location.x !== undefined) {
        business.longitude = business.location.x;
        business.latitude = business.location.y;
        console.log('[BusinessesService.create] Coordenadas extraídas desde objeto:', {
          longitude: business.longitude,
          latitude: business.latitude,
        });
      } else if (typeof business.location === 'string') {
        const match = business.location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
        if (match) {
          business.longitude = parseFloat(match[1]);
          business.latitude = parseFloat(match[2]);
          console.log('[BusinessesService.create] Coordenadas extraídas desde string:', {
            longitude: business.longitude,
            latitude: business.latitude,
          });
        }
      }
    }

    return business;
    } catch (error: any) {
      console.error('[BusinessesService] Error al crear negocio:', {
        error: error.message,
        stack: error.stack,
        ownerId,
        createDto: {
          ...createDto,
          email: createDto.email || 'no proporcionado',
        },
      });
      
      // Si es un error de base de datos conocido, lanzar BadRequestException
      if (error.code === '23505') { // Violación de constraint único
        throw new BadRequestException('Ya existe un negocio con estos datos');
      }
      if (error.code === '23503') { // Violación de foreign key
        throw new BadRequestException('Datos inválidos: referencia a registro inexistente');
      }
      if (error.code === '23502') { // Violación de NOT NULL
        throw new BadRequestException('Faltan campos requeridos');
      }
      
      // Para otros errores, lanzar el error original con más contexto
      throw new BadRequestException(
        `Error al crear el negocio: ${error.message || 'Error desconocido'}`
      );
    }
  }

  /**
   * Obtener el negocio del usuario actual (basado en business_users, no solo owner_id)
   * Retorna el negocio y el rol del usuario en ese negocio
   * @param ownerId - ID del usuario
   * @param businessId - ID de la tienda específica (opcional). Si se proporciona, retorna esa tienda si el usuario tiene acceso
   */
  async findByOwnerId(ownerId: string, businessId?: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;
    
    // Si se proporciona un businessId específico, obtener esa tienda
    if (businessId) {
      const result = await pool.query(
        `SELECT 
          b.*,
          (b.location)[0] as longitude,
          (b.location)[1] as latitude,
          bc.name as category_name,
          bc.description as category_description,
          bc.icon_url as category_icon_url,
          bu.role as user_role,
          bu.is_active as user_is_active_in_business,
          a.street,
          a.street_number,
          a.neighborhood,
          a.city as address_city,
          a.state as address_state,
          a.postal_code,
          a.country as address_country,
          CONCAT_WS(', ',
            NULLIF(CONCAT_WS(' ', a.street, a.street_number), ''),
            NULLIF(a.neighborhood, ''),
            NULLIF(a.city, ''),
            NULLIF(a.state, ''),
            NULLIF(a.postal_code, '')
          ) as business_address
        FROM core.business_users bu
        INNER JOIN core.businesses b ON bu.business_id = b.id
        LEFT JOIN core.business_categories bc ON b.category_id = bc.id
        LEFT JOIN core.addresses a ON b.address_id = a.id
        WHERE bu.user_id = $1
        AND bu.business_id = $2
        AND bu.is_active = TRUE
        LIMIT 1`,
        [ownerId, businessId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const business = result.rows[0];
      
      // Debug: Verificar coordenadas extraídas
      console.log('[BusinessesService.findByOwnerId] Coordenadas extraídas del POINT:', {
        business_id: business.id,
        location_raw: business.location,
        extracted_longitude: business.longitude,
        extracted_latitude: business.latitude,
        location_type: typeof business.location,
      });
      
      // Si no se pudieron extraer las coordenadas en SQL, hacerlo manualmente
      if (!business.longitude || !business.latitude) {
        if (business.location) {
          console.log('[BusinessesService.findByOwnerId] Extrayendo coordenadas manualmente...');
          if (typeof business.location === 'object' && business.location.x !== undefined) {
            business.longitude = business.location.x;
            business.latitude = business.location.y;
            console.log('[BusinessesService.findByOwnerId] Coordenadas extraídas desde objeto:', {
              longitude: business.longitude,
              latitude: business.latitude,
            });
          } else if (typeof business.location === 'string') {
            const match = business.location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
            if (match) {
              business.longitude = parseFloat(match[1]);
              business.latitude = parseFloat(match[2]);
              console.log('[BusinessesService.findByOwnerId] Coordenadas extraídas desde string:', {
                longitude: business.longitude,
                latitude: business.latitude,
              });
            }
          }
        }
      }
      
      // Formatear el objeto location para el frontend
      if (business.longitude && business.latitude) {
        business.location = {
          longitude: business.longitude,
          latitude: business.latitude,
        };
      }
      
      console.log('[BusinessesService.findByOwnerId] Negocio formateado:', {
        longitude: business.longitude,
        latitude: business.latitude,
        formatted_location: business.location,
      });
      
      return business;
    }
    
    // Si no se proporciona businessId, buscar el negocio del usuario usando business_users (sistema de roles)
    // Priorizar superadmin, luego admin, luego otros roles
    const result = await pool.query(
      `SELECT 
        b.*,
        (b.location)[0] as longitude,
        (b.location)[1] as latitude,
        bc.name as category_name,
        bc.description as category_description,
        bc.icon_url as category_icon_url,
        bu.role as user_role,
        bu.is_active as user_is_active_in_business,
        a.street,
        a.street_number,
        a.neighborhood,
        a.city as address_city,
        a.state as address_state,
        a.postal_code,
        a.country as address_country,
        CONCAT_WS(', ',
          NULLIF(CONCAT_WS(' ', a.street, a.street_number), ''),
          NULLIF(a.neighborhood, ''),
          NULLIF(a.city, ''),
          NULLIF(a.state, ''),
          NULLIF(a.postal_code, '')
        ) as business_address
      FROM core.business_users bu
      INNER JOIN core.businesses b ON bu.business_id = b.id
      LEFT JOIN core.business_categories bc ON b.category_id = bc.id
      LEFT JOIN core.addresses a ON b.address_id = a.id
      WHERE bu.user_id = $1
      AND bu.is_active = TRUE
      ORDER BY 
        CASE bu.role
          WHEN 'superadmin' THEN 1
          WHEN 'admin' THEN 2
          WHEN 'operations_staff' THEN 3
          WHEN 'kitchen_staff' THEN 4
        END,
        bu.created_at DESC
      LIMIT 1`,
      [ownerId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const business = result.rows[0];

    // Log de diagnóstico para verificar coordenadas recuperadas
    console.log('[BusinessesService.findByOwnerId] Coordenadas recuperadas:', {
      stored_location: business.location,
      extracted_longitude: business.longitude,
      extracted_latitude: business.latitude,
      location_type: typeof business.location,
    });

    // Si no se pudieron extraer las coordenadas en SQL, hacerlo manualmente
    if (!business.longitude || !business.latitude) {
      if (business.location) {
        console.log('[BusinessesService.findByOwnerId] Extrayendo coordenadas manualmente...');
        if (typeof business.location === 'object' && business.location.x !== undefined) {
          business.longitude = business.location.x;
          business.latitude = business.location.y;
          console.log('[BusinessesService.findByOwnerId] Coordenadas extraídas desde objeto:', {
            longitude: business.longitude,
            latitude: business.latitude,
          });
        } else if (typeof business.location === 'string') {
          const match = business.location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
          if (match) {
            business.longitude = parseFloat(match[1]);
            business.latitude = parseFloat(match[2]);
            console.log('[BusinessesService.findByOwnerId] Coordenadas extraídas desde string:', {
              longitude: business.longitude,
              latitude: business.latitude,
            });
          }
        }
      }
    }

    // Formatear el objeto location para el frontend (igual que en updateAddress)
    if (business.longitude && business.latitude) {
      business.location = {
        longitude: business.longitude,
        latitude: business.latitude,
      };
    }

    console.log('[BusinessesService.findByOwnerId] Negocio formateado:', {
      longitude: business.longitude,
      latitude: business.latitude,
      formatted_location: business.location,
    });

    return business;
  }

  /**
   * Obtener estadísticas de negocios
   */
  async getStatistics() {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;
    // Total de negocios
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM core.businesses');
    const total = parseInt(totalResult.rows[0].total, 10);

    // Negocios activos
    const activeResult = await pool.query(
      'SELECT COUNT(*) as active FROM core.businesses WHERE is_active = true'
    );
    const active = parseInt(activeResult.rows[0].active, 10);

    // Negocios inactivos
    const inactive = total - active;

    // Categorías más comunes
    const categoriesResult = await pool.query(
      `SELECT category, COUNT(*) as count 
       FROM core.businesses 
       WHERE is_active = true 
       GROUP BY category 
       ORDER BY count DESC`
    );

    const categories = categoriesResult.rows.map((row) => ({
      name: row.category,
      count: parseInt(row.count, 10),
    }));

    return {
      total,
      active,
      inactive,
      categories,
    };
  }

  /**
   * Obtener la región activa de servicio
   */
  async getActiveRegion() {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;
    
    try {
      // Intentar usar la función SQL si existe
      const result = await pool.query('SELECT * FROM core.get_active_region()');

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error: any) {
      // Si la función no existe (error 42883), intentar consulta directa
      if (error.code === '42883' || error.message?.includes('does not exist') || error.message?.includes('function')) {
        console.log('⚠️  Función get_active_region() no existe, usando consulta directa');
        
        try {
          // Consulta directa como fallback
          const result = await pool.query(
            `SELECT 
              sr.id,
              sr.name,
              sr.description,
              sr.city,
              sr.state,
              sr.country,
              (sr.center_point)[0]::DOUBLE PRECISION as center_longitude,
              (sr.center_point)[1]::DOUBLE PRECISION as center_latitude,
              sr.max_delivery_radius_meters,
              sr.min_order_amount,
              ST_AsGeoJSON(sr.coverage_area)::TEXT as coverage_area_geojson
            FROM core.service_regions sr
            WHERE sr.is_default = TRUE AND sr.is_active = TRUE
            LIMIT 1`
          );

          if (result.rows.length === 0) {
            return null;
          }

          return result.rows[0];
        } catch (fallbackError: any) {
          // Si la tabla tampoco existe, retornar null
          if (fallbackError.code === '42P01' || fallbackError.message?.includes('does not exist')) {
            console.log('⚠️  Tabla service_regions no existe. Ejecuta el script database/service_regions.sql');
            return null;
          }
          
          console.error('❌ Error obteniendo región activa:', {
            message: fallbackError.message,
            code: fallbackError.code,
            detail: fallbackError.detail,
          });
          throw new ServiceUnavailableException(`Error al obtener región activa: ${fallbackError.message}`);
        }
      }
      
      // Para otros errores, lanzar excepción
      console.error('❌ Error obteniendo región activa:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
      });
      throw new ServiceUnavailableException(`Error al obtener región activa: ${error.message}`);
    }
  }

  /**
   * Validar si una ubicación está dentro de alguna región activa y retornar la región específica
   */
  async validateLocationInRegion(longitude: number, latitude: number): Promise<{
    isValid: boolean;
    region?: any;
    regionName?: string;
    message?: string;
  }> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;
    
    try {
      // Intentar usar la función get_location_region para obtener la región específica
      try {
        const regionResult = await pool.query(
          'SELECT * FROM core.get_location_region($1, $2)',
          [longitude, latitude]
        );

        if (regionResult.rows.length > 0) {
          const regionData = regionResult.rows[0];
          const isValid = regionData.is_valid === true;

          if (isValid && regionData.id) {
            return {
              isValid: true,
              region: {
                id: regionData.id,
                name: regionData.name,
                description: regionData.description,
                city: regionData.city,
                state: regionData.state,
                country: regionData.country,
                center_longitude: regionData.center_longitude,
                center_latitude: regionData.center_latitude,
                max_delivery_radius_meters: regionData.max_delivery_radius_meters,
                min_order_amount: regionData.min_order_amount,
                coverage_area_geojson: regionData.coverage_area_geojson,
              },
              regionName: regionData.name,
              message: `La ubicación está dentro de la zona de cobertura: ${regionData.name}`,
            };
          } else {
            return {
              isValid: false,
              region: null,
              regionName: null,
              message: 'La ubicación está fuera de todas las zonas de cobertura activas',
            };
          }
        }
      } catch (funcError: any) {
        // Si la función no existe, usar validación con la función anterior
        if (funcError.code === '42883' || funcError.message?.includes('does not exist')) {
          console.log('⚠️  Función get_location_region() no existe, usando validación con is_location_in_region()');
          
          // Obtener la región activa por defecto
          const region = await this.getActiveRegion();
          
          if (!region) {
            return {
              isValid: false,
              message: 'No hay región de servicio activa configurada. Por favor ejecuta el script database/service_regions.sql',
            };
          }

          try {
            const validationResult = await pool.query(
              'SELECT core.is_location_in_region($1, $2) as is_valid',
              [longitude, latitude]
            );

            const isValid = validationResult.rows[0]?.is_valid || false;

            return {
              isValid,
              region: isValid ? region : null,
              regionName: isValid ? region.name : null,
              message: isValid 
                ? `La ubicación está dentro de la zona de cobertura: ${region.name}`
                : `La ubicación está fuera de la zona de cobertura activa (${region.name})`,
            };
          } catch (innerError: any) {
            // Si la función is_location_in_region tampoco existe, usar validación directa con PostGIS
            if (innerError.code === '42883' || innerError.message?.includes('does not exist')) {
              console.log('⚠️  Función is_location_in_region() no existe, usando validación directa con PostGIS');
          
              try {
                // Validación directa usando ST_Within
                const point = `ST_SetSRID(ST_MakePoint($1, $2), 4326)`;
                const validationResult = await pool.query(
                  `SELECT ST_Within(${point}, sr.coverage_area) as is_valid
                   FROM core.service_regions sr
                   WHERE sr.id = $3 AND sr.is_active = TRUE`,
                  [longitude, latitude, region.id]
                );

                const isValid = validationResult.rows[0]?.is_valid || false;

                return {
                  isValid,
                  region: isValid ? region : null,
                  regionName: isValid ? region.name : null,
                  message: isValid 
                    ? `La ubicación está dentro de la zona de cobertura: ${region.name}`
                    : `La ubicación está fuera de la zona de cobertura activa (${region.name})`,
                };
              } catch (postgisError: any) {
                console.error('❌ Error en validación PostGIS:', {
                  message: postgisError.message,
                  code: postgisError.code,
                });
                
                // Si PostGIS no está disponible, permitir la ubicación pero advertir
                return {
                  isValid: true, // Permitir por defecto si no se puede validar
                  region: region,
                  message: 'No se pudo validar la ubicación. Asegúrate de que PostGIS esté habilitado.',
                };
              }
            }
            
            throw innerError;
          }
        }
        
        throw funcError;
      }
    } catch (error: any) {
      console.error('❌ Error validando ubicación:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
      });
      
      // Si es un error de tabla no encontrada, retornar mensaje claro
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return {
          isValid: false,
          message: 'Sistema de regiones no configurado. Ejecuta el script database/service_regions.sql',
        };
      }
      
      throw new ServiceUnavailableException(`Error al validar ubicación: ${error.message}`);
    }
  }

  /**
   * Verificar si un usuario tiene acceso a un negocio
   */
  async userHasAccessToBusiness(userId: string, businessId: string): Promise<boolean> {
    if (!dbPool) {
      return false;
    }

    const pool = dbPool;
    
    try {
      const result = await pool.query(
        `SELECT EXISTS(
          SELECT 1 
          FROM core.business_users bu
          WHERE bu.business_id = $1 
          AND bu.user_id = $2 
          AND bu.is_active = TRUE
        ) as has_access`,
        [businessId, userId]
      );
      
      return result.rows[0]?.has_access || false;
    } catch (error: any) {
      console.error('[BusinessesService] Error verificando acceso:', error);
      return false;
    }
  }

  /**
   * Obtener todas las categorías de negocios disponibles
   */
  async getBusinessCategories() {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;
    
    // Intentar obtener de la tabla de catálogo si existe
    try {
      const result = await pool.query(
        `SELECT id, name, description, icon_url, display_order, is_active
         FROM core.business_categories
         WHERE is_active = true
         ORDER BY display_order ASC, name ASC`
      );
      
      if (result.rows.length > 0) {
        return result.rows;
      }
    } catch (error: any) {
      // Si la tabla no existe, retornar categorías por defecto
      console.log('⚠️  Tabla business_categories no existe, usando categorías por defecto');
    }

    // Categorías por defecto si no existe el catálogo
    return [
      { name: 'Restaurante', description: 'Restaurantes con menú completo' },
      { name: 'Cafetería', description: 'Cafeterías y lugares de café' },
      { name: 'Pizzería', description: 'Pizzerías y comida italiana' },
      { name: 'Taquería', description: 'Taquerías y comida mexicana tradicional' },
      { name: 'Panadería', description: 'Panaderías y pastelerías' },
      { name: 'Heladería', description: 'Heladerías y postrerías' },
      { name: 'Comida Rápida', description: 'Restaurantes de comida rápida' },
      { name: 'Asiático', description: 'Restaurantes de comida asiática' },
      { name: 'Saludable/Vegano', description: 'Restaurantes saludables, veganos y vegetarianos' },
      { name: 'Pollería', description: 'Pollerías y rosticerías' },
      { name: 'Sandwich Shop', description: 'Tiendas de sandwiches y delis' },
      { name: 'Repostería', description: 'Repostería fina y pastelerías gourmet' },
      { name: 'Otro', description: 'Otras categorías de negocios' },
    ];
  }

  /**
   * Obtener negocio más cercano a una ubicación
   */
  async findNearest(latitude: number, longitude: number, businessId?: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      // Convertir POINT a geography correctamente
      // Necesitamos extraer las coordenadas del POINT y crear un geography point
      let query = `
        SELECT 
          id,
          name,
          logo_url,
          category,
          (location)[0] as longitude,
          (location)[1] as latitude,
          ST_Distance(
            ST_SetSRID(
              ST_MakePoint(
                (location)[0]::DOUBLE PRECISION,
                (location)[1]::DOUBLE PRECISION
              )::geography,
              4326
            ),
            ST_SetSRID(
              ST_MakePoint($1, $2)::geography,
              4326
            )
          ) / 1000 as distance_km
        FROM core.businesses
        WHERE is_active = TRUE AND accepts_orders = TRUE
          AND location IS NOT NULL
      `;
      const params: any[] = [longitude, latitude];

      if (businessId) {
        query += ` AND id = $3`;
        params.push(businessId);
      }

      query += ` ORDER BY distance_km ASC LIMIT 1`;

      console.log('🔍 Buscando negocio más cercano:', { latitude, longitude, businessId });
      const result = await dbPool.query(query, params);
      console.log('✅ Negocio más cercano encontrado:', result.rows[0]?.name || 'Ninguno');

      if (result.rows.length === 0) {
        throw new NotFoundException('No se encontró ningún negocio cercano');
      }

      return result.rows[0];
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('❌ Error obteniendo negocio más cercano:', error);
      throw new ServiceUnavailableException(`Error al obtener negocio más cercano: ${error.message}`);
    }
  }

  /**
   * Obtener todas las marcas de vehículos disponibles
   */
  async getAvailableVehicleBrands() {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      console.log('[BusinessesService] Obteniendo marcas disponibles...');
      const result = await dbPool.query(
        `SELECT id, name, code, display_order, is_active
         FROM catalog.vehicle_brands
         WHERE is_active = TRUE
         ORDER BY display_order, name ASC`
      );

      console.log('[BusinessesService] Marcas disponibles encontradas:', result.rows.length);
      return result.rows;
    } catch (error: any) {
      console.error('❌ Error obteniendo marcas de vehículos:', error);
      throw new ServiceUnavailableException(`Error al obtener marcas: ${error.message}`);
    }
  }

  /**
   * Obtener sucursales que venden productos de una marca específica
   */
  async getBranchesByBrand(brandId: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      const result = await dbPool.query(
        `SELECT DISTINCT
          b.id, b.name, b.slug, b.business_group_id, b.description, b.logo_url,
          b.phone, b.email, b.is_active, b.created_at, b.updated_at,
          a.city, a.state,
          (b.location)[0] as longitude,
          (b.location)[1] as latitude,
          CONCAT_WS(', ',
            NULLIF(CONCAT_WS(' ', a.street, a.street_number), ''),
            NULLIF(a.neighborhood, ''),
            NULLIF(a.city, ''),
            NULLIF(a.state, ''),
            NULLIF(a.postal_code, '')
          ) as address
        FROM core.businesses b
        INNER JOIN catalog.product_branch_availability pba ON b.id = pba.branch_id
        INNER JOIN catalog.product_vehicle_compatibility pvc ON pba.product_id = pvc.product_id
        LEFT JOIN core.addresses a ON b.address_id = a.id
        WHERE b.is_active = TRUE
          AND pba.is_enabled = TRUE
          AND pba.is_active = TRUE
          AND pvc.is_active = TRUE
          AND (
            pvc.vehicle_brand_id = $1
            OR pvc.is_universal = TRUE
          )
        ORDER BY a.state ASC, a.city ASC, b.name ASC`,
        [brandId]
      );

      return {
        data: result.rows,
        pagination: {
          page: 1,
          limit: result.rows.length,
          total: result.rows.length,
          totalPages: 1,
        },
      };
    } catch (error: any) {
      console.error('❌ Error obteniendo sucursales por marca:', error);
      throw new ServiceUnavailableException(`Error al obtener sucursales por marca: ${error.message}`);
    }
  }

  /**
   * Obtener las marcas de vehículos asignadas a una sucursal
   */
  async getBusinessVehicleBrands(businessId: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      console.log('[BusinessesService] Obteniendo marcas de la sucursal:', businessId);
      
      // Intentar usar la función SQL primero
      let result;
      try {
        result = await dbPool.query(
          `SELECT * FROM catalog.get_business_vehicle_brands($1)`,
          [businessId]
        );
        console.log('[BusinessesService] Marcas obtenidas usando función SQL:', result.rows.length);
      } catch (funcError: any) {
        // Si la función no existe, usar consulta directa
        console.warn('[BusinessesService] Función SQL no encontrada, usando consulta directa:', funcError.message);
        result = await dbPool.query(
          `SELECT 
            vb.id as brand_id,
            vb.name as brand_name,
            vb.code as brand_code,
            vb.display_order,
            bvb.created_at as assigned_at,
            bvb.is_active
          FROM catalog.business_vehicle_brands bvb
          INNER JOIN catalog.vehicle_brands vb ON bvb.vehicle_brand_id = vb.id
          WHERE bvb.business_id = $1
            AND bvb.is_active = TRUE
            AND vb.is_active = TRUE
          ORDER BY vb.display_order ASC, vb.name ASC`,
          [businessId]
        );
        console.log('[BusinessesService] Marcas obtenidas usando consulta directa:', result.rows.length);
      }

      return result.rows;
    } catch (error: any) {
      console.error('❌ Error obteniendo marcas de la sucursal:', error);
      throw new ServiceUnavailableException(`Error al obtener marcas de la sucursal: ${error.message}`);
    }
  }

  /**
   * Agregar una marca de vehículo a una sucursal
   */
  async addVehicleBrandToBusiness(businessId: string, vehicleBrandId: string, userId: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;

    try {
      // Verificar que el negocio existe y el usuario tiene permisos
      const businessCheck = await pool.query(
        `SELECT b.id FROM core.businesses b
         INNER JOIN core.business_users bu ON b.id = bu.business_id
         WHERE b.id = $1 AND bu.user_id = $2 AND bu.role = 'superadmin' AND bu.is_active = TRUE`,
        [businessId, userId]
      );

      if (businessCheck.rows.length === 0) {
        throw new BadRequestException('No tienes permisos para gestionar esta sucursal');
      }

      // Verificar que la marca existe y está activa
      const brandCheck = await pool.query(
        `SELECT id FROM catalog.vehicle_brands WHERE id = $1 AND is_active = TRUE`,
        [vehicleBrandId]
      );

      if (brandCheck.rows.length === 0) {
        throw new NotFoundException('La marca de vehículo no existe o está inactiva');
      }

      // Verificar si ya existe la relación
      const existingCheck = await pool.query(
        `SELECT id, is_active FROM catalog.business_vehicle_brands 
         WHERE business_id = $1 AND vehicle_brand_id = $2`,
        [businessId, vehicleBrandId]
      );

      if (existingCheck.rows.length > 0) {
        // Si existe pero está inactiva, reactivarla
        if (existingCheck.rows[0].is_active === false) {
          await pool.query(
            `UPDATE catalog.business_vehicle_brands 
             SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP, created_by = $3
             WHERE business_id = $1 AND vehicle_brand_id = $2`,
            [businessId, vehicleBrandId, userId]
          );
        } else {
          throw new BadRequestException('La marca ya está asignada a esta sucursal');
        }
      } else {
        // Insertar nueva relación
        await pool.query(
          `INSERT INTO catalog.business_vehicle_brands (business_id, vehicle_brand_id, created_by, is_active)
           VALUES ($1, $2, $3, TRUE)`,
          [businessId, vehicleBrandId, userId]
        );
      }

      // Devolver las marcas actualizadas
      return this.getBusinessVehicleBrands(businessId);
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error('❌ Error agregando marca a la sucursal:', error);
      throw new ServiceUnavailableException(`Error al agregar marca: ${error.message}`);
    }
  }

  /**
   * Quitar una marca de vehículo de una sucursal
   */
  async removeVehicleBrandFromBusiness(businessId: string, vehicleBrandId: string, userId: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;

    try {
      // Verificar que el negocio existe y el usuario tiene permisos
      const businessCheck = await pool.query(
        `SELECT b.id FROM core.businesses b
         INNER JOIN core.business_users bu ON b.id = bu.business_id
         WHERE b.id = $1 AND bu.user_id = $2 AND bu.role = 'superadmin' AND bu.is_active = TRUE`,
        [businessId, userId]
      );

      if (businessCheck.rows.length === 0) {
        throw new BadRequestException('No tienes permisos para gestionar esta sucursal');
      }

      // Desactivar la relación (eliminación lógica)
      const result = await pool.query(
        `UPDATE catalog.business_vehicle_brands 
         SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
         WHERE business_id = $1 AND vehicle_brand_id = $2 AND is_active = TRUE
         RETURNING id`,
        [businessId, vehicleBrandId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundException('La marca no está asignada a esta sucursal');
      }

      // Devolver las marcas actualizadas
      return this.getBusinessVehicleBrands(businessId);
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error('❌ Error quitando marca de la sucursal:', error);
      throw new ServiceUnavailableException(`Error al quitar marca: ${error.message}`);
    }
  }

  // ============================================================================
  // BUSINESS GROUPS (Grupos Empresariales)
  // ============================================================================

  /**
   * Listar grupos empresariales (público)
   */
  async getBusinessGroups(query: any) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const offset = (page - 1) * limit;

    try {
      let whereConditions = ['is_active = TRUE'];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (query.search) {
        whereConditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
        queryParams.push(`%${query.search}%`);
        paramIndex++;
      }

      if (query.isActive !== undefined) {
        whereConditions.push(`is_active = $${paramIndex}`);
        queryParams.push(query.isActive === 'true' || query.isActive === true);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Contar total
      const countResult = await pool.query(
        `SELECT COUNT(*) as total FROM core.business_groups ${whereClause}`,
        queryParams
      );
      const total = parseInt(countResult.rows[0].total);

      // Obtener datos
      queryParams.push(limit, offset);
      const result = await pool.query(
        `SELECT 
          id, owner_id, name, legal_name, description, slug, logo_url, website_url,
          tax_id, settings, is_active, created_at, updated_at
        FROM core.business_groups
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        queryParams
      );

      return {
        data: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      console.error('❌ Error obteniendo grupos empresariales:', error);
      throw new ServiceUnavailableException(`Error al obtener grupos empresariales: ${error.message}`);
    }
  }

  /**
   * Obtener grupo empresarial por slug (público)
   */
  async getBusinessGroupBySlug(slug: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;

    try {
      const result = await pool.query(
        `SELECT 
          id, owner_id, name, legal_name, description, slug, logo_url, website_url,
          tax_id, settings, is_active, created_at, updated_at
        FROM core.business_groups
        WHERE slug = $1 AND is_active = TRUE`,
        [slug]
      );

      if (result.rows.length === 0) {
        throw new NotFoundException('Grupo empresarial no encontrado');
      }

      return result.rows[0];
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('❌ Error obteniendo grupo empresarial:', error);
      throw new ServiceUnavailableException(`Error al obtener grupo empresarial: ${error.message}`);
    }
  }

  /**
   * Listar sucursales (branches) (público)
   */
  async getBranches(query: any) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const offset = (page - 1) * limit;

    try {
      let whereConditions = ['b.is_active = TRUE'];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (query.groupId) {
        whereConditions.push(`b.business_group_id = $${paramIndex}`);
        queryParams.push(query.groupId);
        paramIndex++;
      }

      if (query.search) {
        whereConditions.push(`(b.name ILIKE $${paramIndex} OR b.description ILIKE $${paramIndex})`);
        queryParams.push(`%${query.search}%`);
        paramIndex++;
      }

      if (query.isActive !== undefined) {
        whereConditions.push(`b.is_active = $${paramIndex}`);
        queryParams.push(query.isActive === 'true' || query.isActive === true);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Contar total
      const countResult = await pool.query(
        `SELECT COUNT(*) as total FROM core.businesses b ${whereClause}`,
        queryParams
      );
      const total = parseInt(countResult.rows[0].total);

      // Obtener datos con información de ciudad y estado
      queryParams.push(limit, offset);
      const result = await pool.query(
        `SELECT 
          b.id, b.name, b.slug, b.business_group_id, b.description, b.logo_url,
          b.phone, b.email, b.is_active, b.created_at, b.updated_at,
          a.city, a.state,
          (b.location)[0] as longitude,
          (b.location)[1] as latitude,
          CONCAT_WS(', ',
            NULLIF(CONCAT_WS(' ', a.street, a.street_number), ''),
            NULLIF(a.neighborhood, ''),
            NULLIF(a.city, ''),
            NULLIF(a.state, ''),
            NULLIF(a.postal_code, '')
          ) as address
        FROM core.businesses b
        LEFT JOIN core.addresses a ON b.address_id = a.id
        ${whereClause}
        ORDER BY a.state ASC, a.city ASC, b.name ASC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        queryParams
      );

      return {
        data: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      console.error('❌ Error obteniendo sucursales:', error);
      throw new ServiceUnavailableException(`Error al obtener sucursales: ${error.message}`);
    }
  }

  /**
   * Obtener sucursal por slug (público)
   */
  async getBranchBySlug(slug: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;

    try {
      const result = await pool.query(
        `SELECT 
          b.id, b.name, b.slug, b.business_group_id, b.description, b.logo_url,
          b.phone, b.email, b.is_active, b.created_at, b.updated_at,
          a.city, a.state,
          (b.location)[0] as longitude,
          (b.location)[1] as latitude,
          CONCAT_WS(', ',
            NULLIF(CONCAT_WS(' ', a.street, a.street_number), ''),
            NULLIF(a.neighborhood, ''),
            NULLIF(a.city, ''),
            NULLIF(a.state, ''),
            NULLIF(a.postal_code, '')
          ) as address
        FROM core.businesses b
        LEFT JOIN core.addresses a ON b.address_id = a.id
        WHERE b.slug = $1 AND b.is_active = TRUE`,
        [slug]
      );

      if (result.rows.length === 0) {
        throw new NotFoundException('Sucursal no encontrada');
      }

      return result.rows[0];
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('❌ Error obteniendo sucursal:', error);
      throw new ServiceUnavailableException(`Error al obtener sucursal: ${error.message}`);
    }
  }

  /**
   * Obtener el grupo empresarial del usuario actual (owner_id)
   */
  async getMyBusinessGroup(ownerId: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;

    try {
      const result = await pool.query(
        `SELECT 
          id, owner_id, name, legal_name, description, slug, logo_url, website_url,
          tax_id, settings, is_active, created_at, updated_at
        FROM core.business_groups
        WHERE owner_id = $1 AND is_active = TRUE
        ORDER BY created_at DESC
        LIMIT 1`,
        [ownerId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundException('No se encontró un grupo empresarial para este usuario');
      }

      return result.rows[0];
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('❌ Error obteniendo grupo empresarial:', error);
      throw new ServiceUnavailableException(`Error al obtener grupo empresarial: ${error.message}`);
    }
  }

  /**
   * Crear un nuevo grupo empresarial
   */
  async createBusinessGroup(ownerId: string, createDto: CreateBusinessGroupDto) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;

    try {
      const settingsJson = createDto.settings ? JSON.stringify(createDto.settings) : '{}';

      const result = await pool.query(
        `INSERT INTO core.business_groups (
          owner_id, name, legal_name, description, slug, logo_url, website_url,
          tax_id, settings, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
        RETURNING 
          id, owner_id, name, legal_name, description, slug, logo_url, website_url,
          tax_id, settings, is_active, created_at, updated_at`,
        [
          ownerId,
          createDto.name,
          createDto.legal_name || null,
          createDto.description || null,
          createDto.slug || null, // El trigger generará el slug si es NULL
          createDto.logo_url || null,
          createDto.website_url || null,
          createDto.tax_id || null,
          settingsJson,
          createDto.is_active ?? true,
        ]
      );

      return result.rows[0];
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
        throw new BadRequestException('El slug ya está en uso');
      }
      console.error('❌ Error creando grupo empresarial:', error);
      throw new ServiceUnavailableException(`Error al crear grupo empresarial: ${error.message}`);
    }
  }

  /**
   * Actualizar un grupo empresarial
   */
  async updateBusinessGroup(groupId: string, ownerId: string, updateDto: UpdateBusinessGroupDto) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;

    try {
      // Verificar que el grupo existe y pertenece al usuario
      const checkResult = await pool.query(
        'SELECT id FROM core.business_groups WHERE id = $1 AND owner_id = $2',
        [groupId, ownerId]
      );

      if (checkResult.rows.length === 0) {
        throw new NotFoundException('Grupo empresarial no encontrado o no tienes permisos');
      }

      // Construir query dinámico
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (updateDto.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(updateDto.name);
      }
      if (updateDto.legal_name !== undefined) {
        updateFields.push(`legal_name = $${paramIndex++}`);
        updateValues.push(updateDto.legal_name || null);
      }
      if (updateDto.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(updateDto.description || null);
      }
      if (updateDto.slug !== undefined) {
        updateFields.push(`slug = $${paramIndex++}`);
        updateValues.push(updateDto.slug || null);
      }
      if (updateDto.logo_url !== undefined) {
        updateFields.push(`logo_url = $${paramIndex++}`);
        updateValues.push(updateDto.logo_url || null);
      }
      if (updateDto.website_url !== undefined) {
        updateFields.push(`website_url = $${paramIndex++}`);
        updateValues.push(updateDto.website_url || null);
      }
      if (updateDto.tax_id !== undefined) {
        updateFields.push(`tax_id = $${paramIndex++}`);
        updateValues.push(updateDto.tax_id || null);
      }
      if (updateDto.settings !== undefined) {
        updateFields.push(`settings = $${paramIndex++}::jsonb`);
        updateValues.push(JSON.stringify(updateDto.settings));
      }
      if (updateDto.is_active !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        updateValues.push(updateDto.is_active);
      }

      if (updateFields.length === 0) {
        // No hay campos para actualizar, retornar el grupo actual
        return this.getMyBusinessGroup(ownerId);
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(groupId, ownerId);

      const query = `
        UPDATE core.business_groups
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex++} AND owner_id = $${paramIndex++}
        RETURNING 
          id, owner_id, name, legal_name, description, slug, logo_url, website_url,
          tax_id, settings, is_active, created_at, updated_at
      `;

      const result = await pool.query(query, updateValues);

      if (result.rows.length === 0) {
        throw new NotFoundException('Grupo empresarial no encontrado o no tienes permisos');
      }

      return result.rows[0];
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      if (error.code === '23505') { // Unique violation
        throw new BadRequestException('El slug ya está en uso');
      }
      console.error('❌ Error actualizando grupo empresarial:', error);
      throw new ServiceUnavailableException(`Error al actualizar grupo empresarial: ${error.message}`);
    }
  }
}

