import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
  ForbiddenException,
} from '@nestjs/common';
import { dbPool } from '../../config/database.config';
import { CreateEmailTemplateDto, EmailTemplateLevel, EmailTriggerType } from './dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';
import { ListEmailTemplatesDto } from './dto/list-email-templates.dto';

// Importar el enum para usarlo en el servicio
const { EmailTemplateLevel: EmailTemplateLevelEnum } = require('./dto/create-email-template.dto');

export interface EmailTemplate {
  id: string;
  trigger_type: EmailTriggerType;
  name: string;
  description?: string;
  subject: string;
  template_html: string;
  template_text?: string;
  available_variables: string[];
  is_active: boolean;
  level: EmailTemplateLevel;
  business_group_id?: string;
  business_id?: string;
  global_template_id?: string;
  group_template_id?: string;
  inherit_from_global?: boolean;
  inherit_from_group?: boolean;
  logo_url?: string;
  created_at?: Date;
  updated_at?: Date;
}

@Injectable()
export class EmailTemplatesService {
  /**
   * Listar templates según el nivel
   */
  async list(level: EmailTemplateLevel, filters: ListEmailTemplatesDto): Promise<EmailTemplate[]> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      let query: string;
      let params: any[] = [];

      if (level === EmailTemplateLevel.GLOBAL) {
        query = `
          SELECT 
            id,
            trigger_type,
            name,
            description,
            subject,
            template_html,
            template_text,
            available_variables,
            is_active,
            logo_url,
            created_at,
            updated_at
          FROM communication.email_templates
          WHERE is_active = TRUE
          ORDER BY trigger_type
        `;
      } else if (level === EmailTemplateLevel.GROUP) {
        if (!filters.business_group_id) {
          throw new BadRequestException('business_group_id es requerido para nivel group');
        }

        query = `
          SELECT 
            id,
            business_group_id,
            global_template_id,
            trigger_type,
            name,
            description,
            subject,
            template_html,
            template_text,
            available_variables,
            is_active,
            inherit_from_global,
            logo_url,
            created_at,
            updated_at
          FROM core.business_group_email_templates
          WHERE business_group_id = $1
          ORDER BY trigger_type
        `;
        params = [filters.business_group_id];
      } else if (level === EmailTemplateLevel.BUSINESS) {
        if (!filters.business_id) {
          throw new BadRequestException('business_id es requerido para nivel business');
        }

        query = `
          SELECT 
            id,
            business_id,
            group_template_id,
            global_template_id,
            trigger_type,
            name,
            description,
            subject,
            template_html,
            template_text,
            available_variables,
            is_active,
            inherit_from_group,
            inherit_from_global,
            logo_url,
            created_at,
            updated_at
          FROM core.business_email_templates
          WHERE business_id = $1
          ORDER BY trigger_type
        `;
        params = [filters.business_id];
      } else {
        throw new BadRequestException(`Nivel inválido: ${level}`);
      }

      const result = await dbPool.query(query, params);

      return result.rows.map((row: any) => ({
        id: row.id,
        trigger_type: row.trigger_type,
        name: row.name,
        description: row.description,
        subject: row.subject,
        template_html: row.template_html,
        template_text: row.template_text,
        available_variables: row.available_variables || [],
        is_active: row.is_active,
        level,
        business_group_id: row.business_group_id,
        business_id: row.business_id,
        global_template_id: row.global_template_id,
        group_template_id: row.group_template_id,
        inherit_from_global: row.inherit_from_global,
        inherit_from_group: row.inherit_from_group,
        logo_url: row.logo_url,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    } catch (error: any) {
      console.error('❌ Error listando templates:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new ServiceUnavailableException(`Error al listar templates: ${error.message}`);
    }
  }

  /**
   * Obtener un template por ID
   */
  async findOne(id: string, level: EmailTemplateLevel): Promise<EmailTemplate> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      let query: string;
      let params: any[] = [id];

      if (level === EmailTemplateLevel.GLOBAL) {
        query = `
          SELECT 
            id,
            trigger_type,
            name,
            description,
            subject,
            template_html,
            template_text,
            available_variables,
            is_active,
            logo_url,
            created_at,
            updated_at
          FROM communication.email_templates
          WHERE id = $1
        `;
      } else if (level === EmailTemplateLevel.GROUP) {
        query = `
          SELECT 
            id,
            business_group_id,
            global_template_id,
            trigger_type,
            name,
            description,
            subject,
            template_html,
            template_text,
            available_variables,
            is_active,
            inherit_from_global,
            logo_url,
            created_at,
            updated_at
          FROM core.business_group_email_templates
          WHERE id = $1
        `;
      } else if (level === EmailTemplateLevel.BUSINESS) {
        query = `
          SELECT 
            id,
            business_id,
            group_template_id,
            global_template_id,
            trigger_type,
            name,
            description,
            subject,
            template_html,
            template_text,
            available_variables,
            is_active,
            inherit_from_group,
            inherit_from_global,
            logo_url,
            created_at,
            updated_at
          FROM core.business_email_templates
          WHERE id = $1
        `;
      } else {
        throw new BadRequestException(`Nivel inválido: ${level}`);
      }

      const result = await dbPool.query(query, params);

      if (result.rows.length === 0) {
        throw new NotFoundException(`Template no encontrado con ID: ${id}`);
      }

      const row = result.rows[0];
      return {
        id: row.id,
        trigger_type: row.trigger_type,
        name: row.name,
        description: row.description,
        subject: row.subject,
        template_html: row.template_html,
        template_text: row.template_text,
        available_variables: row.available_variables || [],
        is_active: row.is_active,
        level,
        business_group_id: row.business_group_id,
        business_id: row.business_id,
        global_template_id: row.global_template_id,
        group_template_id: row.group_template_id,
        inherit_from_global: row.inherit_from_global,
        inherit_from_group: row.inherit_from_group,
        logo_url: row.logo_url,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    } catch (error: any) {
      console.error('❌ Error obteniendo template:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new ServiceUnavailableException(`Error al obtener template: ${error.message}`);
    }
  }

  /**
   * Obtener template por trigger_type
   */
  async findByTrigger(
    triggerType: EmailTriggerType,
    level: EmailTemplateLevel,
    filters: { business_group_id?: string; business_id?: string }
  ): Promise<EmailTemplate | null> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      let query: string;
      let params: any[] = [triggerType];

      if (level === EmailTemplateLevel.GLOBAL) {
        query = `
          SELECT 
            id,
            trigger_type,
            name,
            description,
            subject,
            template_html,
            template_text,
            available_variables,
            is_active,
            logo_url,
            created_at,
            updated_at
          FROM communication.email_templates
          WHERE trigger_type = $1 AND is_active = TRUE
          LIMIT 1
        `;
      } else if (level === EmailTemplateLevel.GROUP) {
        if (!filters.business_group_id) {
          throw new BadRequestException('business_group_id es requerido para nivel group');
        }

        query = `
          SELECT 
            id,
            business_group_id,
            global_template_id,
            trigger_type,
            name,
            description,
            subject,
            template_html,
            template_text,
            available_variables,
            is_active,
            inherit_from_global,
            logo_url,
            created_at,
            updated_at
          FROM core.business_group_email_templates
          WHERE trigger_type = $1 AND business_group_id = $2
          LIMIT 1
        `;
        params = [triggerType, filters.business_group_id];
      } else if (level === EmailTemplateLevel.BUSINESS) {
        if (!filters.business_id) {
          throw new BadRequestException('business_id es requerido para nivel business');
        }

        query = `
          SELECT 
            id,
            business_id,
            group_template_id,
            global_template_id,
            trigger_type,
            name,
            description,
            subject,
            template_html,
            template_text,
            available_variables,
            is_active,
            inherit_from_group,
            inherit_from_global,
            logo_url,
            created_at,
            updated_at
          FROM core.business_email_templates
          WHERE trigger_type = $1 AND business_id = $2
          LIMIT 1
        `;
        params = [triggerType, filters.business_id];
      } else {
        throw new BadRequestException(`Nivel inválido: ${level}`);
      }

      const result = await dbPool.query(query, params);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        trigger_type: row.trigger_type,
        name: row.name,
        description: row.description,
        subject: row.subject,
        template_html: row.template_html,
        template_text: row.template_text,
        available_variables: row.available_variables || [],
        is_active: row.is_active,
        level,
        business_group_id: row.business_group_id,
        business_id: row.business_id,
        global_template_id: row.global_template_id,
        group_template_id: row.group_template_id,
        inherit_from_global: row.inherit_from_global,
        inherit_from_group: row.inherit_from_group,
        logo_url: row.logo_url,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    } catch (error: any) {
      console.error('❌ Error obteniendo template por trigger:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new ServiceUnavailableException(`Error al obtener template: ${error.message}`);
    }
  }

  /**
   * Crear un nuevo template
   */
  async create(level: EmailTemplateLevel, createDto: CreateEmailTemplateDto): Promise<EmailTemplate> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      let query: string;
      let params: any[];

      if (level === EmailTemplateLevel.GLOBAL) {
        query = `
          INSERT INTO communication.email_templates (
            trigger_type,
            name,
            description,
            subject,
            template_html,
            template_text,
            available_variables,
            is_active,
            logo_url
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `;
        params = [
          createDto.trigger_type,
          createDto.name,
          createDto.description || null,
          createDto.subject,
          createDto.template_html,
          createDto.template_text || null,
          createDto.available_variables || [],
          createDto.is_active ?? true,
          createDto.logo_url || null,
        ];
      } else if (level === EmailTemplateLevel.GROUP) {
        if (!createDto.business_group_id) {
          throw new BadRequestException('business_group_id es requerido para nivel group');
        }

        query = `
          INSERT INTO core.business_group_email_templates (
            business_group_id,
            global_template_id,
            trigger_type,
            name,
            description,
            subject,
            template_html,
            template_text,
            available_variables,
            is_active,
            inherit_from_global,
            logo_url
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING *
        `;

        // Obtener el global_template_id si existe
        let globalTemplateId = null;
        try {
          const globalTemplate = await this.findByTrigger(createDto.trigger_type, EmailTemplateLevel.GLOBAL, {});
          if (globalTemplate) {
            globalTemplateId = globalTemplate.id;
          }
        } catch (err) {
          // Si no existe template global, continuar sin referencia
          console.warn(`No se encontró template global para trigger_type: ${createDto.trigger_type}`);
        }

        params = [
          createDto.business_group_id,
          globalTemplateId,
          createDto.trigger_type,
          createDto.name,
          createDto.description || null,
          createDto.subject,
          createDto.template_html,
          createDto.template_text || null,
          createDto.available_variables || [],
          createDto.is_active ?? true,
          createDto.inherit_from_global ?? false,
          createDto.logo_url || null,
        ];
      } else if (level === EmailTemplateLevel.BUSINESS) {
        if (!createDto.business_id) {
          throw new BadRequestException('business_id es requerido para nivel business');
        }

        query = `
          INSERT INTO core.business_email_templates (
            business_id,
            group_template_id,
            global_template_id,
            trigger_type,
            name,
            description,
            subject,
            template_html,
            template_text,
            available_variables,
            is_active,
            inherit_from_group,
            inherit_from_global,
            logo_url
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING *
        `;

        // Obtener los IDs de templates superiores si existen
        let groupTemplateId = null;
        let globalTemplateId = null;

        if (createDto.inherit_from_group) {
          // Obtener business_group_id de la sucursal
          const businessQuery = await dbPool.query(
            'SELECT business_group_id FROM core.businesses WHERE id = $1',
            [createDto.business_id]
          );
          const businessGroupId = businessQuery.rows[0]?.business_group_id;

          if (businessGroupId) {
            const groupTemplate = await this.findByTrigger(createDto.trigger_type, EmailTemplateLevel.GROUP, {
              business_group_id: businessGroupId,
            });
            if (groupTemplate) {
              groupTemplateId = groupTemplate.id;
            }
          }
        }

        try {
          const globalTemplate = await this.findByTrigger(createDto.trigger_type, EmailTemplateLevel.GLOBAL, {});
          if (globalTemplate) {
            globalTemplateId = globalTemplate.id;
          }
        } catch (err) {
          // Si no existe template global, continuar sin referencia
          console.warn(`No se encontró template global para trigger_type: ${createDto.trigger_type}`);
        }

        params = [
          createDto.business_id,
          groupTemplateId,
          globalTemplateId,
          createDto.trigger_type,
          createDto.name,
          createDto.description || null,
          createDto.subject,
          createDto.template_html,
          createDto.template_text || null,
          createDto.available_variables || [],
          createDto.is_active ?? true,
          createDto.inherit_from_group ?? false,
          createDto.inherit_from_global ?? false,
          createDto.logo_url || null,
        ];
      } else {
        throw new BadRequestException(`Nivel inválido: ${level}`);
      }

      const result = await dbPool.query(query, params);
      const row = result.rows[0];

      return {
        id: row.id,
        trigger_type: row.trigger_type,
        name: row.name,
        description: row.description,
        subject: row.subject,
        template_html: row.template_html,
        template_text: row.template_text,
        available_variables: row.available_variables || [],
        is_active: row.is_active,
        level,
        business_group_id: row.business_group_id,
        business_id: row.business_id,
        global_template_id: row.global_template_id,
        group_template_id: row.group_template_id,
        inherit_from_global: row.inherit_from_global,
        inherit_from_group: row.inherit_from_group,
        logo_url: row.logo_url,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    } catch (error: any) {
      console.error('❌ Error creando template:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      // Manejar constraint violations
      if (error.code === '23505') {
        throw new BadRequestException(`Ya existe un template para el trigger_type: ${createDto.trigger_type}`);
      }
      throw new ServiceUnavailableException(`Error al crear template: ${error.message}`);
    }
  }

  /**
   * Actualizar un template
   */
  async update(
    id: string,
    level: EmailTemplateLevel,
    updateDto: UpdateEmailTemplateDto
  ): Promise<EmailTemplate> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      // Construir la query dinámicamente según los campos a actualizar
      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updateDto.name !== undefined) {
        fields.push(`name = $${paramIndex++}`);
        values.push(updateDto.name);
      }
      if (updateDto.description !== undefined) {
        fields.push(`description = $${paramIndex++}`);
        values.push(updateDto.description);
      }
      if (updateDto.subject !== undefined) {
        fields.push(`subject = $${paramIndex++}`);
        values.push(updateDto.subject);
      }
      if (updateDto.template_html !== undefined) {
        fields.push(`template_html = $${paramIndex++}`);
        values.push(updateDto.template_html);
      }
      if (updateDto.template_text !== undefined) {
        fields.push(`template_text = $${paramIndex++}`);
        values.push(updateDto.template_text);
      }
      if (updateDto.available_variables !== undefined) {
        fields.push(`available_variables = $${paramIndex++}`);
        values.push(updateDto.available_variables);
      }
      if (updateDto.is_active !== undefined) {
        fields.push(`is_active = $${paramIndex++}`);
        values.push(updateDto.is_active);
      }
      if (updateDto.inherit_from_global !== undefined && level === EmailTemplateLevel.GROUP) {
        fields.push(`inherit_from_global = $${paramIndex++}`);
        values.push(updateDto.inherit_from_global);
      }
      if (updateDto.inherit_from_group !== undefined && level === EmailTemplateLevel.BUSINESS) {
        fields.push(`inherit_from_group = $${paramIndex++}`);
        values.push(updateDto.inherit_from_group);
      }
      if (updateDto.inherit_from_global !== undefined && level === EmailTemplateLevel.BUSINESS) {
        fields.push(`inherit_from_global = $${paramIndex++}`);
        values.push(updateDto.inherit_from_global);
      }
      if (updateDto.logo_url !== undefined) {
        fields.push(`logo_url = $${paramIndex++}`);
        values.push(updateDto.logo_url);
      }

      if (fields.length === 0) {
        // No hay campos para actualizar, retornar el template actual
        return this.findOne(id, level);
      }

      values.push(id); // ID al final para el WHERE

      let query: string;
      if (level === EmailTemplateLevel.GLOBAL) {
        query = `
          UPDATE communication.email_templates
          SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
          WHERE id = $${paramIndex}
          RETURNING *
        `;
      } else if (level === EmailTemplateLevel.GROUP) {
        query = `
          UPDATE core.business_group_email_templates
          SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
          WHERE id = $${paramIndex}
          RETURNING *
        `;
      } else if (level === EmailTemplateLevel.BUSINESS) {
        query = `
          UPDATE core.business_email_templates
          SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
          WHERE id = $${paramIndex}
          RETURNING *
        `;
      } else {
        throw new BadRequestException(`Nivel inválido: ${level}`);
      }

      const result = await dbPool.query(query, values);

      if (result.rows.length === 0) {
        throw new NotFoundException(`Template no encontrado con ID: ${id}`);
      }

      const row = result.rows[0];
      return {
        id: row.id,
        trigger_type: row.trigger_type,
        name: row.name,
        description: row.description,
        subject: row.subject,
        template_html: row.template_html,
        template_text: row.template_text,
        available_variables: row.available_variables || [],
        is_active: row.is_active,
        level,
        business_group_id: row.business_group_id,
        business_id: row.business_id,
        global_template_id: row.global_template_id,
        group_template_id: row.group_template_id,
        inherit_from_global: row.inherit_from_global,
        inherit_from_group: row.inherit_from_group,
        logo_url: row.logo_url,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    } catch (error: any) {
      console.error('❌ Error actualizando template:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new ServiceUnavailableException(`Error al actualizar template: ${error.message}`);
    }
  }

  /**
   * Eliminar un template (solo para templates personalizados, no globales)
   */
  async remove(id: string, level: EmailTemplateLevel): Promise<void> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    if (level === EmailTemplateLevel.GLOBAL) {
      throw new ForbiddenException('No se pueden eliminar templates globales');
    }

    try {
      let query: string;
      if (level === EmailTemplateLevel.GROUP) {
        query = 'DELETE FROM core.business_group_email_templates WHERE id = $1';
      } else if (level === EmailTemplateLevel.BUSINESS) {
        query = 'DELETE FROM core.business_email_templates WHERE id = $1';
      } else {
        throw new BadRequestException(`Nivel inválido: ${level}`);
      }

      const result = await dbPool.query(query, [id]);

      if (result.rowCount === 0) {
        throw new NotFoundException(`Template no encontrado con ID: ${id}`);
      }
    } catch (error: any) {
      console.error('❌ Error eliminando template:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new ServiceUnavailableException(`Error al eliminar template: ${error.message}`);
    }
  }

  /**
   * Obtener template resuelto usando la función de la base de datos
   */
  async getResolvedTemplate(
    triggerType: EmailTriggerType,
    businessId?: string,
    businessGroupId?: string
  ): Promise<EmailTemplate> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    try {
      const query = `
        SELECT * FROM communication.get_email_template($1, $2, $3)
      `;

      const result = await dbPool.query(query, [triggerType, businessId || null, businessGroupId || null]);

      if (result.rows.length === 0) {
        throw new NotFoundException(`No se encontró template para trigger_type: ${triggerType}`);
      }

      const row = result.rows[0];
      return {
        id: row.id,
        trigger_type: triggerType,
        name: row.name || '',
        description: row.description,
        subject: row.subject,
        template_html: row.template_html,
        template_text: row.template_text,
        available_variables: row.available_variables || [],
        is_active: row.is_active ?? true,
        level: row.level as EmailTemplateLevel,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    } catch (error: any) {
      console.error('❌ Error obteniendo template resuelto:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new ServiceUnavailableException(`Error al obtener template resuelto: ${error.message}`);
    }
  }
}

