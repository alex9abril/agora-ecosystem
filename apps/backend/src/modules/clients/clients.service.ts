import { Injectable, ServiceUnavailableException, NotFoundException } from '@nestjs/common';
import { ListClientsDto } from './dto/list-clients.dto';
import { dbPool } from '../../config/database.config';

@Injectable()
export class ClientsService {
  /**
   * Listar clientes con filtros y paginación
   */
  async findAll(query: ListClientsDto) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const {
      page = 1,
      limit = 20,
      isActive,
      phoneVerified,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = query;

    const offset = (page - 1) * limit;
    const pool = dbPool;

    // Construir query SQL
    let whereConditions: string[] = ["up.role = 'client'"];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (isActive !== undefined) {
      whereConditions.push(`up.is_active = $${paramIndex}`);
      queryParams.push(isActive);
      paramIndex++;
    }

    if (phoneVerified !== undefined) {
      whereConditions.push(`up.phone_verified = $${paramIndex}`);
      queryParams.push(phoneVerified);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(
        up.first_name ILIKE $${paramIndex} OR 
        up.last_name ILIKE $${paramIndex} OR 
        up.phone ILIKE $${paramIndex} OR
        au.email ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      paramIndex += 4;
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Obtener total para paginación
    // Asegurar que solo contamos clientes (no admins, repartidores, o locales)
    const countWhereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : "WHERE up.role = 'client'";
    
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM core.user_profiles up
      LEFT JOIN auth.users au ON up.id = au.id
      ${countWhereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Query principal con estadísticas de pedidos
    const orderBy = sortBy || 'created_at';
    const orderDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';
    
    // Mapear sortBy a columnas válidas
    const sortByMap: { [key: string]: string } = {
      'created_at': 'up.created_at',
      'first_name': 'up.first_name',
      'last_name': 'up.last_name',
      'total_orders': 'total_orders',
    };
    const orderByColumn = sortByMap[orderBy] || 'up.created_at';
    
    queryParams.push(limit, offset);

    const sqlQuery = `
      SELECT 
        up.*,
        au.email,
        au.created_at as auth_created_at,
        au.last_sign_in_at,
        COALESCE(COUNT(DISTINCT o.id), 0) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as total_spent,
        COALESCE(AVG(
          CASE 
            WHEN r.business_rating IS NOT NULL THEN r.business_rating::numeric
            WHEN r.repartidor_rating IS NOT NULL THEN r.repartidor_rating::numeric
            ELSE NULL
          END
        ), 0) as avg_rating_given,
        COUNT(DISTINCT r.id) as total_reviews_given
      FROM core.user_profiles up
      LEFT JOIN auth.users au ON up.id = au.id
      LEFT JOIN orders.orders o ON o.client_id = up.id
      LEFT JOIN reviews.reviews r ON r.reviewer_id = up.id
      ${whereClause}
      GROUP BY up.id, au.email, au.created_at, au.last_sign_in_at, up.role
      HAVING up.role = 'client'
      ORDER BY ${orderByColumn} ${orderDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    try {
      const result = await pool.query(sqlQuery, queryParams);
      const data = result.rows || [];

      return {
        data: data.map(row => ({
          id: row.id,
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
          phone: row.phone,
          phone_verified: row.phone_verified,
          profile_image_url: row.profile_image_url,
          is_active: row.is_active,
          is_blocked: row.is_blocked,
          created_at: row.created_at,
          updated_at: row.updated_at,
          last_sign_in_at: row.last_sign_in_at,
          total_orders: parseInt(row.total_orders, 10) || 0,
          total_spent: parseFloat(row.total_spent) || 0,
          avg_rating_given: parseFloat(row.avg_rating_given) || 0,
          total_reviews_given: parseInt(row.total_reviews_given, 10) || 0,
        })),
        pagination: {
          page,
          limit,
          total: total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      console.error('❌ Error ejecutando query de clientes:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
      });
      throw new ServiceUnavailableException('Error al obtener clientes');
    }
  }

  /**
   * Obtener un cliente por ID con información detallada
   */
  async findOne(id: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;

    const sqlQuery = `
      SELECT 
        up.*,
        au.email,
        au.created_at as auth_created_at,
        au.last_sign_in_at,
        au.confirmed_at,
        COALESCE(COUNT(DISTINCT o.id), 0) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as total_spent,
        COALESCE(AVG(
          CASE 
            WHEN r.business_rating IS NOT NULL THEN r.business_rating::numeric
            WHEN r.repartidor_rating IS NOT NULL THEN r.repartidor_rating::numeric
            ELSE NULL
          END
        ), 0) as avg_rating_given,
        COUNT(DISTINCT r.id) as total_reviews_given,
        COUNT(DISTINCT CASE WHEN o.status = 'delivered' THEN o.id END) as completed_orders,
        COUNT(DISTINCT CASE WHEN o.status = 'cancelled' THEN o.id END) as cancelled_orders
      FROM core.user_profiles up
      LEFT JOIN auth.users au ON up.id = au.id
      LEFT JOIN orders.orders o ON o.client_id = up.id
      LEFT JOIN reviews.reviews r ON r.reviewer_id = up.id
      WHERE up.id = $1 AND up.role = 'client'
      GROUP BY up.id, au.email, au.created_at, au.last_sign_in_at, au.confirmed_at
    `;

    try {
      const result = await pool.query(sqlQuery, [id]);
      
      if (result.rows.length === 0) {
        throw new NotFoundException('Cliente no encontrado');
      }

      const row = result.rows[0];

      return {
        id: row.id,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        phone: row.phone,
        phone_verified: row.phone_verified,
        profile_image_url: row.profile_image_url,
        is_active: row.is_active,
        is_blocked: row.is_blocked,
        created_at: row.created_at,
        updated_at: row.updated_at,
        auth_created_at: row.auth_created_at,
        last_sign_in_at: row.last_sign_in_at,
        confirmed_at: row.confirmed_at,
        total_orders: parseInt(row.total_orders, 10) || 0,
        total_spent: parseFloat(row.total_spent) || 0,
        completed_orders: parseInt(row.completed_orders, 10) || 0,
        cancelled_orders: parseInt(row.cancelled_orders, 10) || 0,
        avg_rating_given: parseFloat(row.avg_rating_given) || 0,
        total_reviews_given: parseInt(row.total_reviews_given, 10) || 0,
      };
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('❌ Error ejecutando query de cliente:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
      });
      throw new ServiceUnavailableException('Error al obtener cliente');
    }
  }

  /**
   * Obtener estadísticas de clientes
   */
  async getStatistics() {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;

    const sqlQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN up.is_active = true THEN 1 END) as active,
        COUNT(CASE WHEN up.is_active = false THEN 1 END) as inactive,
        COUNT(CASE WHEN up.phone_verified = true THEN 1 END) as phone_verified,
        COUNT(CASE WHEN up.is_blocked = true THEN 1 END) as blocked
      FROM core.user_profiles up
      WHERE up.role = 'client'
    `;

    try {
      const result = await pool.query(sqlQuery);
      const row = result.rows[0];

      return {
        total: parseInt(row.total, 10) || 0,
        active: parseInt(row.active, 10) || 0,
        inactive: parseInt(row.inactive, 10) || 0,
        phone_verified: parseInt(row.phone_verified, 10) || 0,
        blocked: parseInt(row.blocked, 10) || 0,
      };
    } catch (error: any) {
      console.error('❌ Error ejecutando query de estadísticas de clientes:', {
        message: error.message,
        code: error.code,
      });
      throw new ServiceUnavailableException('Error al obtener estadísticas');
    }
  }
}

