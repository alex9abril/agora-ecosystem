import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
  ForbiddenException,
} from '@nestjs/common';
import { dbPool } from '../../../config/database.config';
import { CreateLandingSliderDto } from './dto/create-landing-slider.dto';
import { UpdateLandingSliderDto } from './dto/update-landing-slider.dto';
import { ListLandingSlidersDto } from './dto/list-landing-sliders.dto';

export interface LandingSlider {
  id: string;
  business_group_id: string | null;
  business_id: string | null;
  content: Record<string, any>;
  redirect_type: string | null;
  redirect_target_id: string | null;
  redirect_url: string | null;
  display_order: number;
  is_active: boolean;
  start_date: Date | null;
  end_date: Date | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
}

@Injectable()
export class LandingSlidersService {
  /**
   * Verificar que el usuario tiene permiso para gestionar sliders del grupo/sucursal
   */
  private async verifyUserAccess(
    userId: string,
    businessGroupId?: string,
    businessId?: string,
  ): Promise<void> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      // Si es para un grupo, verificar que el usuario es owner del grupo
      if (businessGroupId) {
        const groupResult = await dbPool.query(
          `SELECT owner_id FROM core.business_groups WHERE id = $1 AND is_active = TRUE`,
          [businessGroupId]
        );

        if (groupResult.rows.length === 0) {
          throw new NotFoundException('Grupo empresarial no encontrado');
        }

        if (groupResult.rows[0].owner_id !== userId) {
          // Verificar si el usuario tiene acceso a través de business_users
          const userAccessResult = await dbPool.query(
            `SELECT bu.role 
             FROM core.business_users bu
             INNER JOIN core.businesses b ON bu.business_id = b.id
             WHERE b.business_group_id = $1 
             AND bu.user_id = $2 
             AND bu.is_active = TRUE
             AND (bu.role = 'admin' OR bu.role = 'superadmin')
             LIMIT 1`,
            [businessGroupId, userId]
          );

          if (userAccessResult.rows.length === 0) {
            throw new ForbiddenException('No tienes permiso para gestionar sliders de este grupo');
          }
        }
      }

      // Si es para una sucursal, verificar que el usuario tiene acceso
      if (businessId) {
        const businessResult = await dbPool.query(
          `SELECT owner_id, business_group_id FROM core.businesses WHERE id = $1 AND is_active = TRUE`,
          [businessId]
        );

        if (businessResult.rows.length === 0) {
          throw new NotFoundException('Sucursal no encontrada');
        }

        const business = businessResult.rows[0];

        // Verificar si es owner o tiene acceso a través de business_users
        if (business.owner_id !== userId) {
          const userAccessResult = await dbPool.query(
            `SELECT role 
             FROM core.business_users 
             WHERE business_id = $1 
             AND user_id = $2 
             AND is_active = TRUE
             AND (role = 'admin' OR role = 'superadmin')
             LIMIT 1`,
            [businessId, userId]
          );

          if (userAccessResult.rows.length === 0) {
            // Si la sucursal pertenece a un grupo, verificar acceso al grupo
            if (business.business_group_id) {
              const groupResult = await dbPool.query(
                `SELECT owner_id FROM core.business_groups WHERE id = $1 AND is_active = TRUE`,
                [business.business_group_id]
              );

              if (groupResult.rows.length > 0 && groupResult.rows[0].owner_id === userId) {
                return; // Tiene acceso como owner del grupo
              }
            }

            throw new ForbiddenException('No tienes permiso para gestionar sliders de esta sucursal');
          }
        }
      }
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      console.error('❌ Error verificando acceso:', error);
      throw new ServiceUnavailableException(`Error al verificar acceso: ${error.message}`);
    }
  }

  /**
   * Crear un nuevo slider
   */
  async create(userId: string, createDto: CreateLandingSliderDto): Promise<LandingSlider> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    // Validar que solo uno de los dos campos esté presente
    if (createDto.business_group_id && createDto.business_id) {
      throw new BadRequestException('Solo se puede especificar business_group_id o business_id, no ambos');
    }

    if (!createDto.business_group_id && !createDto.business_id) {
      throw new BadRequestException('Debe especificar business_group_id o business_id');
    }

    // Verificar acceso del usuario
    await this.verifyUserAccess(
      userId,
      createDto.business_group_id,
      createDto.business_id,
    );

    try {
      const query = `
        INSERT INTO commerce.landing_sliders (
          business_group_id,
          business_id,
          content,
          redirect_type,
          redirect_target_id,
          redirect_url,
          display_order,
          is_active,
          start_date,
          end_date,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const result = await dbPool.query(query, [
        createDto.business_group_id || null,
        createDto.business_id || null,
        JSON.stringify(createDto.content),
        createDto.redirect_type || null,
        createDto.redirect_target_id || null,
        createDto.redirect_url || null,
        createDto.display_order ?? 0,
        createDto.is_active ?? true,
        createDto.start_date || null,
        createDto.end_date || null,
        userId,
      ]);

      const slider = result.rows[0];
      return {
        ...slider,
        content: typeof slider.content === 'string' ? JSON.parse(slider.content) : slider.content,
      };
    } catch (error: any) {
      console.error('❌ Error creando slider:', error);
      throw new ServiceUnavailableException(`Error al crear slider: ${error.message}`);
    }
  }

  /**
   * Listar sliders con filtros
   */
  async findAll(userId: string, query: ListLandingSlidersDto): Promise<{
    data: LandingSlider[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      const page = query.page || 1;
      const limit = query.limit || 20;
      const offset = (page - 1) * limit;
      // Mostrar activos solo cuando se pide expresamente; por defecto incluye inactivos
      const onlyActive = query.only_active === true;

      // Construir condiciones WHERE
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (query.business_group_id) {
        conditions.push(`business_group_id = $${paramIndex}`);
        params.push(query.business_group_id);
        paramIndex++;
      }

      if (query.business_id) {
        conditions.push(`business_id = $${paramIndex}`);
        params.push(query.business_id);
        paramIndex++;
      }

      if (onlyActive) {
        conditions.push(`is_active = TRUE`);
        conditions.push(`(start_date IS NULL OR start_date <= CURRENT_TIMESTAMP)`);
        conditions.push(`(end_date IS NULL OR end_date >= CURRENT_TIMESTAMP)`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Obtener total
      const countQuery = `SELECT COUNT(*) as total FROM commerce.landing_sliders ${whereClause}`;
      const countResult = await dbPool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total, 10);

      // Obtener datos
      const dataQuery = `
        SELECT *
        FROM commerce.landing_sliders
        ${whereClause}
        ORDER BY display_order ASC, created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      params.push(limit, offset);
      const dataResult = await dbPool.query(dataQuery, params);

      const data = dataResult.rows.map((row: any) => ({
        ...row,
        content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content,
      }));

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      console.error('❌ Error listando sliders:', error);
      throw new ServiceUnavailableException(`Error al listar sliders: ${error.message}`);
    }
  }

  /**
   * Obtener un slider por ID
   */
  async findOne(userId: string, id: string): Promise<LandingSlider> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      const result = await dbPool.query(
        `SELECT * FROM commerce.landing_sliders WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new NotFoundException('Slider no encontrado');
      }

      const slider = result.rows[0];

      // Verificar acceso
      await this.verifyUserAccess(
        userId,
        slider.business_group_id,
        slider.business_id,
      );

      return {
        ...slider,
        content: typeof slider.content === 'string' ? JSON.parse(slider.content) : slider.content,
      };
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      console.error('❌ Error obteniendo slider:', error);
      throw new ServiceUnavailableException(`Error al obtener slider: ${error.message}`);
    }
  }

  /**
   * Actualizar un slider
   */
  async update(
    userId: string,
    id: string,
    updateDto: UpdateLandingSliderDto,
  ): Promise<LandingSlider> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    // Verificar que existe
    const existing = await this.findOne(userId, id);

    // Validar que solo uno de los dos campos esté presente si se actualizan
    if (updateDto.business_group_id && updateDto.business_id) {
      throw new BadRequestException('Solo se puede especificar business_group_id o business_id, no ambos');
    }

    // Si se actualiza el contexto, verificar acceso
    if (updateDto.business_group_id || updateDto.business_id) {
      await this.verifyUserAccess(
        userId,
        updateDto.business_group_id || existing.business_group_id,
        updateDto.business_id || existing.business_id,
      );
    }

    try {
      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (updateDto.business_group_id !== undefined) {
        updates.push(`business_group_id = $${paramIndex}`);
        params.push(updateDto.business_group_id || null);
        paramIndex++;
      }

      if (updateDto.business_id !== undefined) {
        updates.push(`business_id = $${paramIndex}`);
        params.push(updateDto.business_id || null);
        paramIndex++;
      }

      if (updateDto.content !== undefined) {
        updates.push(`content = $${paramIndex}::jsonb`);
        params.push(JSON.stringify(updateDto.content));
        paramIndex++;
      }

      if (updateDto.redirect_type !== undefined) {
        updates.push(`redirect_type = $${paramIndex}`);
        params.push(updateDto.redirect_type || null);
        paramIndex++;
      }

      if (updateDto.redirect_target_id !== undefined) {
        updates.push(`redirect_target_id = $${paramIndex}`);
        params.push(updateDto.redirect_target_id || null);
        paramIndex++;
      }

      if (updateDto.redirect_url !== undefined) {
        updates.push(`redirect_url = $${paramIndex}`);
        params.push(updateDto.redirect_url || null);
        paramIndex++;
      }

      if (updateDto.display_order !== undefined) {
        updates.push(`display_order = $${paramIndex}`);
        params.push(updateDto.display_order);
        paramIndex++;
      }

      if (updateDto.is_active !== undefined) {
        updates.push(`is_active = $${paramIndex}`);
        params.push(updateDto.is_active);
        paramIndex++;
      }

      if (updateDto.start_date !== undefined) {
        updates.push(`start_date = $${paramIndex}`);
        params.push(updateDto.start_date || null);
        paramIndex++;
      }

      if (updateDto.end_date !== undefined) {
        updates.push(`end_date = $${paramIndex}`);
        params.push(updateDto.end_date || null);
        paramIndex++;
      }

      if (updates.length === 0) {
        return existing;
      }

      params.push(id);
      const query = `
        UPDATE commerce.landing_sliders
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await dbPool.query(query, params);

      const slider = result.rows[0];
      return {
        ...slider,
        content: typeof slider.content === 'string' ? JSON.parse(slider.content) : slider.content,
      };
    } catch (error: any) {
      console.error('❌ Error actualizando slider:', error);
      throw new ServiceUnavailableException(`Error al actualizar slider: ${error.message}`);
    }
  }

  /**
   * Eliminar un slider
   */
  async remove(userId: string, id: string): Promise<void> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    // Verificar que existe y acceso
    await this.findOne(userId, id);

    try {
      await dbPool.query(
        `DELETE FROM commerce.landing_sliders WHERE id = $1`,
        [id]
      );
    } catch (error: any) {
      console.error('❌ Error eliminando slider:', error);
      throw new ServiceUnavailableException(`Error al eliminar slider: ${error.message}`);
    }
  }

  /**
   * Obtener sliders activos para un contexto (público, sin autenticación)
   */
  async getActiveSlidersByContext(
    businessGroupId?: string,
    businessId?: string,
  ): Promise<LandingSlider[]> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      const result = await dbPool.query(
        `SELECT * FROM commerce.get_landing_sliders_by_context($1, $2, $3)`,
        [businessGroupId || null, businessId || null, true]
      );

      return result.rows.map((row: any) => ({
        ...row,
        content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content,
      }));
    } catch (error: any) {
      console.error('❌ Error obteniendo sliders activos:', error);
      throw new ServiceUnavailableException(`Error al obtener sliders: ${error.message}`);
    }
  }
}

