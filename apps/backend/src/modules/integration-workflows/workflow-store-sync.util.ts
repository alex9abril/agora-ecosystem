import type { Pool, PoolClient } from 'pg';
import {
  type DataBridgeFieldResolveCtx,
  resolveFieldSpec,
} from './workflow-sink-data-bridge.util';

export type StoreSyncConfig = {
  syncWithStore: boolean;
  insertMissingProducts: boolean;
  productCodeColumn: string;
  priceColumn: string | null;
  stockColumn: string;
  nameColumn: string | null;
  catalogBusinessId: string | null;
};

export type StoreSyncRow = {
  productCode: string;
  price: number | null;
  stock: number | null;
  name: string;
};

export type StoreSyncResult = {
  matched: number;
  updated: number;
  inserted: number;
  skipped: number;
  errors: string[];
};

const DEFAULT_PRODUCT_CODE_COLUMN = 'product_code';
const DEFAULT_STOCK_COLUMN = 'quantity';

export function parseStoreSyncConfig(nodeData: Record<string, unknown>): StoreSyncConfig {
  const str = (key: string): string | null => {
    const v = nodeData[key];
    return typeof v === 'string' && v.trim() ? v.trim() : null;
  };
  return {
    syncWithStore: nodeData.syncWithStore === true,
    insertMissingProducts: nodeData.insertMissingProducts === true,
    productCodeColumn: str('syncProductCodeColumn') ?? DEFAULT_PRODUCT_CODE_COLUMN,
    priceColumn: str('syncPriceColumn'),
    stockColumn: str('syncStockColumn') ?? DEFAULT_STOCK_COLUMN,
    nameColumn: str('syncNameColumn'),
    catalogBusinessId: str('syncCatalogBusinessId'),
  };
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}

function getColumnValue(
  row: Record<string, unknown>,
  columnName: string,
  fieldMappings: Record<string, string>,
  ctx: DataBridgeFieldResolveCtx,
): unknown {
  const col = columnName.trim();
  if (!col) return undefined;
  const spec = fieldMappings[col];
  if (spec) {
    const mapped = resolveFieldSpec(row, spec, ctx);
    if (mapped !== undefined && mapped !== null && mapped !== '') return mapped;
  }
  if (col in row) return row[col];
  return undefined;
}

function toNullableNumber(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toStockInteger(v: unknown): number | null {
  const n = toNullableNumber(v);
  if (n === null) return null;
  return Math.max(0, Math.floor(n));
}

function pickNameFromPayload(payload: Record<string, unknown>): string | null {
  for (const key of ['nombre', 'name', 'descripcion', 'description', 'titulo', 'title']) {
    const v = payload[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

export function extractStoreSyncRow(
  row: Record<string, unknown>,
  config: StoreSyncConfig,
  fieldMappings: Record<string, string>,
  ctx: DataBridgeFieldResolveCtx,
): StoreSyncRow | null {
  const rawCode = getColumnValue(row, config.productCodeColumn, fieldMappings, ctx);
  const productCode = rawCode == null ? '' : String(rawCode).trim();
  if (!productCode) return null;

  const priceRaw = config.priceColumn
    ? getColumnValue(row, config.priceColumn, fieldMappings, ctx)
    : undefined;
  const stockRaw = getColumnValue(row, config.stockColumn, fieldMappings, ctx);

  let name: string | null = null;
  if (config.nameColumn) {
    const nameRaw = getColumnValue(row, config.nameColumn, fieldMappings, ctx);
    if (nameRaw != null && String(nameRaw).trim()) name = String(nameRaw).trim();
  }
  if (!name) {
    name = pickNameFromPayload(row);
  }
  if (!name && isRecord(row.row_payload)) {
    name = pickNameFromPayload(row.row_payload);
  }

  return {
    productCode,
    price: toNullableNumber(priceRaw),
    stock: toStockInteger(stockRaw),
    name: name ?? productCode,
  };
}

async function resolveCatalogBusinessId(
  client: PoolClient,
  branchId: string,
  configuredId: string | null,
): Promise<string> {
  if (configuredId) {
    const { rows } = await client.query(
      `SELECT id FROM core.businesses WHERE id = $1 AND is_active = TRUE LIMIT 1`,
      [configuredId],
    );
    if (rows.length > 0) return configuredId;
  }

  const { rows: groupRows } = await client.query(
    `SELECT business_group_id FROM core.businesses WHERE id = $1 LIMIT 1`,
    [branchId],
  );
  const groupId = groupRows[0]?.business_group_id as string | null | undefined;
  if (groupId) {
    const { rows: peerRows } = await client.query(
      `SELECT id FROM core.businesses
       WHERE business_group_id = $1 AND is_active = TRUE
       ORDER BY created_at ASC
       LIMIT 1`,
      [groupId],
    );
    if (peerRows.length > 0) return peerRows[0].id as string;
  }

  return branchId;
}

async function findProductBySku(client: PoolClient, sku: string): Promise<{ id: string } | null> {
  const { rows } = await client.query(
    `SELECT id FROM catalog.products
     WHERE sku IS NOT NULL AND LOWER(TRIM(sku)) = LOWER(TRIM($1))
     LIMIT 1`,
    [sku],
  );
  return rows.length > 0 ? { id: rows[0].id as string } : null;
}

async function upsertBranchAvailability(
  client: PoolClient,
  productId: string,
  branchId: string,
  price: number | null,
  stock: number | null,
): Promise<void> {
  await client.query(
    `INSERT INTO catalog.product_branch_availability (
       product_id, branch_id, is_enabled, price, stock, is_active, updated_at
     )
     VALUES ($1, $2, TRUE, $3, $4, TRUE, CURRENT_TIMESTAMP)
     ON CONFLICT (product_id, branch_id)
     DO UPDATE SET
       is_enabled = TRUE,
       price = EXCLUDED.price,
       stock = EXCLUDED.stock,
       is_active = TRUE,
       updated_at = CURRENT_TIMESTAMP`,
    [productId, branchId, price, stock],
  );
}

async function createCatalogProduct(
  client: PoolClient,
  catalogBusinessId: string,
  item: StoreSyncRow,
  meta: { tableName: string; workflowId: string | null },
): Promise<string> {
  const metadata = JSON.stringify({
    source: 'data_bridge',
    data_bridge_table: meta.tableName,
    workflow_id: meta.workflowId,
  });
  const price = item.price ?? 0;
  const { rows } = await client.query(
    `INSERT INTO catalog.products (
       business_id, name, sku, price, product_type, is_available, metadata
     )
     VALUES ($1, $2, $3, $4, 'refaccion', TRUE, $5::jsonb)
     RETURNING id`,
    [catalogBusinessId, item.name, item.productCode, price, metadata],
  );
  return rows[0].id as string;
}

/**
 * Cruza filas ingeridas en data_bridge con el catálogo y actualiza precio/stock por sucursal.
 * Si `insertMissingProducts` está activo, crea productos ausentes en `catalog.products`.
 */
export async function syncIngestedRowsToStore(
  pool: Pool,
  params: {
    branchId: string;
    tableName: string;
    workflowId: string | null;
    config: StoreSyncConfig;
    sourceRows: Record<string, unknown>[];
    fieldMappings: Record<string, string>;
    ctx: DataBridgeFieldResolveCtx;
  },
): Promise<StoreSyncResult> {
  const result: StoreSyncResult = {
    matched: 0,
    updated: 0,
    inserted: 0,
    skipped: 0,
    errors: [],
  };

  if (!params.config.syncWithStore || params.sourceRows.length === 0) {
    return result;
  }

  const deduped = new Map<string, StoreSyncRow>();
  for (let i = 0; i < params.sourceRows.length; i++) {
    const row = params.sourceRows[i];
    if (!isRecord(row)) {
      result.skipped++;
      result.errors.push(`Fila ${i}: no es un objeto; omitida en sincronización con tienda.`);
      continue;
    }
    const item = extractStoreSyncRow(row, params.config, params.fieldMappings, params.ctx);
    if (!item) {
      result.skipped++;
      result.errors.push(`Fila ${i}: sin código de producto; omitida en sincronización con tienda.`);
      continue;
    }
    deduped.set(item.productCode.toLowerCase(), item);
  }

  if (deduped.size === 0) {
    return result;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const catalogBusinessId = params.config.insertMissingProducts
      ? await resolveCatalogBusinessId(client, params.branchId, params.config.catalogBusinessId)
      : null;

    for (const item of deduped.values()) {
      try {
        const existing = await findProductBySku(client, item.productCode);
        if (existing) {
          result.matched++;
          await upsertBranchAvailability(
            client,
            existing.id,
            params.branchId,
            item.price,
            item.stock,
          );
          result.updated++;
          continue;
        }

        if (!params.config.insertMissingProducts) {
          result.skipped++;
          result.errors.push(`SKU "${item.productCode}" no existe en catálogo; omitido.`);
          continue;
        }

        if (!catalogBusinessId) {
          result.skipped++;
          result.errors.push(`SKU "${item.productCode}": no se pudo resolver negocio de catálogo.`);
          continue;
        }

        const dupCheck = await client.query(
          `SELECT id FROM catalog.products WHERE business_id = $1 AND LOWER(TRIM(sku)) = LOWER(TRIM($2)) LIMIT 1`,
          [catalogBusinessId, item.productCode],
        );
        let productId: string;
        if (dupCheck.rows.length > 0) {
          productId = dupCheck.rows[0].id as string;
        } else {
          productId = await createCatalogProduct(client, catalogBusinessId, item, {
            tableName: params.tableName,
            workflowId: params.workflowId,
          });
          result.inserted++;
        }

        await upsertBranchAvailability(
          client,
          productId,
          params.branchId,
          item.price,
          item.stock,
        );
        result.updated++;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        result.skipped++;
        result.errors.push(`SKU "${item.productCode}": ${msg}`);
      }
    }

    await client.query('COMMIT');
  } catch (e: unknown) {
    await client.query('ROLLBACK');
    const msg = e instanceof Error ? e.message : String(e);
    result.errors.push(`Error en transacción de sincronización con tienda: ${msg}`);
  } finally {
    client.release();
  }

  return result;
}
