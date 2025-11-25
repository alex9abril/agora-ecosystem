import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { dbPool } from '../../config/database.config';

@Injectable()
export class AddressesService {
  /**
   * Listar direcciones del usuario
   */
  async findAll(userId: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      const result = await dbPool.query(
        `SELECT 
          id,
          label,
          street,
          street_number,
          interior_number,
          neighborhood,
          city,
          state,
          postal_code,
          country,
          (location)[0] as longitude,
          (location)[1] as latitude,
          additional_references,
          is_default,
          is_active,
          created_at,
          updated_at
        FROM core.addresses
        WHERE user_id = $1 AND is_active = TRUE
        ORDER BY is_default DESC, created_at DESC`,
        [userId]
      );

      return result.rows;
    } catch (error: any) {
      console.error('❌ Error obteniendo direcciones:', error);
      throw new ServiceUnavailableException(`Error al obtener direcciones: ${error.message}`);
    }
  }

  /**
   * Obtener dirección específica
   */
  async findOne(id: string, userId: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      const result = await dbPool.query(
        `SELECT 
          id,
          label,
          street,
          street_number,
          interior_number,
          neighborhood,
          city,
          state,
          postal_code,
          country,
          (location)[0] as longitude,
          (location)[1] as latitude,
          additional_references,
          is_default,
          is_active,
          created_at,
          updated_at
        FROM core.addresses
        WHERE id = $1 AND user_id = $2 AND is_active = TRUE`,
        [id, userId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundException('Dirección no encontrada');
      }

      return result.rows[0];
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('❌ Error obteniendo dirección:', error);
      throw new ServiceUnavailableException(`Error al obtener dirección: ${error.message}`);
    }
  }

  /**
   * Crear nueva dirección
   */
  async create(userId: string, createDto: any) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      // Si se establece como predeterminada, quitar el flag de otras direcciones
      if (createDto.is_default) {
        await dbPool.query(
          `UPDATE core.addresses 
           SET is_default = FALSE 
           WHERE user_id = $1 AND is_default = TRUE`,
          [userId]
        );
      }

      const result = await dbPool.query(
        `INSERT INTO core.addresses (
          user_id, label, street, street_number, interior_number,
          neighborhood, city, state, postal_code, country,
          location, additional_references, is_default, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, ST_MakePoint($11, $12)::point, $13, $14, TRUE)
        RETURNING 
          id,
          label,
          street,
          street_number,
          interior_number,
          neighborhood,
          city,
          state,
          postal_code,
          country,
          (location)[0] as longitude,
          (location)[1] as latitude,
          additional_references,
          is_default,
          is_active,
          created_at,
          updated_at`,
        [
          userId,
          createDto.label || null,
          createDto.street,
          createDto.street_number || null,
          createDto.interior_number || null,
          createDto.neighborhood,
          createDto.city || 'Ciudad de México',
          createDto.state || 'CDMX',
          createDto.postal_code,
          createDto.country || 'México',
          createDto.longitude,
          createDto.latitude,
          createDto.additional_references || null,
          createDto.is_default || false,
        ]
      );

      return result.rows[0];
    } catch (error: any) {
      console.error('❌ Error creando dirección:', error);
      throw new ServiceUnavailableException(`Error al crear dirección: ${error.message}`);
    }
  }

  /**
   * Actualizar dirección
   */
  async update(id: string, userId: string, updateDto: any) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      // Verificar que la dirección existe y pertenece al usuario
      const existing = await dbPool.query(
        `SELECT id FROM core.addresses WHERE id = $1 AND user_id = $2 AND is_active = TRUE`,
        [id, userId]
      );

      if (existing.rows.length === 0) {
        throw new NotFoundException('Dirección no encontrada');
      }

      // Si se establece como predeterminada, quitar el flag de otras direcciones
      if (updateDto.is_default) {
        await dbPool.query(
          `UPDATE core.addresses 
           SET is_default = FALSE 
           WHERE user_id = $1 AND is_default = TRUE AND id != $2`,
          [userId, id]
        );
      }

      // Construir query dinámico
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updateDto.label !== undefined) {
        updates.push(`label = $${paramIndex++}`);
        values.push(updateDto.label);
      }
      if (updateDto.street !== undefined) {
        updates.push(`street = $${paramIndex++}`);
        values.push(updateDto.street);
      }
      if (updateDto.street_number !== undefined) {
        updates.push(`street_number = $${paramIndex++}`);
        values.push(updateDto.street_number);
      }
      if (updateDto.interior_number !== undefined) {
        updates.push(`interior_number = $${paramIndex++}`);
        values.push(updateDto.interior_number);
      }
      if (updateDto.neighborhood !== undefined) {
        updates.push(`neighborhood = $${paramIndex++}`);
        values.push(updateDto.neighborhood);
      }
      if (updateDto.city !== undefined) {
        updates.push(`city = $${paramIndex++}`);
        values.push(updateDto.city);
      }
      if (updateDto.state !== undefined) {
        updates.push(`state = $${paramIndex++}`);
        values.push(updateDto.state);
      }
      if (updateDto.postal_code !== undefined) {
        updates.push(`postal_code = $${paramIndex++}`);
        values.push(updateDto.postal_code);
      }
      if (updateDto.country !== undefined) {
        updates.push(`country = $${paramIndex++}`);
        values.push(updateDto.country);
      }
      if (updateDto.longitude !== undefined && updateDto.latitude !== undefined) {
        updates.push(`location = ST_MakePoint($${paramIndex}, $${paramIndex + 1})::point`);
        values.push(updateDto.longitude, updateDto.latitude);
        paramIndex += 2;
      }
      if (updateDto.additional_references !== undefined) {
        updates.push(`additional_references = $${paramIndex++}`);
        values.push(updateDto.additional_references);
      }
      if (updateDto.is_default !== undefined) {
        updates.push(`is_default = $${paramIndex++}`);
        values.push(updateDto.is_default);
      }

      if (updates.length === 0) {
        throw new BadRequestException('No se proporcionaron campos para actualizar');
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id, userId);

      const result = await dbPool.query(
        `UPDATE core.addresses 
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
         RETURNING 
           id,
           label,
           street,
           street_number,
           interior_number,
           neighborhood,
           city,
           state,
           postal_code,
           country,
           (location)[0] as longitude,
           (location)[1] as latitude,
           additional_references,
           is_default,
           is_active,
           created_at,
           updated_at`,
        values
      );

      return result.rows[0];
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('❌ Error actualizando dirección:', error);
      throw new ServiceUnavailableException(`Error al actualizar dirección: ${error.message}`);
    }
  }

  /**
   * Eliminar dirección (soft delete)
   */
  async remove(id: string, userId: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      const result = await dbPool.query(
        `UPDATE core.addresses 
         SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND user_id = $2
         RETURNING id`,
        [id, userId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundException('Dirección no encontrada');
      }

      return { message: 'Dirección eliminada exitosamente' };
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('❌ Error eliminando dirección:', error);
      throw new ServiceUnavailableException(`Error al eliminar dirección: ${error.message}`);
    }
  }

  /**
   * Establecer dirección como predeterminada
   */
  async setDefault(id: string, userId: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      // Verificar que la dirección existe
      const existing = await dbPool.query(
        `SELECT id FROM core.addresses WHERE id = $1 AND user_id = $2 AND is_active = TRUE`,
        [id, userId]
      );

      if (existing.rows.length === 0) {
        throw new NotFoundException('Dirección no encontrada');
      }

      // Quitar el flag de otras direcciones
      await dbPool.query(
        `UPDATE core.addresses 
         SET is_default = FALSE 
         WHERE user_id = $1 AND is_default = TRUE`,
        [userId]
      );

      // Establecer esta como predeterminada
      const result = await dbPool.query(
        `UPDATE core.addresses 
         SET is_default = TRUE, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND user_id = $2
         RETURNING 
           id,
           label,
           street,
           street_number,
           interior_number,
           neighborhood,
           city,
           state,
           postal_code,
           country,
           (location)[0] as longitude,
           (location)[1] as latitude,
           additional_references,
           is_default,
           is_active,
           created_at,
           updated_at`,
        [id, userId]
      );

      return result.rows[0];
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('❌ Error estableciendo dirección predeterminada:', error);
      throw new ServiceUnavailableException(`Error al establecer dirección predeterminada: ${error.message}`);
    }
  }
}

