import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { dbPool } from '../../../config/database.config';
import { CreateProductClassificationDto } from './dto/create-product-classification.dto';
import { UpdateProductClassificationDto } from './dto/update-product-classification.dto';
import { ListProductClassificationsDto } from './dto/list-product-classifications.dto';

interface ProductClassificationRow {
  id: string;
  business_id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  total_products?: number;
}

@Injectable()
export class ProductClassificationsService {
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

  private mapRow(row: ProductClassificationRow) {
    return {
      id: row.id,
      business_id: row.business_id,
      name: row.name,
      slug: row.slug,
      created_at: row.created_at,
      updated_at: row.updated_at,
      total_products: row.total_products !== undefined ? Number(row.total_products) : undefined,
    };
  }

  async list(query: ListProductClassificationsDto) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;
    const params: any[] = [query.businessId];
    const where: string[] = ['pc.business_id = $1'];

    if (query.search) {
      params.push(`%${query.search}%`);
      where.push(`(pc.name ILIKE $2 OR pc.slug ILIKE $2)`);
    }

    const sql = `
      SELECT 
        pc.id,
        pc.business_id,
        pc.name,
        pc.slug,
        pc.created_at,
        pc.updated_at,
        COUNT(DISTINCT pca.product_id) AS total_products
      FROM catalog.product_classifications pc
      LEFT JOIN catalog.product_classification_assignments pca ON pca.classification_id = pc.id
      WHERE ${where.join(' AND ')}
      GROUP BY pc.id
      ORDER BY pc.name ASC
    `;

    try {
      const result = await pool.query(sql, params);
      const data = (result.rows || []).map((row) => this.mapRow(row));
      return { data, pagination: { total: data.length, page: 1, limit: data.length, totalPages: 1 } };
    } catch (error: any) {
      console.error('⚠️ Error listando clasificaciones:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
      });
      throw new ServiceUnavailableException('Error al obtener las clasificaciones');
    }
  }

  async findOne(id: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const pool = dbPool;

    const sql = `
      SELECT 
        pc.id,
        pc.business_id,
        pc.name,
        pc.slug,
        pc.created_at,
        pc.updated_at,
        COUNT(DISTINCT pca.product_id) AS total_products
      FROM catalog.product_classifications pc
      LEFT JOIN catalog.product_classification_assignments pca ON pca.classification_id = pc.id
      WHERE pc.id = $1
      GROUP BY pc.id
    `;

    const result = await pool.query(sql, [id]);
    if (result.rows.length === 0) {
      throw new NotFoundException('Clasificación no encontrada');
    }

    return this.mapRow(result.rows[0]);
  }

  async create(dto: CreateProductClassificationDto) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }
    const pool = dbPool;

    const businessCheck = await pool.query('SELECT id FROM core.businesses WHERE id = $1', [dto.business_id]);
    if (businessCheck.rows.length === 0) {
      throw new BadRequestException('El negocio especificado no existe');
    }

    const name = dto.name?.trim();
    const slug = this.normalizeSlug(dto.slug || dto.name);

    if (!name) {
      throw new BadRequestException('El nombre es obligatorio');
    }
    if (!slug) {
      throw new BadRequestException('El slug es obligatorio');
    }

    try {
      const result = await pool.query(
        `
        INSERT INTO catalog.product_classifications (business_id, name, slug)
        VALUES ($1, $2, $3)
        RETURNING *
      `,
        [dto.business_id, name, slug],
      );

      return this.findOne(result.rows[0].id);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new BadRequestException('Ya existe una clasificación con ese nombre o slug para esta sucursal');
      }
      console.error('⚠️ Error creando clasificación:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
      });
      throw new ServiceUnavailableException('Error al crear la clasificación');
    }
  }

  async update(id: string, dto: UpdateProductClassificationDto) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }
    const pool = dbPool;

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

    if (updateFields.length === 0) {
      return this.findOne(id);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const sql = `
      UPDATE catalog.product_classifications
      SET ${updateFields.join(', ')}
      WHERE id = $${index}
      RETURNING *
    `;

    try {
      await pool.query(sql, values);
      return this.findOne(id);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new BadRequestException('Ya existe una clasificación con ese nombre o slug para esta sucursal');
      }
      console.error('⚠️ Error actualizando clasificación:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
      });
      throw new ServiceUnavailableException('Error al actualizar la clasificación');
    }
  }
}
