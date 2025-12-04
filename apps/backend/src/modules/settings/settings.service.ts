import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { dbPool } from '../../config/database.config';

export interface SiteSetting {
  id: string;
  key: string;
  value: any;
  category: string;
  label: string;
  description: string | null;
  help_text: string | null;
  value_type: string;
  validation: any;
  is_active: boolean;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface UpdateSettingDto {
  value: any;
  label?: string;
  description?: string;
  help_text?: string;
}

@Injectable()
export class SettingsService {
  /**
   * Obtener todas las configuraciones agrupadas por categoría
   */
  async findAll(includeInactive: boolean = false) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      const whereClause = includeInactive ? '' : 'WHERE is_active = TRUE';
      const query = `
        SELECT 
          id,
          key,
          value,
          category,
          label,
          description,
          help_text,
          value_type,
          validation,
          is_active,
          display_order,
          created_at,
          updated_at
        FROM catalog.site_settings
        ${whereClause}
        ORDER BY category, display_order, key
      `;

      const result = await dbPool.query(query);
      
      // Agrupar por categoría
      const grouped: Record<string, SiteSetting[]> = {};
      result.rows.forEach((row: any) => {
        if (!grouped[row.category]) {
          grouped[row.category] = [];
        }
        grouped[row.category].push({
          id: row.id,
          key: row.key,
          value: row.value,
          category: row.category,
          label: row.label,
          description: row.description,
          help_text: row.help_text,
          value_type: row.value_type,
          validation: row.validation,
          is_active: row.is_active,
          display_order: row.display_order,
          created_at: row.created_at,
          updated_at: row.updated_at,
        });
      });

      return grouped;
    } catch (error: any) {
      console.error('❌ Error obteniendo configuraciones:', error);
      throw new ServiceUnavailableException(`Error al obtener configuraciones: ${error.message}`);
    }
  }

  /**
   * Obtener configuraciones por categoría
   */
  async findByCategory(category: string, includeInactive: boolean = false) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      const whereClause = includeInactive 
        ? 'WHERE category = $1' 
        : 'WHERE category = $1 AND is_active = TRUE';
      
      const query = `
        SELECT 
          id,
          key,
          value,
          category,
          label,
          description,
          help_text,
          value_type,
          validation,
          is_active,
          display_order,
          created_at,
          updated_at
        FROM catalog.site_settings
        ${whereClause}
        ORDER BY display_order, key
      `;

      const result = await dbPool.query(query, [category]);
      
      return result.rows.map((row: any) => ({
        id: row.id,
        key: row.key,
        value: row.value,
        category: row.category,
        label: row.label,
        description: row.description,
        help_text: row.help_text,
        value_type: row.value_type,
        validation: row.validation,
        is_active: row.is_active,
        display_order: row.display_order,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    } catch (error: any) {
      console.error('❌ Error obteniendo configuraciones por categoría:', error);
      throw new ServiceUnavailableException(`Error al obtener configuraciones: ${error.message}`);
    }
  }

  /**
   * Obtener una configuración por clave
   */
  async findByKey(key: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      const query = `
        SELECT 
          id,
          key,
          value,
          category,
          label,
          description,
          help_text,
          value_type,
          validation,
          is_active,
          display_order,
          created_at,
          updated_at
        FROM catalog.site_settings
        WHERE key = $1 AND is_active = TRUE
      `;

      const result = await dbPool.query(query, [key]);

      if (result.rows.length === 0) {
        throw new NotFoundException(`Configuración con clave "${key}" no encontrada`);
      }

      const row = result.rows[0];
      return {
        id: row.id,
        key: row.key,
        value: row.value,
        category: row.category,
        label: row.label,
        description: row.description,
        help_text: row.help_text,
        value_type: row.value_type,
        validation: row.validation,
        is_active: row.is_active,
        display_order: row.display_order,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('❌ Error obteniendo configuración:', error);
      throw new ServiceUnavailableException(`Error al obtener configuración: ${error.message}`);
    }
  }

  /**
   * Actualizar una configuración por clave
   */
  async updateByKey(key: string, updateDto: UpdateSettingDto) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      // Validar que la configuración existe
      const existing = await this.findByKey(key);

      // Validar el valor según el tipo
      this.validateValue(updateDto.value, existing.value_type, existing.validation);

      // Convertir valor a JSONB
      let valueJsonb: string;
      if (typeof updateDto.value === 'string') {
        valueJsonb = `"${updateDto.value.replace(/"/g, '\\"')}"`;
      } else {
        valueJsonb = JSON.stringify(updateDto.value);
      }

      // Construir la consulta dinámicamente con solo los campos que se actualizarán
      const setParts: string[] = ['value = $1::jsonb'];
      const params: any[] = [valueJsonb];
      let paramIndex = 2;

      if (updateDto.label !== undefined) {
        setParts.push(`label = $${paramIndex}`);
        params.push(updateDto.label);
        paramIndex++;
      }
      if (updateDto.description !== undefined) {
        setParts.push(`description = $${paramIndex}`);
        params.push(updateDto.description);
        paramIndex++;
      }
      if (updateDto.help_text !== undefined) {
        setParts.push(`help_text = $${paramIndex}`);
        params.push(updateDto.help_text);
        paramIndex++;
      }

      setParts.push('updated_at = CURRENT_TIMESTAMP');
      params.push(key);

      const query = `
        UPDATE catalog.site_settings
        SET ${setParts.join(', ')}
        WHERE key = $${paramIndex}
        RETURNING 
          id,
          key,
          value,
          category,
          label,
          description,
          help_text,
          value_type,
          validation,
          is_active,
          display_order,
          created_at,
          updated_at
      `;

      const result = await dbPool.query(query, params);

      const row = result.rows[0];
      return {
        id: row.id,
        key: row.key,
        value: row.value,
        category: row.category,
        label: row.label,
        description: row.description,
        help_text: row.help_text,
        value_type: row.value_type,
        validation: row.validation,
        is_active: row.is_active,
        display_order: row.display_order,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('❌ Error actualizando configuración:', error);
      throw new ServiceUnavailableException(`Error al actualizar configuración: ${error.message}`);
    }
  }

  /**
   * Actualizar múltiples configuraciones
   */
  async bulkUpdate(updates: Array<{ key: string; value: any }>) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const client = await dbPool.connect();

    try {
      await client.query('BEGIN');

      const results = [];

      for (const update of updates) {
        const existing = await this.findByKey(update.key);
        this.validateValue(update.value, existing.value_type, existing.validation);

        let valueJsonb: string;
        if (typeof update.value === 'string') {
          valueJsonb = `"${update.value.replace(/"/g, '\\"')}"`;
        } else {
          valueJsonb = JSON.stringify(update.value);
        }

        const query = `
          UPDATE catalog.site_settings
          SET value = $1::jsonb, updated_at = CURRENT_TIMESTAMP
          WHERE key = $2
          RETURNING key, value
        `;

        const result = await client.query(query, [valueJsonb, update.key]);
        results.push({
          key: result.rows[0].key,
          value: result.rows[0].value,
        });
      }

      await client.query('COMMIT');

      return results;
    } catch (error: any) {
      await client.query('ROLLBACK');
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('❌ Error actualizando configuraciones:', error);
      throw new ServiceUnavailableException(`Error al actualizar configuraciones: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Obtener categorías disponibles
   */
  async getCategories() {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      const query = `
        SELECT DISTINCT category
        FROM catalog.site_settings
        WHERE is_active = TRUE
        ORDER BY category
      `;

      const result = await dbPool.query(query);
      return result.rows.map((row: any) => row.category);
    } catch (error: any) {
      console.error('❌ Error obteniendo categorías:', error);
      throw new ServiceUnavailableException(`Error al obtener categorías: ${error.message}`);
    }
  }

  /**
   * Validar valor según tipo y reglas de validación
   */
  private validateValue(value: any, valueType: string, validation: any) {
    switch (valueType) {
      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new BadRequestException('El valor debe ser un booleano (true/false)');
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          throw new BadRequestException('El valor debe ser un número');
        }
        if (validation) {
          if (validation.min !== undefined && value < validation.min) {
            throw new BadRequestException(`El valor debe ser mayor o igual a ${validation.min}`);
          }
          if (validation.max !== undefined && value > validation.max) {
            throw new BadRequestException(`El valor debe ser menor o igual a ${validation.max}`);
          }
        }
        break;

      case 'string':
        if (typeof value !== 'string') {
          throw new BadRequestException('El valor debe ser una cadena de texto');
        }
        if (validation) {
          if (validation.options && !validation.options.includes(value)) {
            throw new BadRequestException(`El valor debe ser uno de: ${validation.options.join(', ')}`);
          }
          if (validation.minLength && value.length < validation.minLength) {
            throw new BadRequestException(`El valor debe tener al menos ${validation.minLength} caracteres`);
          }
          if (validation.maxLength && value.length > validation.maxLength) {
            throw new BadRequestException(`El valor debe tener máximo ${validation.maxLength} caracteres`);
          }
        }
        break;

      case 'object':
      case 'array':
        // Validación básica, se puede extender
        if (typeof value !== 'object' || value === null) {
          throw new BadRequestException(`El valor debe ser un ${valueType}`);
        }
        break;
    }
  }

  /**
   * Obtener configuración de impuestos (método helper)
   */
  async getTaxSettings() {
    const taxesIncluded = await this.findByKey('taxes.included_in_price');
    const displayBreakdown = await this.findByKey('taxes.display_tax_breakdown');
    const showLabel = await this.findByKey('taxes.show_tax_included_label');

    return {
      included_in_price: taxesIncluded.value,
      display_tax_breakdown: displayBreakdown.value,
      show_tax_included_label: showLabel.value,
    };
  }
}

