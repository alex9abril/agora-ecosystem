import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { dbPool } from '../../../config/database.config';
import { CreateProductCollectionDto } from './dto/create-product-collection.dto';
import { UpdateProductCollectionDto } from './dto/update-product-collection.dto';
import { ListProductCollectionsDto } from './dto/list-product-collections.dto';

interface ProductCollectionRow {
  id: string;
  business_id: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  total_products?: number;
}

@Injectable()
export class ProductCollectionsService {
  private normalizeSlug(value: string): string {
    if (!value) return '';
    return value
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private mapRow(row: ProductCollectionRow) {
    return {
      id: row.id,
      business_id: row.business_id,
      name: row.name,
      slug: row.slug,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      total_products: row.total_products !== undefined ? Number(row.total_products) : undefined,
    };
  }

  async list(query: ListProductCollectionsDto) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const params: any[] = [query.businessId];
    const where: string[] = ['pc.business_id = $1'];
    let paramIndex = 2;

    // Estado por defecto: solo activas
    const statusFilter = query.status || 'active';
    if (statusFilter !== 'all') {
      where.push(`pc.status = $${paramIndex}`);
      params.push(statusFilter);
      paramIndex++;
    }

    if (query.search) {
      params.push(`%${query.search}%`);
      where.push(`(pc.name ILIKE $${paramIndex} OR pc.slug ILIKE $${paramIndex})`);
      paramIndex++;
    }

    const sql = `
      SELECT 
        pc.id,
        pc.business_id,
        pc.name,
        pc.slug,
        pc.status,
        pc.created_at,
        pc.updated_at,
        COUNT(DISTINCT pca.product_id) FILTER (WHERE pca.status = 'active') AS total_products
      FROM catalog.product_colecciones pc
      LEFT JOIN catalog.product_coleccion_assignments pca 
        ON pca.coleccion_id = pc.id 
        AND pca.business_id = pc.business_id
      WHERE ${where.join(' AND ')}
      GROUP BY pc.id
      ORDER BY pc.name ASC
    `;

    try {
      const result = await dbPool.query(sql, params);
      const data = (result.rows || []).map((row) => this.mapRow(row));
      return { data, pagination: { total: data.length, page: 1, limit: data.length, totalPages: 1 } };
    } catch (error: any) {
      console.error('⚠️ Error listando colecciones:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
      });
      throw new ServiceUnavailableException('Error al obtener las colecciones');
    }
  }

  async findOne(id: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const sql = `
      SELECT 
        pc.id,
        pc.business_id,
        pc.name,
        pc.slug,
        pc.status,
        pc.created_at,
        pc.updated_at,
        COUNT(DISTINCT pca.product_id) FILTER (WHERE pca.status = 'active') AS total_products
      FROM catalog.product_colecciones pc
      LEFT JOIN catalog.product_coleccion_assignments pca 
        ON pca.coleccion_id = pc.id 
        AND pca.business_id = pc.business_id
      WHERE pc.id = $1
      GROUP BY pc.id
    `;

    const result = await dbPool.query(sql, [id]);
    if (result.rows.length === 0) {
      throw new NotFoundException('Colección no encontrada');
    }

    return this.mapRow(result.rows[0]);
  }

  async create(dto: CreateProductCollectionDto) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const businessCheck = await dbPool.query('SELECT id FROM core.businesses WHERE id = $1', [dto.business_id]);
    if (businessCheck.rows.length === 0) {
      throw new BadRequestException('El negocio especificado no existe');
    }

    const name = dto.name?.trim();
    const slug = this.normalizeSlug(dto.slug || dto.name);
    const status = dto.status || 'active';

    if (!name) {
      throw new BadRequestException('El nombre es obligatorio');
    }
    if (!slug) {
      throw new BadRequestException('El slug es obligatorio');
    }

    try {
      const result = await dbPool.query(
        `
          INSERT INTO catalog.product_colecciones (business_id, name, slug, status)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `,
        [dto.business_id, name, slug, status],
      );

      return this.findOne(result.rows[0].id);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new BadRequestException('Ya existe una colección con ese nombre o slug para esta sucursal');
      }
      console.error('⚠️ Error creando colección:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
      });
      throw new ServiceUnavailableException('Error al crear la colección');
    }
  }

  async update(id: string, dto: UpdateProductCollectionDto) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    // Verificar que exista
    await this.findOne(id);

    const updateFields: string[] = [];
    const values: any[] = [];
    let index = 1;

    if (dto.name !== undefined) {
      const name = dto.name?.trim();
      if (!name) {
        throw new BadRequestException('El nombre no puede estar vacío');
      }
      updateFields.push(`name = $${index}`);
      values.push(name);
      index++;
    }

    if (dto.slug !== undefined) {
      const slug = this.normalizeSlug(dto.slug);
      if (!slug) {
        throw new BadRequestException('El slug no puede estar vacío');
      }
      updateFields.push(`slug = $${index}`);
      values.push(slug);
      index++;
    }

    if (dto.status !== undefined) {
      updateFields.push(`status = $${index}`);
      values.push(dto.status);
      index++;
    }

    if (updateFields.length === 0) {
      return this.findOne(id);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const sql = `
      UPDATE catalog.product_colecciones
      SET ${updateFields.join(', ')}
      WHERE id = $${index}
      RETURNING *
    `;

    try {
      await dbPool.query(sql, values);

      // Mantener consistencia con asignaciones si cambia el estado
      if (dto.status) {
        await dbPool.query(
          `
            UPDATE catalog.product_coleccion_assignments
            SET status = $1
            WHERE coleccion_id = $2
          `,
          [dto.status, id],
        );
      }

      return this.findOne(id);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new BadRequestException('Ya existe una colección con ese nombre o slug para esta sucursal');
      }
      console.error('⚠️ Error actualizando colección:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
      });
      throw new ServiceUnavailableException('Error al actualizar la colección');
    }
  }
}
