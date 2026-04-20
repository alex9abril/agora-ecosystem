import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common';
import { dbPool } from '../../config/database.config';

export type StoreType = 'global' | 'group' | 'branch' | 'group_brand' | 'global_brand';

export interface Store {
  id: string;
  type: StoreType;
  business_group_id: string | null;
  business_id: string | null;
  vehicle_brand_id: string | null;
  slug: string | null;
  name: string;
  is_active: boolean;
  settings: Record<string, unknown>;
  /** Presente solo si se ejecutó migration_stores_archived_at.sql */
  archived_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ListStoresDto {
  page?: number;
  limit?: number;
  type?: string;
  businessGroupId?: string;
  businessId?: string;
  vehicleBrandId?: string;
  isActive?: boolean;
  search?: string;
  includeArchived?: boolean;
}

export interface StoreDisableReason {
  id: string;
  code: string;
  name: string;
  description: string | null;
  display_order: number;
}

@Injectable()
export class StoresService {
  /**
   * Resuelve store_id a partir de la ruta de contexto (ej: /grupo/grupo-andrade, /sucursal/toyota-satelite, /brand/nissan).
   * Normaliza el path (quita leading slash) y busca por slug.
   */
  async resolveStoreFromPath(storeContext: string): Promise<{ id: string; store?: Store } | null> {
    if (!dbPool) return null;
    const path = (storeContext || '').trim().replace(/^\//, '');
    if (!path) return null;

    const slug = path.toLowerCase();
    const result = await dbPool.query(
      `SELECT id, type, business_group_id, business_id, vehicle_brand_id, slug, name, is_active, settings, created_at, updated_at
       FROM core.stores
       WHERE (slug = $1 OR slug = $2) AND is_active = TRUE
       LIMIT 1`,
      [slug, '/' + path]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      id: row.id,
      store: this.mapRowToStore(row),
    };
  }

  async findAll(dto: ListStoresDto): Promise<{
    data: Store[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }
    const page = Math.max(1, dto.page ?? 1);
    const limit = Math.min(100, Math.max(1, dto.limit ?? 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['1=1'];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (dto.type) {
      conditions.push(`s.type = $${paramIndex}`);
      params.push(dto.type);
      paramIndex++;
    }
    if (dto.businessGroupId) {
      if (dto.type === 'branch') {
        // Tiendas branch: el grupo debe inferirse desde la sucursal (core.businesses).
        // Filtrar solo por stores.business_group_id oculta filas si quedó NULL o desincronizada.
        conditions.push(
          `(EXISTS (SELECT 1 FROM core.businesses b WHERE b.id = s.business_id AND b.business_group_id = $${paramIndex}) OR s.business_group_id = $${paramIndex})`,
        );
        params.push(dto.businessGroupId);
        paramIndex++;
      } else {
        conditions.push(`s.business_group_id = $${paramIndex}`);
        params.push(dto.businessGroupId);
        paramIndex++;
      }
    }
    if (dto.businessId) {
      conditions.push(`s.business_id = $${paramIndex}`);
      params.push(dto.businessId);
      paramIndex++;
    }
    if (dto.vehicleBrandId) {
      conditions.push(`s.vehicle_brand_id = $${paramIndex}`);
      params.push(dto.vehicleBrandId);
      paramIndex++;
    }
    if (dto.isActive !== undefined) {
      conditions.push(`s.is_active = $${paramIndex}`);
      params.push(dto.isActive);
      paramIndex++;
    }
    if (dto.search) {
      conditions.push(`(s.name ILIKE $${paramIndex} OR s.slug ILIKE $${paramIndex})`);
      params.push(`%${dto.search}%`);
      paramIndex++;
    }
    if (dto.includeArchived !== true) {
      conditions.push('(s.archived_at IS NULL)');
    }
    const whereClause = conditions.join(' AND ');
    const countResult = await dbPool.query(
      `SELECT COUNT(*)::int AS total FROM core.stores s WHERE ${whereClause}`,
      params
    );
    const total = countResult.rows[0]?.total ?? 0;

    params.push(limit, offset);
    const listResult = await dbPool.query(
      `SELECT s.id, s.type, s.business_group_id, s.business_id, s.vehicle_brand_id, s.slug, s.name, s.is_active, s.settings, s.created_at, s.updated_at
       FROM core.stores s
       WHERE ${whereClause}
       ORDER BY s.type, s.name
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    const data = listResult.rows.map((row) => this.mapRowToStore(row));
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findById(id: string): Promise<Store> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }
    let row: Record<string, unknown> | undefined;
    try {
      const result = await dbPool.query(
        `SELECT id, type, business_group_id, business_id, vehicle_brand_id, slug, name, is_active, settings, created_at, updated_at, archived_at
         FROM core.stores WHERE id = $1`,
        [id]
      );
      if (result.rows.length === 0) {
        throw new NotFoundException('Tienda no encontrada');
      }
      row = result.rows[0];
    } catch (err: unknown) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      const code = (err as { code?: string })?.code;
      if (code === '42703') {
        const result = await dbPool.query(
          `SELECT id, type, business_group_id, business_id, vehicle_brand_id, slug, name, is_active, settings, created_at, updated_at
           FROM core.stores WHERE id = $1`,
          [id]
        );
        if (result.rows.length === 0) {
          throw new NotFoundException('Tienda no encontrada');
        }
        row = result.rows[0];
      } else {
        throw err;
      }
    }
    return this.mapRowToStore(row!);
  }

  async findByPath(path: string): Promise<Store> {
    const resolved = await this.resolveStoreFromPath(path);
    if (!resolved?.store) {
      throw new NotFoundException('Tienda no encontrada para el path: ' + path);
    }
    return resolved.store;
  }

  async create(dto: {
    type: 'group' | 'branch' | 'group_brand';
    businessGroupId?: string;
    businessId?: string;
    vehicleBrandId?: string;
  }): Promise<Store> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }
    const { type, businessGroupId, businessId, vehicleBrandId } = dto;

    if (type === 'group') {
      if (!businessGroupId) throw new BadRequestException('businessGroupId es requerido para tienda tipo group');
      const exists = await dbPool.query(
        'SELECT 1 FROM core.stores WHERE type = $1 AND business_group_id = $2',
        ['group', businessGroupId]
      );
      if (exists.rows.length > 0) throw new BadRequestException('Ya existe una tienda de grupo para este grupo');
      const gr = await dbPool.query(
        'SELECT id, name, slug FROM core.business_groups WHERE id = $1',
        [businessGroupId]
      );
      if (gr.rows.length === 0) throw new NotFoundException('Grupo no encontrado');
      const { name, slug } = gr.rows[0];
      const slugVal = 'grupo/' + (slug || businessGroupId);
      const nameVal = name || 'Grupo';
      const result = await dbPool.query(
        `INSERT INTO core.stores (type, business_group_id, slug, name, is_active)
         VALUES ('group', $1, $2, $3, FALSE)
         RETURNING id, type, business_group_id, business_id, vehicle_brand_id, slug, name, is_active, settings, created_at, updated_at`,
        [businessGroupId, slugVal, nameVal]
      );
      return this.mapRowToStore(result.rows[0]);
    }

    if (type === 'branch') {
      if (!businessId) throw new BadRequestException('businessId es requerido para tienda tipo branch');
      const exists = await dbPool.query(
        'SELECT 1 FROM core.stores WHERE type = $1 AND business_id = $2',
        ['branch', businessId]
      );
      if (exists.rows.length > 0) throw new BadRequestException('Ya existe una tienda para esta sucursal');
      const br = await dbPool.query(
        'SELECT id, name, slug, business_group_id FROM core.businesses WHERE id = $1',
        [businessId]
      );
      if (br.rows.length === 0) throw new NotFoundException('Sucursal no encontrada');
      const row = br.rows[0];
      const slugVal = 'sucursal/' + (row.slug || businessId);
      const nameVal = row.name || 'Sucursal';
      // Tienda nace deshabilitada (is_active = FALSE); el usuario la publica desde Tiendas cuando quiera
      const result = await dbPool.query(
        `INSERT INTO core.stores (type, business_id, business_group_id, slug, name, is_active)
         VALUES ('branch', $1, $2, $3, $4, FALSE)
         RETURNING id, type, business_group_id, business_id, vehicle_brand_id, slug, name, is_active, settings, created_at, updated_at`,
        [businessId, row.business_group_id ?? null, slugVal, nameVal]
      );
      return this.mapRowToStore(result.rows[0]);
    }

    if (type === 'group_brand') {
      if (!businessGroupId || !vehicleBrandId) {
        throw new BadRequestException('businessGroupId y vehicleBrandId son requeridos para tienda tipo group_brand');
      }
      const exists = await dbPool.query(
        'SELECT 1 FROM core.stores WHERE type = $1 AND business_group_id = $2 AND vehicle_brand_id = $3',
        ['group_brand', businessGroupId, vehicleBrandId]
      );
      if (exists.rows.length > 0) throw new BadRequestException('Ya existe una tienda grupo+marca para este grupo y marca');
      const gr = await dbPool.query(
        'SELECT id, name, slug FROM core.business_groups WHERE id = $1',
        [businessGroupId]
      );
      const vb = await dbPool.query(
        'SELECT id, name, code FROM catalog.vehicle_brands WHERE id = $1',
        [vehicleBrandId]
      );
      if (gr.rows.length === 0) throw new NotFoundException('Grupo no encontrado');
      if (vb.rows.length === 0) throw new NotFoundException('Marca no encontrada');
      const g = gr.rows[0];
      const v = vb.rows[0];
      const slugVal = 'grupo/' + (g.slug || businessGroupId) + '/marca/' + (v.code ? String(v.code).toLowerCase() : vehicleBrandId);
      const nameVal = (g.name || 'Grupo') + ' - ' + (v.name || v.code || 'Marca');
      const result = await dbPool.query(
        `INSERT INTO core.stores (type, business_group_id, vehicle_brand_id, slug, name, is_active)
         VALUES ('group_brand', $1, $2, $3, $4, TRUE)
         RETURNING id, type, business_group_id, business_id, vehicle_brand_id, slug, name, is_active, settings, created_at, updated_at`,
        [businessGroupId, vehicleBrandId, slugVal, nameVal]
      );
      return this.mapRowToStore(result.rows[0]);
    }

    throw new BadRequestException('Tipo de tienda no soportado para creación');
  }

  async getDisableReasons(): Promise<StoreDisableReason[]> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }
    const result = await dbPool.query(
      `SELECT id, code, name, description, display_order
       FROM catalog.store_disable_reasons
       WHERE is_active = TRUE
       ORDER BY display_order, name`
    );
    return result.rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description ?? null,
      display_order: row.display_order,
    }));
  }

  async update(
    id: string,
    dto: {
      name?: string;
      isActive?: boolean;
      settings?: Record<string, unknown>;
      disableReasonId?: string;
      disableNotes?: string;
    },
    createdBy?: string
  ): Promise<Store> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }
    const existing = await this.findById(id);
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    if (dto.name !== undefined) {
      updates.push(`name = $${idx}`);
      values.push(dto.name);
      idx++;
    }
    if (dto.isActive !== undefined) {
      if (dto.isActive === false && existing.is_active === true) {
        if (!dto.disableReasonId) {
          throw new BadRequestException('Al deshabilitar una tienda debe indicar el motivo (disableReasonId).');
        }
      }
      updates.push(`is_active = $${idx}`);
      values.push(dto.isActive);
      idx++;
    }
    if (dto.settings !== undefined) {
      updates.push(`settings = $${idx}::jsonb`);
      values.push(JSON.stringify(dto.settings));
      idx++;
    }
    if (updates.length === 0) return existing;
    values.push(id);
    const result = await dbPool.query(
      `UPDATE core.stores SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING id, type, business_group_id, business_id, vehicle_brand_id, slug, name, is_active, settings, created_at, updated_at`,
      values
    );
    const updated = this.mapRowToStore(result.rows[0]);

    if (dto.isActive === false && existing.is_active === true && dto.disableReasonId) {
      await dbPool.query(
        `INSERT INTO core.store_status_log (store_id, action, disable_reason_id, notes, created_by)
         VALUES ($1, 'disabled', $2, $3, $4)`,
        [id, dto.disableReasonId, dto.disableNotes ?? null, createdBy ?? null]
      );
    }
    if (dto.isActive === true && existing.is_active === false && createdBy) {
      await dbPool.query(
        `INSERT INTO core.store_status_log (store_id, action, created_by)
         VALUES ($1, 'enabled', $2)`,
        [id, createdBy]
      );
    }

    return updated;
  }

  /**
   * Archiva una tienda de forma irreversible. La tienda deja de mostrarse en listados,
   * selector y resolución por path. Se requiere confirmar con el nombre exacto.
   */
  async archive(id: string, confirmName: string): Promise<void> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }
    const result = await dbPool.query(
      `SELECT id, name FROM core.stores WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Tienda no encontrada');
    }
    const row = result.rows[0];
    const trimmed = (confirmName ?? '').trim();
    const storeName = (row.name ?? '').trim();
    if (storeName.toLowerCase() !== trimmed.toLowerCase()) {
      throw new BadRequestException('El nombre no coincide con el de la tienda');
    }
    await dbPool.query(
      `UPDATE core.stores SET archived_at = CURRENT_TIMESTAMP, is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );
  }

  private mapRowToStore(row: Record<string, unknown>): Store {
    return {
      id: row.id as string,
      type: row.type as StoreType,
      business_group_id: row.business_group_id as string | null,
      business_id: row.business_id as string | null,
      vehicle_brand_id: row.vehicle_brand_id as string | null,
      slug: row.slug as string | null,
      name: row.name as string,
      is_active: row.is_active as boolean,
      settings: (row.settings as Record<string, unknown>) ?? {},
      ...(row.archived_at != null && { archived_at: row.archived_at as Date }),
      created_at: row.created_at as Date,
      updated_at: row.updated_at as Date,
    };
  }
}
