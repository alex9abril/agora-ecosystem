import { Injectable, ServiceUnavailableException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ListCategoriesDto } from './dto/list-categories.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { dbPool } from '../../../config/database.config';

@Injectable()
export class CategoriesService {
  /**
   * Listar categorías con filtros y paginación
   */
  async findAll(query: ListCategoriesDto) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const {
      page = 1,
      limit = 20,
      businessId,
      globalOnly,
      isActive,
      parentCategoryId,
      search,
      sortBy = 'display_order',
      sortOrder = 'asc',
    } = query;

    const offset = (page - 1) * limit;
    const pool = dbPool;

    // Construir query SQL
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (globalOnly) {
      whereConditions.push(`pc.business_id IS NULL`);
    } else if (businessId) {
      whereConditions.push(`pc.business_id = $${paramIndex}`);
      queryParams.push(businessId);
      paramIndex++;
    }

    if (isActive !== undefined) {
      whereConditions.push(`pc.is_active = $${paramIndex}`);
      queryParams.push(isActive);
      paramIndex++;
    }

    if (parentCategoryId) {
      whereConditions.push(`pc.parent_category_id = $${paramIndex}`);
      queryParams.push(parentCategoryId);
      paramIndex++;
    } else if (parentCategoryId === null) {
      // Filtrar solo categorías raíz (sin padre)
      whereConditions.push(`pc.parent_category_id IS NULL`);
    }

    if (search) {
      whereConditions.push(`(pc.name ILIKE $${paramIndex} OR pc.description ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`, `%${search}%`);
      paramIndex += 2;
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Obtener total para paginación
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM catalog.product_categories pc
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Query principal
    const orderBy = sortBy || 'display_order';
    const orderDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';
    
    const sortByMap: { [key: string]: string } = {
      'display_order': 'pc.display_order',
      'name': 'pc.name',
      'created_at': 'pc.created_at',
    };
    const orderByColumn = sortByMap[orderBy] || 'pc.display_order';
    
    queryParams.push(limit, offset);

    const sqlQuery = `
      SELECT 
        pc.*,
        b.name as business_name,
        parent.name as parent_category_name,
        COUNT(DISTINCT p.id) as total_products
      FROM catalog.product_categories pc
      LEFT JOIN core.businesses b ON pc.business_id = b.id
      LEFT JOIN catalog.product_categories parent ON pc.parent_category_id = parent.id
      LEFT JOIN catalog.products p ON p.category_id = pc.id
      ${whereClause}
      GROUP BY pc.id, b.name, parent.name
      ORDER BY ${orderByColumn} ${orderDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    try {
      const result = await pool.query(sqlQuery, queryParams);
      const data = result.rows || [];

      return {
        data: data.map(row => ({
          id: row.id,
          business_id: row.business_id,
          business_name: row.business_name,
          name: row.name,
          description: row.description,
          icon_url: row.icon_url,
          parent_category_id: row.parent_category_id,
          parent_category_name: row.parent_category_name,
          display_order: row.display_order,
          is_active: row.is_active,
          created_at: row.created_at,
          updated_at: row.updated_at,
          total_products: parseInt(row.total_products, 10) || 0,
        })),
        pagination: {
          page,
          limit,
          total: total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      console.error('❌ Error ejecutando query de categorías:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
      });
      throw new ServiceUnavailableException('Error al obtener categorías');
    }
  }

  /**
   * Obtener una categoría por ID
   */
  async findOne(id: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;

    const sqlQuery = `
      SELECT 
        pc.*,
        b.name as business_name,
        parent.name as parent_category_name,
        COUNT(DISTINCT p.id) as total_products
      FROM catalog.product_categories pc
      LEFT JOIN core.businesses b ON pc.business_id = b.id
      LEFT JOIN catalog.product_categories parent ON pc.parent_category_id = parent.id
      LEFT JOIN catalog.products p ON p.category_id = pc.id
      WHERE pc.id = $1
      GROUP BY pc.id, b.name, parent.name
    `;

    try {
      const result = await pool.query(sqlQuery, [id]);
      
      if (result.rows.length === 0) {
        throw new NotFoundException('Categoría no encontrada');
      }

      const row = result.rows[0];

      return {
        id: row.id,
        business_id: row.business_id,
        business_name: row.business_name,
        name: row.name,
        description: row.description,
        icon_url: row.icon_url,
        parent_category_id: row.parent_category_id,
        parent_category_name: row.parent_category_name,
        display_order: row.display_order,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
        total_products: parseInt(row.total_products, 10) || 0,
      };
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('❌ Error ejecutando query de categoría:', {
        message: error.message,
        code: error.code,
      });
      throw new ServiceUnavailableException('Error al obtener categoría');
    }
  }

  /**
   * Crear una nueva categoría
   */
  async create(createCategoryDto: CreateCategoryDto) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;

    // Validar que el negocio existe si se proporciona
    if (createCategoryDto.business_id) {
      const businessCheck = await pool.query(
        'SELECT id FROM core.businesses WHERE id = $1',
        [createCategoryDto.business_id]
      );
      if (businessCheck.rows.length === 0) {
        throw new BadRequestException('El negocio especificado no existe');
      }
    }

    // Validar que la categoría padre existe si se proporciona
    if (createCategoryDto.parent_category_id) {
      const parentCheck = await pool.query(
        'SELECT id FROM catalog.product_categories WHERE id = $1',
        [createCategoryDto.parent_category_id]
      );
      if (parentCheck.rows.length === 0) {
        throw new BadRequestException('La categoría padre especificada no existe');
      }
    }

    const sqlQuery = `
      INSERT INTO catalog.product_categories (
        business_id, name, description, icon_url, parent_category_id,
        display_order, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      ) RETURNING *
    `;

    try {
      const result = await pool.query(sqlQuery, [
        createCategoryDto.business_id || null,
        createCategoryDto.name,
        createCategoryDto.description || null,
        createCategoryDto.icon_url || null,
        createCategoryDto.parent_category_id || null,
        createCategoryDto.display_order || 0,
        createCategoryDto.is_active !== undefined ? createCategoryDto.is_active : true,
      ]);

      return this.findOne(result.rows[0].id);
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
        throw new BadRequestException('Ya existe una categoría con ese nombre para este negocio');
      }
      console.error('❌ Error creando categoría:', {
        message: error.message,
        code: error.code,
      });
      throw new ServiceUnavailableException('Error al crear categoría');
    }
  }

  /**
   * Actualizar una categoría
   */
  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;

    // Verificar que la categoría existe
    const existing = await this.findOne(id);

    // Validar que la categoría padre existe si se proporciona
    if (updateCategoryDto.parent_category_id) {
      if (updateCategoryDto.parent_category_id === id) {
        throw new BadRequestException('Una categoría no puede ser su propia categoría padre');
      }
      const parentCheck = await pool.query(
        'SELECT id FROM catalog.product_categories WHERE id = $1',
        [updateCategoryDto.parent_category_id]
      );
      if (parentCheck.rows.length === 0) {
        throw new BadRequestException('La categoría padre especificada no existe');
      }
    }

    // Construir query de actualización dinámicamente
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (updateCategoryDto.name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      updateValues.push(updateCategoryDto.name);
      paramIndex++;
    }

    if (updateCategoryDto.description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      updateValues.push(updateCategoryDto.description);
      paramIndex++;
    }

    if (updateCategoryDto.icon_url !== undefined) {
      updateFields.push(`icon_url = $${paramIndex}`);
      updateValues.push(updateCategoryDto.icon_url);
      paramIndex++;
    }

    if (updateCategoryDto.parent_category_id !== undefined) {
      updateFields.push(`parent_category_id = $${paramIndex}`);
      updateValues.push(updateCategoryDto.parent_category_id || null);
      paramIndex++;
    }

    if (updateCategoryDto.display_order !== undefined) {
      updateFields.push(`display_order = $${paramIndex}`);
      updateValues.push(updateCategoryDto.display_order);
      paramIndex++;
    }

    if (updateCategoryDto.is_active !== undefined) {
      updateFields.push(`is_active = $${paramIndex}`);
      updateValues.push(updateCategoryDto.is_active);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return existing;
    }

    // Agregar updated_at
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    updateValues.push(id);

    const sqlQuery = `
      UPDATE catalog.product_categories
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    try {
      await pool.query(sqlQuery, updateValues);
      return this.findOne(id);
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
        throw new BadRequestException('Ya existe una categoría con ese nombre para este negocio');
      }
      console.error('❌ Error actualizando categoría:', {
        message: error.message,
        code: error.code,
      });
      throw new ServiceUnavailableException('Error al actualizar categoría');
    }
  }

  /**
   * Eliminar lógicamente una categoría (marcar como inactiva)
   */
  async remove(id: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;

    // Verificar que la categoría existe
    const existing = await this.findOne(id);

    // Verificar si tiene productos asociados
    const productsCheck = await pool.query(
      'SELECT COUNT(*) as count FROM catalog.products WHERE category_id = $1',
      [id]
    );
    const productCount = parseInt(productsCheck.rows[0].count, 10);

    if (productCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar la categoría porque tiene ${productCount} producto(s) asociado(s). Desactívala en su lugar.`
      );
    }

    // Verificar si tiene subcategorías
    const subcategoriesCheck = await pool.query(
      'SELECT COUNT(*) as count FROM catalog.product_categories WHERE parent_category_id = $1',
      [id]
    );
    const subcategoryCount = parseInt(subcategoriesCheck.rows[0].count, 10);

    if (subcategoryCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar la categoría porque tiene ${subcategoryCount} subcategoría(s). Desactívala en su lugar.`
      );
    }

    // Eliminación lógica: marcar como inactiva
    const sqlQuery = `
      UPDATE catalog.product_categories
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    try {
      await pool.query(sqlQuery, [id]);
      return { message: 'Categoría desactivada exitosamente' };
    } catch (error: any) {
      console.error('❌ Error eliminando categoría:', {
        message: error.message,
        code: error.code,
      });
      throw new ServiceUnavailableException('Error al eliminar categoría');
    }
  }
}

