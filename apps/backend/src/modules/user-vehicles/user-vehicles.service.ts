import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common';
import { dbPool } from '../../config/database.config';

export interface UserVehicle {
  id: string;
  user_id: string;
  vehicle_brand_id: string;
  vehicle_model_id: string | null;
  vehicle_year_id: string | null;
  vehicle_spec_id: string | null;
  nickname: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Información relacionada (joins)
  brand_name?: string;
  model_name?: string | null;
  year_start?: number | null;
  year_end?: number | null;
  generation?: string | null;
  engine_code?: string | null;
  transmission_type?: string | null;
  drivetrain?: string | null;
  body_type?: string | null;
}

export interface CreateUserVehicleDto {
  vehicle_brand_id: string;
  vehicle_model_id?: string;
  vehicle_year_id?: string;
  vehicle_spec_id?: string;
  nickname?: string;
  is_default?: boolean;
}

export interface UpdateUserVehicleDto {
  vehicle_brand_id?: string;
  vehicle_model_id?: string;
  vehicle_year_id?: string;
  vehicle_spec_id?: string;
  nickname?: string;
  is_default?: boolean;
}

@Injectable()
export class UserVehiclesService {
  /**
   * Obtener todos los vehículos de un usuario
   */
  async getUserVehicles(userId: string): Promise<UserVehicle[]> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      const result = await dbPool.query(
        `SELECT 
          uv.id,
          uv.user_id,
          uv.vehicle_brand_id,
          uv.vehicle_model_id,
          uv.vehicle_year_id,
          uv.vehicle_spec_id,
          uv.nickname,
          uv.is_default,
          uv.is_active,
          uv.created_at,
          uv.updated_at,
          vb.name as brand_name,
          vm.name as model_name,
          vy.year_start,
          vy.year_end,
          vy.generation,
          vs.engine_code,
          vs.transmission_type,
          vs.drivetrain,
          vs.body_type
        FROM core.user_vehicles uv
        JOIN catalog.vehicle_brands vb ON uv.vehicle_brand_id = vb.id
        LEFT JOIN catalog.vehicle_models vm ON uv.vehicle_model_id = vm.id
        LEFT JOIN catalog.vehicle_years vy ON uv.vehicle_year_id = vy.id
        LEFT JOIN catalog.vehicle_specs vs ON uv.vehicle_spec_id = vs.id
        WHERE uv.user_id = $1
          AND uv.is_active = TRUE
        ORDER BY uv.is_default DESC, uv.created_at DESC`,
        [userId]
      );
      return result.rows;
    } catch (error: any) {
      console.error('❌ Error obteniendo vehículos del usuario:', error);
      throw new ServiceUnavailableException(`Error al obtener vehículos: ${error.message}`);
    }
  }

  /**
   * Obtener un vehículo específico de un usuario
   */
  async getUserVehicle(userId: string, vehicleId: string): Promise<UserVehicle> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      const result = await dbPool.query(
        `SELECT 
          uv.id,
          uv.user_id,
          uv.vehicle_brand_id,
          uv.vehicle_model_id,
          uv.vehicle_year_id,
          uv.vehicle_spec_id,
          uv.nickname,
          uv.is_default,
          uv.is_active,
          uv.created_at,
          uv.updated_at,
          vb.name as brand_name,
          vm.name as model_name,
          vy.year_start,
          vy.year_end,
          vy.generation,
          vs.engine_code,
          vs.transmission_type,
          vs.drivetrain,
          vs.body_type
        FROM core.user_vehicles uv
        JOIN catalog.vehicle_brands vb ON uv.vehicle_brand_id = vb.id
        LEFT JOIN catalog.vehicle_models vm ON uv.vehicle_model_id = vm.id
        LEFT JOIN catalog.vehicle_years vy ON uv.vehicle_year_id = vy.id
        LEFT JOIN catalog.vehicle_specs vs ON uv.vehicle_spec_id = vs.id
        WHERE uv.id = $1
          AND uv.user_id = $2
          AND uv.is_active = TRUE`,
        [vehicleId, userId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundException('Vehículo no encontrado');
      }

      return result.rows[0];
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('❌ Error obteniendo vehículo del usuario:', error);
      throw new ServiceUnavailableException(`Error al obtener vehículo: ${error.message}`);
    }
  }

  /**
   * Obtener el vehículo predeterminado de un usuario
   */
  async getDefaultUserVehicle(userId: string): Promise<UserVehicle | null> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      const result = await dbPool.query(
        `SELECT 
          uv.id,
          uv.user_id,
          uv.vehicle_brand_id,
          uv.vehicle_model_id,
          uv.vehicle_year_id,
          uv.vehicle_spec_id,
          uv.nickname,
          uv.is_default,
          uv.is_active,
          uv.created_at,
          uv.updated_at,
          vb.name as brand_name,
          vm.name as model_name,
          vy.year_start,
          vy.year_end,
          vy.generation,
          vs.engine_code,
          vs.transmission_type,
          vs.drivetrain,
          vs.body_type
        FROM core.user_vehicles uv
        JOIN catalog.vehicle_brands vb ON uv.vehicle_brand_id = vb.id
        LEFT JOIN catalog.vehicle_models vm ON uv.vehicle_model_id = vm.id
        LEFT JOIN catalog.vehicle_years vy ON uv.vehicle_year_id = vy.id
        LEFT JOIN catalog.vehicle_specs vs ON uv.vehicle_spec_id = vs.id
        WHERE uv.user_id = $1
          AND uv.is_default = TRUE
          AND uv.is_active = TRUE
        LIMIT 1`,
        [userId]
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error: any) {
      console.error('❌ Error obteniendo vehículo predeterminado:', error);
      throw new ServiceUnavailableException(`Error al obtener vehículo predeterminado: ${error.message}`);
    }
  }

  /**
   * Crear un nuevo vehículo para un usuario
   */
  async createUserVehicle(userId: string, dto: CreateUserVehicleDto): Promise<UserVehicle> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    // Validar que la marca existe
    const brandCheck = await dbPool.query(
      `SELECT id FROM catalog.vehicle_brands WHERE id = $1 AND is_active = TRUE`,
      [dto.vehicle_brand_id]
    );
    if (brandCheck.rows.length === 0) {
      throw new BadRequestException('La marca de vehículo especificada no existe o no está activa');
    }

    // Validar modelo si se proporciona
    if (dto.vehicle_model_id) {
      const modelCheck = await dbPool.query(
        `SELECT id FROM catalog.vehicle_models WHERE id = $1 AND brand_id = $2 AND is_active = TRUE`,
        [dto.vehicle_model_id, dto.vehicle_brand_id]
      );
      if (modelCheck.rows.length === 0) {
        throw new BadRequestException('El modelo especificado no existe o no pertenece a la marca');
      }
    }

    // Validar año si se proporciona
    if (dto.vehicle_year_id) {
      if (!dto.vehicle_model_id) {
        throw new BadRequestException('Se debe especificar el modelo para seleccionar un año');
      }
      const yearCheck = await dbPool.query(
        `SELECT id FROM catalog.vehicle_years WHERE id = $1 AND model_id = $2 AND is_active = TRUE`,
        [dto.vehicle_year_id, dto.vehicle_model_id]
      );
      if (yearCheck.rows.length === 0) {
        throw new BadRequestException('El año especificado no existe o no pertenece al modelo');
      }
    }

    // Validar especificación si se proporciona
    if (dto.vehicle_spec_id) {
      if (!dto.vehicle_year_id) {
        throw new BadRequestException('Se debe especificar el año para seleccionar una especificación');
      }
      const specCheck = await dbPool.query(
        `SELECT id FROM catalog.vehicle_specs WHERE id = $1 AND year_id = $2 AND is_active = TRUE`,
        [dto.vehicle_spec_id, dto.vehicle_year_id]
      );
      if (specCheck.rows.length === 0) {
        throw new BadRequestException('La especificación no existe o no pertenece al año');
      }
    }

    try {
      // Si se establece como predeterminado, desmarcar los demás
      if (dto.is_default === true) {
        await dbPool.query(
          `UPDATE core.user_vehicles 
           SET is_default = FALSE 
           WHERE user_id = $1 AND is_default = TRUE`,
          [userId]
        );
      }

      const result = await dbPool.query(
        `INSERT INTO core.user_vehicles (
          user_id,
          vehicle_brand_id,
          vehicle_model_id,
          vehicle_year_id,
          vehicle_spec_id,
          nickname,
          is_default
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id`,
        [
          userId,
          dto.vehicle_brand_id,
          dto.vehicle_model_id || null,
          dto.vehicle_year_id || null,
          dto.vehicle_spec_id || null,
          dto.nickname || null,
          dto.is_default === true,
        ]
      );

      const vehicleId = result.rows[0].id;
      return await this.getUserVehicle(userId, vehicleId);
    } catch (error: any) {
      console.error('❌ Error creando vehículo del usuario:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new ServiceUnavailableException(`Error al crear vehículo: ${error.message}`);
    }
  }

  /**
   * Actualizar un vehículo de un usuario
   */
  async updateUserVehicle(
    userId: string,
    vehicleId: string,
    dto: UpdateUserVehicleDto
  ): Promise<UserVehicle> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    // Verificar que el vehículo existe y pertenece al usuario
    const existing = await this.getUserVehicle(userId, vehicleId);

    // Validaciones similares a create
    if (dto.vehicle_brand_id) {
      const brandCheck = await dbPool.query(
        `SELECT id FROM catalog.vehicle_brands WHERE id = $1 AND is_active = TRUE`,
        [dto.vehicle_brand_id]
      );
      if (brandCheck.rows.length === 0) {
        throw new BadRequestException('La marca de vehículo especificada no existe o no está activa');
      }
    }

    if (dto.vehicle_model_id) {
      const brandId = dto.vehicle_brand_id || existing.vehicle_brand_id;
      const modelCheck = await dbPool.query(
        `SELECT id FROM catalog.vehicle_models WHERE id = $1 AND brand_id = $2 AND is_active = TRUE`,
        [dto.vehicle_model_id, brandId]
      );
      if (modelCheck.rows.length === 0) {
        throw new BadRequestException('El modelo especificado no existe o no pertenece a la marca');
      }
    }

    if (dto.vehicle_year_id) {
      const modelId = dto.vehicle_model_id || existing.vehicle_model_id;
      if (!modelId) {
        throw new BadRequestException('Se debe especificar el modelo para seleccionar un año');
      }
      const yearCheck = await dbPool.query(
        `SELECT id FROM catalog.vehicle_years WHERE id = $1 AND model_id = $2 AND is_active = TRUE`,
        [dto.vehicle_year_id, modelId]
      );
      if (yearCheck.rows.length === 0) {
        throw new BadRequestException('El año especificado no existe o no pertenece al modelo');
      }
    }

    if (dto.vehicle_spec_id) {
      const yearId = dto.vehicle_year_id || existing.vehicle_year_id;
      if (!yearId) {
        throw new BadRequestException('Se debe especificar el año para seleccionar una especificación');
      }
      const specCheck = await dbPool.query(
        `SELECT id FROM catalog.vehicle_specs WHERE id = $1 AND year_id = $2 AND is_active = TRUE`,
        [dto.vehicle_spec_id, yearId]
      );
      if (specCheck.rows.length === 0) {
        throw new BadRequestException('La especificación no existe o no pertenece al año');
      }
    }

    try {
      // Si se establece como predeterminado, desmarcar los demás
      if (dto.is_default === true) {
        await dbPool.query(
          `UPDATE core.user_vehicles 
           SET is_default = FALSE 
           WHERE user_id = $1 AND id != $2 AND is_default = TRUE`,
          [userId, vehicleId]
        );
      }

      // Construir query dinámico
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (dto.vehicle_brand_id !== undefined) {
        updates.push(`vehicle_brand_id = $${paramIndex++}`);
        values.push(dto.vehicle_brand_id);
      }
      if (dto.vehicle_model_id !== undefined) {
        updates.push(`vehicle_model_id = $${paramIndex++}`);
        values.push(dto.vehicle_model_id || null);
      }
      if (dto.vehicle_year_id !== undefined) {
        updates.push(`vehicle_year_id = $${paramIndex++}`);
        values.push(dto.vehicle_year_id || null);
      }
      if (dto.vehicle_spec_id !== undefined) {
        updates.push(`vehicle_spec_id = $${paramIndex++}`);
        values.push(dto.vehicle_spec_id || null);
      }
      if (dto.nickname !== undefined) {
        updates.push(`nickname = $${paramIndex++}`);
        values.push(dto.nickname || null);
      }
      if (dto.is_default !== undefined) {
        updates.push(`is_default = $${paramIndex++}`);
        values.push(dto.is_default);
      }

      if (updates.length === 0) {
        return existing;
      }

      values.push(vehicleId, userId);
      const query = `
        UPDATE core.user_vehicles
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
        RETURNING id
      `;

      await dbPool.query(query, values);

      return await this.getUserVehicle(userId, vehicleId);
    } catch (error: any) {
      console.error('❌ Error actualizando vehículo del usuario:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new ServiceUnavailableException(`Error al actualizar vehículo: ${error.message}`);
    }
  }

  /**
   * Establecer un vehículo como predeterminado
   */
  async setDefaultVehicle(userId: string, vehicleId: string): Promise<UserVehicle> {
    return await this.updateUserVehicle(userId, vehicleId, { is_default: true });
  }

  /**
   * Eliminar (desactivar) un vehículo de un usuario
   */
  async deleteUserVehicle(userId: string, vehicleId: string): Promise<void> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    // Verificar que el vehículo existe y pertenece al usuario
    await this.getUserVehicle(userId, vehicleId);

    try {
      // Si es el vehículo predeterminado, establecer otro como predeterminado si existe
      const vehicle = await this.getUserVehicle(userId, vehicleId);
      if (vehicle.is_default) {
        // Buscar otro vehículo para establecer como predeterminado
        const otherVehicles = await dbPool.query(
          `SELECT id FROM core.user_vehicles 
           WHERE user_id = $1 AND id != $2 AND is_active = TRUE 
           LIMIT 1`,
          [userId, vehicleId]
        );
        if (otherVehicles.rows.length > 0) {
          await dbPool.query(
            `UPDATE core.user_vehicles 
             SET is_default = TRUE 
             WHERE id = $1`,
            [otherVehicles.rows[0].id]
          );
        }
      }

      // Desactivar el vehículo (eliminación lógica)
      await dbPool.query(
        `UPDATE core.user_vehicles 
         SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1 AND user_id = $2`,
        [vehicleId, userId]
      );
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('❌ Error eliminando vehículo del usuario:', error);
      throw new ServiceUnavailableException(`Error al eliminar vehículo: ${error.message}`);
    }
  }
}

