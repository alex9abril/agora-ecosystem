import {
  extractStoreSyncRow,
  parseStoreSyncConfig,
  type StoreSyncConfig,
} from './workflow-store-sync.util';
import type { DataBridgeFieldResolveCtx } from './workflow-sink-data-bridge.util';

const ctx: DataBridgeFieldResolveCtx = {
  businessId: '11111111-1111-1111-1111-111111111111',
  workflowId: '22222222-2222-2222-2222-222222222222',
  executedAt: new Date('2026-07-10T12:00:00Z'),
};

const baseConfig: StoreSyncConfig = {
  syncWithStore: true,
  insertMissingProducts: false,
  productCodeColumn: 'product_code',
  priceColumn: 'precio',
  stockColumn: 'quantity',
  nameColumn: null,
  catalogBusinessId: null,
};

describe('parseStoreSyncConfig', () => {
  it('parses sync flags and column overrides', () => {
    const cfg = parseStoreSyncConfig({
      syncWithStore: true,
      insertMissingProducts: true,
      syncProductCodeColumn: 'sku_ext',
      syncPriceColumn: 'price',
      syncStockColumn: 'stock',
      syncNameColumn: 'nombre',
    });
    expect(cfg.syncWithStore).toBe(true);
    expect(cfg.insertMissingProducts).toBe(true);
    expect(cfg.productCodeColumn).toBe('sku_ext');
    expect(cfg.priceColumn).toBe('price');
    expect(cfg.stockColumn).toBe('stock');
    expect(cfg.nameColumn).toBe('nombre');
  });

  it('defaults columns when omitted', () => {
    const cfg = parseStoreSyncConfig({});
    expect(cfg.syncWithStore).toBe(false);
    expect(cfg.productCodeColumn).toBe('product_code');
    expect(cfg.stockColumn).toBe('quantity');
  });
});

describe('extractStoreSyncRow', () => {
  it('reads mapped columns from row', () => {
    const row = {
      product_code: 'ABC-001',
      quantity: 12.5,
      precio: 199.99,
      nombre: 'Filtro de aceite',
    };
    const mappings = {
      product_code: '$row.product_code',
      quantity: '$row.quantity',
      precio: '$row.precio',
    };
    const item = extractStoreSyncRow(row, baseConfig, mappings, ctx);
    expect(item).toEqual({
      productCode: 'ABC-001',
      price: 199.99,
      stock: 12,
      name: 'Filtro de aceite',
    });
  });

  it('returns null when product code is missing', () => {
    const item = extractStoreSyncRow({ quantity: 1 }, baseConfig, {}, ctx);
    expect(item).toBeNull();
  });

  it('falls back to row_payload for name', () => {
    const row = {
      product_code: 'XYZ',
      quantity: 3,
      row_payload: { descripcion: 'Pastillas de freno' },
    };
    const item = extractStoreSyncRow(row, baseConfig, {}, ctx);
    expect(item?.name).toBe('Pastillas de freno');
  });

  it('resolves SKU from product when config says product_code (Alden / DMS)', () => {
    const row = {
      product: '697218407485',
      Descripcion: 'SILLA CAMP',
      sale_price: 0,
      inventario: 2,
    };
    const mappings = {
      product: '$row.product',
      inventario: '$row.inventario',
      sale_price: '$row.sale_price',
    };
    const item = extractStoreSyncRow(row, baseConfig, mappings, ctx);
    expect(item).toEqual({
      productCode: '697218407485',
      price: 0,
      stock: 2,
      name: 'SILLA CAMP',
    });
  });
});
