import { Injectable, ServiceUnavailableException, NotFoundException } from '@nestjs/common';
import { ListRepartidoresDto } from './dto/list-repartidores.dto';
import { UpdateRepartidorStatusDto } from './dto/update-repartidor-status.dto';
import { dbPool } from '../../config/database.config';

@Injectable()
export class RepartidoresService {
  /**
   * Listar repartidores con filtros y paginación
   */
  async findAll(query: ListRepartidoresDto) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const {
      page = 1,
      limit = 20,
      isAvailable,
      isActive,
      isVerified,
      isGreen,
      vehicleType,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = query;

    const offset = (page - 1) * limit;
    const pool = dbPool;

    // Construir query SQL
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (isAvailable !== undefined) {
      whereConditions.push(`r.is_available = $${paramIndex}`);
      queryParams.push(isAvailable);
      paramIndex++;
    }

    if (isActive !== undefined) {
      whereConditions.push(`r.is_active = $${paramIndex}`);
      queryParams.push(isActive);
      paramIndex++;
    }

    if (isVerified !== undefined) {
      whereConditions.push(`r.is_verified = $${paramIndex}`);
      queryParams.push(isVerified);
      paramIndex++;
    }

    if (isGreen !== undefined) {
      whereConditions.push(`r.is_green_repartidor = $${paramIndex}`);
      queryParams.push(isGreen);
      paramIndex++;
    }

    if (vehicleType) {
      whereConditions.push(`r.vehicle_type = $${paramIndex}`);
      queryParams.push(vehicleType);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(r.vehicle_description ILIKE $${paramIndex} OR r.license_plate ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`, `%${search}%`);
      paramIndex += 2;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Obtener total para paginación
    // Necesitamos usar el mismo WHERE clause pero con prefijos de tabla
    const countWhereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';
    const countQuery = `SELECT COUNT(*) as total FROM core.repartidores r ${countWhereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Query principal con paginación
    const orderBy = sortBy || 'created_at';
    const orderDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';
    
    // Asegurar que orderBy tenga el prefijo de tabla si no lo tiene
    const orderByColumn = orderBy.includes('.') ? orderBy : `r.${orderBy}`;
    
    queryParams.push(limit, offset);

    let result;
    let data: any[] = [];
    
    // Usar notación de array de PostgreSQL para POINT: (point)[0] para X, (point)[1] para Y
    const sqlQuery = `
      SELECT 
        r.*,
        (r.current_location)[0] as longitude,
        (r.current_location)[1] as latitude,
        up.first_name,
        up.last_name,
        up.phone
      FROM core.repartidores r
      LEFT JOIN core.user_profiles up ON r.user_id = up.id
      ${whereClause}
      ORDER BY ${orderByColumn} ${orderDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    try {
      result = await pool.query(sqlQuery, queryParams);
      data = result.rows || [];
    } catch (error: any) {
      console.error('❌ Error ejecutando query de repartidores:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
      });
      
      // Si falla, intentar sin extraer coordenadas y hacerlo manualmente
      console.log('🔄 Reintentando sin extraer coordenadas en SQL...');
      const fallbackQuery = `
        SELECT 
          r.*,
          up.first_name,
          up.last_name,
          up.phone
        FROM core.repartidores r
        LEFT JOIN core.user_profiles up ON r.user_id = up.id
        ${whereClause}
        ORDER BY r.${orderBy} ${orderDirection}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      result = await pool.query(fallbackQuery, queryParams);
      data = result.rows || [];
      
      // Extraer coordenadas manualmente del campo current_location (POINT)
      if (data.length > 0 && data[0].current_location) {
        console.log('⚠️  Extrayendo coordenadas manualmente del campo current_location');
        for (const row of data) {
          if (row.current_location && typeof row.current_location === 'object') {
            if (row.current_location.x !== undefined && row.current_location.y !== undefined) {
              row.longitude = row.current_location.x;
              row.latitude = row.current_location.y;
            }
          } else if (row.current_location && typeof row.current_location === 'string') {
            const match = row.current_location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
            if (match) {
              row.longitude = parseFloat(match[1]);
              row.latitude = parseFloat(match[2]);
            }
          }
        }
      }
    }

    return {
      data: data.map(row => ({
        ...row,
        user: row.first_name || row.last_name ? {
          first_name: row.first_name,
          last_name: row.last_name,
          phone: row.phone,
        } : null,
      })),
      pagination: {
        page,
        limit,
        total: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtener un repartidor por ID
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
          r.*,
          (r.current_location)[0] as longitude,
          (r.current_location)[1] as latitude,
          up.first_name,
          up.last_name,
          up.phone
        FROM core.repartidores r
        LEFT JOIN core.user_profiles up ON r.user_id = up.id
        WHERE r.id = $1`,
        [id]
      );
    } catch (error: any) {
      console.error('❌ Error ejecutando findOne query:', {
        message: error.message,
        code: error.code,
      });
      
      result = await pool.query(
        `SELECT 
          r.*,
          up.first_name,
          up.last_name,
          up.phone
        FROM core.repartidores r
        LEFT JOIN core.user_profiles up ON r.user_id = up.id
        WHERE r.id = $1`,
        [id]
      );
      
      if (result.rows.length > 0 && result.rows[0].current_location) {
        const row = result.rows[0];
        if (row.current_location && typeof row.current_location === 'object') {
          if (row.current_location.x !== undefined && row.current_location.y !== undefined) {
            row.longitude = row.current_location.x;
            row.latitude = row.current_location.y;
          }
        } else if (row.current_location && typeof row.current_location === 'string') {
          const match = row.current_location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
          if (match) {
            row.longitude = parseFloat(match[1]);
            row.latitude = parseFloat(match[2]);
          }
        }
      }
    }

    if (result.rows.length === 0) {
      throw new NotFoundException(`Repartidor con ID ${id} no encontrado`);
    }

    const repartidor = result.rows[0];
    return {
      ...repartidor,
      user: repartidor.first_name || repartidor.last_name ? {
        first_name: repartidor.first_name,
        last_name: repartidor.last_name,
        phone: repartidor.phone,
      } : null,
    };
  }

  /**
   * Actualizar estado de un repartidor
   */
  async updateStatus(id: string, updateDto: UpdateRepartidorStatusDto) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;
    const result = await pool.query(
      'UPDATE core.repartidores SET is_active = $1 WHERE id = $2 RETURNING *',
      [updateDto.isActive, id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Repartidor con ID ${id} no encontrado`);
    }

    return result.rows[0];
  }

  /**
   * Obtener timeline de actividad de un repartidor
   */
  async getTimeline(repartidorId: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;

    // Verificar que el repartidor existe
    const repartidorCheck = await pool.query(
      'SELECT id FROM core.repartidores WHERE id = $1',
      [repartidorId]
    );

    if (repartidorCheck.rows.length === 0) {
      throw new NotFoundException(`Repartidor con ID ${repartidorId} no encontrado`);
    }

    // Obtener entregas completadas
    const deliveriesQuery = `
      SELECT 
        d.id,
        d.order_id,
        d.status,
        d.distance_km,
        d.actual_time_minutes,
        d.delivered_at,
        o.total_amount,
        o.delivery_fee,
        o.tip_amount,
        b.name as business_name,
        (d.delivery_location)[0] as delivery_longitude,
        (d.delivery_location)[1] as delivery_latitude
      FROM orders.deliveries d
      INNER JOIN orders.orders o ON d.order_id = o.id
      INNER JOIN core.businesses b ON o.business_id = b.id
      WHERE d.repartidor_id = $1 AND d.status = 'delivered'
      ORDER BY d.delivered_at DESC
    `;

    // Obtener reseñas recibidas
    const reviewsQuery = `
      SELECT 
        r.id,
        r.order_id,
        r.repartidor_rating,
        r.repartidor_comment,
        r.created_at,
        up.first_name as reviewer_first_name,
        up.last_name as reviewer_last_name
      FROM reviews.reviews r
      INNER JOIN orders.orders o ON r.order_id = o.id
      INNER JOIN orders.deliveries d ON o.id = d.order_id
      LEFT JOIN core.user_profiles up ON r.reviewer_id = up.id
      WHERE d.repartidor_id = $1 AND r.repartidor_rating IS NOT NULL
      ORDER BY r.created_at DESC
    `;

    // Obtener propinas recibidas
    const tipsQuery = `
      SELECT 
        t.id,
        t.order_id,
        t.amount,
        t.created_at,
        up.first_name as client_first_name,
        up.last_name as client_last_name
      FROM reviews.tips t
      INNER JOIN orders.orders o ON t.order_id = o.id
      LEFT JOIN core.user_profiles up ON t.client_id = up.id
      WHERE t.repartidor_id = $1
      ORDER BY t.created_at DESC
    `;

    try {
      const [deliveriesResult, reviewsResult, tipsResult] = await Promise.all([
        pool.query(deliveriesQuery, [repartidorId]),
        pool.query(reviewsQuery, [repartidorId]),
        pool.query(tipsQuery, [repartidorId]),
      ]);

      const deliveries = deliveriesResult.rows.map((row) => ({
        type: 'delivery',
        id: row.id,
        order_id: row.order_id,
        timestamp: row.delivered_at,
        data: {
          business_name: row.business_name,
          distance_km: row.distance_km,
          actual_time_minutes: row.actual_time_minutes,
          total_amount: row.total_amount,
          delivery_fee: row.delivery_fee,
          tip_amount: row.tip_amount,
          delivery_location: row.delivery_longitude && row.delivery_latitude
            ? { longitude: row.delivery_longitude, latitude: row.delivery_latitude }
            : null,
        },
      }));

      const reviews = reviewsResult.rows.map((row) => ({
        type: 'review',
        id: row.id,
        order_id: row.order_id,
        timestamp: row.created_at,
        data: {
          rating: row.repartidor_rating,
          comment: row.repartidor_comment,
          reviewer_name: `${row.reviewer_first_name || ''} ${row.reviewer_last_name || ''}`.trim() || 'Cliente',
        },
      }));

      const tips = tipsResult.rows.map((row) => ({
        type: 'tip',
        id: row.id,
        order_id: row.order_id,
        timestamp: row.created_at,
        data: {
          amount: row.amount,
          client_name: `${row.client_first_name || ''} ${row.client_last_name || ''}`.trim() || 'Cliente',
        },
      }));

      // Combinar y ordenar por timestamp
      const allActivities = [...deliveries, ...reviews, ...tips].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Agrupar por períodos
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const grouped = {
        today: allActivities.filter((a) => new Date(a.timestamp) >= today),
        lastWeek: allActivities.filter(
          (a) => new Date(a.timestamp) >= lastWeek && new Date(a.timestamp) < today
        ),
        lastMonth: allActivities.filter(
          (a) => new Date(a.timestamp) >= lastMonth && new Date(a.timestamp) < lastWeek
        ),
        older: allActivities.filter((a) => new Date(a.timestamp) < lastMonth),
      };

      return grouped;
    } catch (error: any) {
      console.error('❌ Error obteniendo timeline:', {
        message: error.message,
        code: error.code,
      });
      throw error;
    }
  }

  /**
   * Obtener estadísticas de repartidores
   */
  async getStatistics() {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_available = true AND is_active = true) as online,
        COUNT(*) FILTER (WHERE is_available = false AND is_active = true) as offline,
        COUNT(*) FILTER (WHERE is_active = false) as inactive,
        COUNT(*) FILTER (WHERE is_verified = true) as verified,
        COUNT(*) FILTER (WHERE is_green_repartidor = true) as green
      FROM core.repartidores
    `);

    const stats = result.rows[0];
    return {
      total: parseInt(stats.total, 10),
      online: parseInt(stats.online, 10),
      offline: parseInt(stats.offline, 10),
      inactive: parseInt(stats.inactive, 10),
      verified: parseInt(stats.verified, 10),
      green: parseInt(stats.green, 10),
    };
  }
}

