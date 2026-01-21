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
  image_url?: string | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
  total_products?: number;
}

@Injectable()
export class ProductCollectionsService {
  private normalizeBucketName(bucketName: string): string {
    if (!bucketName) return 'products';
    if (bucketName.startsWith('http')) {
      console.warn(
        '⚠️ [ProductCollectionsService] SUPABASE_STORAGE_BUCKET_PRODUCTS contiene una URL completa. Usando "products".',
      );
      return 'products';
    }
    if (bucketName.includes('://') || bucketName.includes('/storage/')) {
      console.warn(
        '⚠️ [ProductCollectionsService] SUPABASE_STORAGE_BUCKET_PRODUCTS parece una URL. Usando "products".',
      );
      return 'products';
    }
    return bucketName.trim();
  }

  private buildProductImageUrl(filePath?: string | null): string | null {
    if (!filePath) return null;
    if (filePath.startsWith('http')) return filePath;
    const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, '');
    if (!supabaseUrl) return null;
    const bucket = this.normalizeBucketName(process.env.SUPABASE_STORAGE_BUCKET_PRODUCTS || 'products');
    const normalizedPath = filePath.replace(/^\/+/, '');
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${normalizedPath}`;
  }

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
      image_url: row.image_url || null,
      description: row.description || null,
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
        pc.image_url,
        pc.description,
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

  async searchAvailableProducts(businessId: string, search: string, limit: number = 10) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const trimmed = search?.trim();
    if (!businessId || !trimmed) {
      return { data: [] };
    }

    const sql = `
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.price,
        p.image_url,
        pi.file_path AS primary_image_path,
        p.is_available
      FROM catalog.products p
      LEFT JOIN LATERAL (
        SELECT file_path
        FROM catalog.product_images
        WHERE product_id = p.id
          AND is_active = TRUE
        ORDER BY is_primary DESC, display_order ASC, created_at ASC
        LIMIT 1
      ) pi ON TRUE
      JOIN catalog.product_branch_availability pba
        ON pba.product_id = p.id
        AND pba.branch_id = $1
        AND pba.is_enabled = TRUE
        AND pba.is_active = TRUE
      WHERE (p.name ILIKE $2 OR p.sku ILIKE $2)
      ORDER BY p.name ASC
      LIMIT $3
    `;

    try {
      const result = await dbPool.query(sql, [businessId, `%${trimmed}%`, limit]);
      const data = (result.rows || []).map((row) => {
        const { primary_image_path, ...rest } = row;
        return {
          ...rest,
          image_url: row.image_url || this.buildProductImageUrl(primary_image_path),
        };
      });
      return { data };
    } catch (error: any) {
      console.error('⚠️ Error buscando productos disponibles:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
      });
      throw new ServiceUnavailableException('Error al buscar productos disponibles');
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
        pc.image_url,
        pc.description,
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

  async listProducts(collectionId: string, businessId: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const collectionCheck = await dbPool.query(
      'SELECT id FROM catalog.product_colecciones WHERE id = $1 AND business_id = $2',
      [collectionId, businessId],
    );
    if (collectionCheck.rows.length === 0) {
      throw new NotFoundException('Colección no encontrada');
    }

    const sql = `
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.price,
        p.is_available,
        p.image_url,
        pi.file_path AS primary_image_path,
        pca.status
      FROM catalog.product_coleccion_assignments pca
      JOIN catalog.products p ON p.id = pca.product_id
      LEFT JOIN LATERAL (
        SELECT file_path
        FROM catalog.product_images
        WHERE product_id = p.id
          AND is_active = TRUE
        ORDER BY is_primary DESC, display_order ASC, created_at ASC
        LIMIT 1
      ) pi ON TRUE
      WHERE pca.coleccion_id = $1 AND pca.business_id = $2
      ORDER BY p.name ASC
    `;

    try {
      const result = await dbPool.query(sql, [collectionId, businessId]);
      const data = (result.rows || []).map((row) => {
        const { primary_image_path, ...rest } = row;
        return {
          ...rest,
          image_url: row.image_url || this.buildProductImageUrl(primary_image_path),
        };
      });
      return { data };
    } catch (error: any) {
      console.error('⚠️ Error listando productos de colección:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
      });
      throw new ServiceUnavailableException('Error al obtener los productos de la colección');
    }
  }

  async removeProduct(collectionId: string, productId: string, businessId: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const result = await dbPool.query(
      `
        DELETE FROM catalog.product_coleccion_assignments
        WHERE coleccion_id = $1 AND product_id = $2 AND business_id = $3
        RETURNING product_id
      `,
      [collectionId, productId, businessId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Asignación de colección no encontrada');
    }

    return { product_id: result.rows[0].product_id };
  }

  async addProduct(collectionId: string, productId: string, businessId: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const collectionCheck = await dbPool.query(
      'SELECT id FROM catalog.product_colecciones WHERE id = $1 AND business_id = $2',
      [collectionId, businessId],
    );
    if (collectionCheck.rows.length === 0) {
      throw new NotFoundException('Colección no encontrada');
    }

    const productCheck = await dbPool.query(
      `
        SELECT
          p.id,
          p.business_id,
          (p.business_id = $2) AS is_owned,
          EXISTS (
            SELECT 1
            FROM catalog.product_branch_availability pba
            WHERE pba.product_id = p.id
              AND pba.branch_id = $2
              AND pba.is_enabled = TRUE
              AND COALESCE(pba.is_active, TRUE) = TRUE
          ) AS is_enabled_in_branch
        FROM catalog.products p
        WHERE p.id = $1
      `,
      [productId, businessId],
    );
    if (productCheck.rows.length === 0) {
      throw new NotFoundException('Producto no encontrado');
    }

    const { is_owned, is_enabled_in_branch } = productCheck.rows[0];
    if (!is_owned && !is_enabled_in_branch) {
      throw new NotFoundException('Producto no encontrado en la sucursal');
    }

    try {
      await dbPool.query(
        `
          INSERT INTO catalog.product_coleccion_assignments (product_id, coleccion_id, business_id, status)
          VALUES ($1, $2, $3, 'active')
          ON CONFLICT (product_id, coleccion_id, business_id)
          DO UPDATE SET status = 'active'
        `,
        [productId, collectionId, businessId],
      );

      return { product_id: productId };
    } catch (error: any) {
      console.error('⚠️ Error agregando producto a colección:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
      });
      throw new ServiceUnavailableException('Error al asignar producto a la colección');
    }
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
    const imageUrl = dto.image_url?.trim() || null;
    const description = dto.description?.trim() || null;

    if (!name) {
      throw new BadRequestException('El nombre es obligatorio');
    }
    if (!slug) {
      throw new BadRequestException('El slug es obligatorio');
    }

    try {
      const result = await dbPool.query(
        `
          INSERT INTO catalog.product_colecciones (business_id, name, slug, status, image_url, description)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `,
        [dto.business_id, name, slug, status, imageUrl, description],
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

    if (dto.image_url !== undefined) {
      const imageUrl = dto.image_url?.trim() || null;
      updateFields.push(`image_url = $${index}`);
      values.push(imageUrl);
      index++;
    }

    if (dto.description !== undefined) {
      const description = dto.description?.trim() || null;
      updateFields.push(`description = $${index}`);
      values.push(description);
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

  async remove(id: string) {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const sql = `
      DELETE FROM catalog.product_colecciones
      WHERE id = $1
      RETURNING id
    `;

    try {
      const result = await dbPool.query(sql, [id]);
      if (result.rows.length === 0) {
        throw new NotFoundException('Colección no encontrada');
      }
      return { id: result.rows[0].id };
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('⚠️ Error eliminando colección:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
      });
      throw new ServiceUnavailableException('Error al eliminar la colección');
    }
  }
}
