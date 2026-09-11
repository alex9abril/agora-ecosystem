# Data Bridge Import / Merge / Publish Implementation Guide

This guide explains how to recreate the Alden import flow in a similar project that already has the same general app structure, auth, business scoping, database access, and `data_bridge.integration_alden_satelite` table.

Do not include environment setup here. The target project should already have its own Supabase/database configuration.

## SQL File To Move

Move this SQL file into the target project and run it against the target database:

```text
database/agora/migration_data_bridge_prueba_export_tables.sql
```

This file creates the working tables for the import flow:

```text
data_bridge.prueba_inventory_export
data_bridge.prueba_mex_insurance_prices_export
data_bridge.prueba_inventory_prices_merged_export
```

The publish target is not created by this SQL file. It must already exist:

```text
data_bridge.integration_alden_satelite
```

Expected publish target columns:

```text
product
localizacion
descripcion
price
inventario
```

## System Overview

The flow has four actions:

```text
1. Upload inventory XLS into staging.
2. Upload insurance prices TXT into staging.
3. Merge staging rows by normalized SKU into a merged table.
4. Publish merged rows into integration_alden_satelite.
```

All backend endpoints should live under the existing business-scoped integration route:

```text
/api/businesses/:businessId/integration
```

Required endpoints:

```text
POST /data-bridge/test-exports/upload-rows
POST /data-bridge/test-exports/merge
POST /data-bridge/test-exports/publish
```

## Backend Implementation

Create two DTOs in the target project's integration/workflows module or equivalent backend module.

Upload DTO:

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Allow, IsArray, IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export type DataBridgeTestExportTableName =
  | 'prueba_inventory_export'
  | 'prueba_mex_insurance_prices_export';

export class UploadDataBridgeTestExportDto {
  @ApiProperty({ enum: ['prueba_inventory_export', 'prueba_mex_insurance_prices_export'] })
  @IsString()
  @IsIn(['prueba_inventory_export', 'prueba_mex_insurance_prices_export'])
  tableName!: DataBridgeTestExportTableName;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  sourceFileName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  importBatchId?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  clearExisting?: boolean;

  @ApiProperty({ type: [Object] })
  @IsArray()
  @Allow()
  @Type(() => Object)
  rows!: unknown[];
}
```

Merge DTO:

```ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class MergeDataBridgeTestExportsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  mergeBatchId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  clearExisting?: boolean;
}
```

The `@Type(() => Object)` on `rows` is important. Without it, Nest/class-transformer can convert uploaded row objects into Array instances, causing rows to arrive as `[]`.

## Upload Endpoint

Implement:

```text
POST /data-bridge/test-exports/upload-rows
```

Request shape:

```ts
{
  tableName: 'prueba_inventory_export' | 'prueba_mex_insurance_prices_export';
  sourceFileName: string;
  importBatchId?: string;
  clearExisting?: boolean;
  rows: unknown[];
}
```

Behavior:

```text
1. Validate business access.
2. Allow only the two staging tables.
3. Limit batch size:
   - inventory: 100 rows
   - prices: 1000 rows
4. If clearExisting is true, delete existing rows for that business_id from the selected staging table.
5. Insert valid rows.
6. Skip rows missing the required SKU field.
```

Inventory row mapping:

```text
incoming no_parte / "No. Parte" -> "No. Parte"
incoming descripcion            -> "Descripción"
incoming ubica                  -> "Ubica"
incoming exist                  -> "Exist"
```

Prices row mapping:

```text
incoming ADJSTCLAIM -> "ADJSTCLAIM"
incoming ADJSTMNT   -> "ADJSTMNT"
incoming WARR.      -> "WARR."
incoming CLAIM      -> "CLAIM"
```

Return shape:

```ts
{
  tableName: string;
  importBatchId: string;
  inserted: number;
  failed: number;
  cleared: number;
  sampleErrors: string[];
}
```

## Merge Endpoint

Implement:

```text
POST /data-bridge/test-exports/merge
```

Behavior:

```text
1. Validate business access.
2. Count expected matches between inventory and prices.
3. Delete previous merged rows for this business_id.
4. Insert merged rows in batches.
5. Match by normalized inventory "No. Parte" and normalized prices "ADJSTCLAIM".
6. Include only rows where inventory "Exist" > 0 and prices "CLAIM" > 0.
```

SKU normalization:

```sql
NULLIF(REGEXP_REPLACE(UPPER(BTRIM(value)), '[^A-Z0-9]+', '', 'g'), '')
```

Location cleanup:

```sql
NULLIF(REGEXP_REPLACE(BTRIM(value), '^[^[:alnum:]]+', ''), '')
```

Example:

```text
'BOUTIQUE/ -> BOUTIQUE/
'B06-1B    -> B06-1B
```

Merged table mapping:

```text
inventory "No. Parte" normalized -> merged sku
inventory "Descripción"          -> merged descripcion
inventory "Ubica" cleaned        -> merged ubicacion
inventory "Exist"                -> merged existencias
prices ADJSTMNT + WARR.          -> merged nombres
prices CLAIM                     -> merged price
```

Return shape:

```ts
{
  tableName: 'prueba_inventory_prices_merged_export';
  mergeBatchId: string;
  inserted: number;
  expectedRows: number;
  batches: number;
  batchSize: number;
  cleared: number;
  failedBatches: number;
  sampleErrors: string[];
}
```

## Publish Endpoint

Implement:

```text
POST /data-bridge/test-exports/publish
```

Behavior:

```text
1. Validate business access.
2. Read rows from prueba_inventory_prices_merged_export for the selected business_id.
3. Use only rows with existencias > 0 and price > 0.
4. Normalize merged sku and satellite product with the same SKU normalization.
5. Update existing satellite rows first.
6. Insert missing satellite rows second.
7. Do not insert a row when a normalized product already exists.
```

Publish match key:

```text
normalized merged.sku = normalized integration_alden_satelite.product
```

Publish field mapping:

```text
merged sku         -> integration_alden_satelite.product
merged ubicacion   -> integration_alden_satelite.localizacion
merged descripcion -> integration_alden_satelite.descripcion
merged price       -> integration_alden_satelite.price
merged existencias -> integration_alden_satelite.inventario
```

Do not write these satellite fields:

```text
sale_price
dias
install_cost
sat_id
```

Do not wipe `integration_alden_satelite` unless the target project adds a safe business/client scope to that table. The current target table has no `business_id`, so a full wipe would be global.

Return shape:

```ts
{
  tableName: 'integration_alden_satelite';
  sourceRows: number;
  updated: number;
  inserted: number;
  published: number;
}
```

## Frontend Implementation

Add a new upload/publish panel in the target project's local/admin web app.

The panel needs four actions:

```text
Subir inventario
Subir precios
Fusionar tablas de prueba
Publicar
```

Add API client functions for:

```text
uploadDataBridgeTestExportRows
mergeDataBridgeTestExports
publishDataBridgeTestExports
```

Inventory parser requirements:

```text
1. Accept .xls, .xlsx, .csv.
2. Use the xlsx package as a static import on this page.
3. Read worksheet cells directly by coordinates.
4. Find the header row containing normalized "No. Parte" and "Exist".
5. Build rows with:
   - no_parte
   - descripcion
   - ubica
   - exist
   - cells
   - source_row_number
6. Skip empty rows and rows without No. Parte.
7. Before uploading, fail fast if any parsed row is an array or lacks no_parte.
```

Inventory upload batch size:

```text
100
```

Prices parser requirements:

```text
1. Accept .txt.
2. Split by line.
3. Parse SKU from the first 15 characters.
4. Parse price from the trailing numeric/money value.
5. Parse ADJSTMNT and WARR. from the middle text.
6. Build rows with:
   - ADJSTCLAIM
   - ADJSTMNT
   - WARR.
   - CLAIM
   - cells
   - source_row_number
```

Prices upload batch size:

```text
1000
```

Upload behavior:

```text
1. Generate one importBatchId per file upload.
2. Send clearExisting: true only on the first batch.
3. Send clearExisting: false on subsequent batches.
4. Keep "replace previous data" enabled by default.
```

Merge UI behavior:

```text
1. Show an indeterminate running state while the request is active.
2. After completion show inserted / expectedRows.
3. Show batch count and mergeBatchId.
```

Publish UI behavior:

```text
1. Place a "Publicar" button below merge.
2. Disable it while upload, merge, or publish is running.
3. Show sourceRows, updated, inserted, and published after completion.
```

## Validation SQL

Expected merge count versus actual merged rows:

```sql
WITH inv AS (
  SELECT DISTINCT
    NULLIF(REGEXP_REPLACE(UPPER(BTRIM("No. Parte")), '[^A-Z0-9]+', '', 'g'), '') AS sku
  FROM data_bridge.prueba_inventory_export
  WHERE business_id = '<business_id>'
    AND COALESCE("Exist", 0) > 0
),
prices AS (
  SELECT DISTINCT
    NULLIF(REGEXP_REPLACE(UPPER(BTRIM("ADJSTCLAIM")), '[^A-Z0-9]+', '', 'g'), '') AS sku
  FROM data_bridge.prueba_mex_insurance_prices_export
  WHERE business_id = '<business_id>'
    AND COALESCE("CLAIM", 0) > 0
),
matched AS (
  SELECT inv.sku
  FROM inv
  INNER JOIN prices USING (sku)
  WHERE inv.sku IS NOT NULL
)
SELECT
  (SELECT COUNT(*) FROM matched) AS expected_merge_rows,
  (
    SELECT COUNT(*)
    FROM data_bridge.prueba_inventory_prices_merged_export
    WHERE business_id = '<business_id>'
  ) AS actual_merged_rows;
```

Merged rows matched to satellite rows:

```sql
SELECT
  m.sku AS merged_sku,
  s.product AS satellite_product,
  m.descripcion AS merged_descripcion,
  s.descripcion AS satellite_descripcion,
  m.price AS merged_price,
  s.price AS satellite_price,
  m.existencias AS merged_inventory,
  s.inventario AS satellite_inventory
FROM data_bridge.prueba_inventory_prices_merged_export m
JOIN data_bridge.integration_alden_satelite s
  ON NULLIF(REGEXP_REPLACE(UPPER(BTRIM(s.product)), '[^A-Z0-9]+', '', 'g'), '')
   = NULLIF(REGEXP_REPLACE(UPPER(BTRIM(m.sku)), '[^A-Z0-9]+', '', 'g'), '')
WHERE m.business_id = '<business_id>'
ORDER BY m.sku
LIMIT 100;
```

Duplicate normalized satellite products:

```sql
SELECT
  NULLIF(REGEXP_REPLACE(UPPER(BTRIM(product)), '[^A-Z0-9]+', '', 'g'), '') AS normalized_product,
  COUNT(*) AS rows
FROM data_bridge.integration_alden_satelite
GROUP BY 1
HAVING COUNT(*) > 1
ORDER BY rows DESC, normalized_product;
```

Satellite rows whose inventory differs from merge:

```sql
SELECT
  m.sku,
  s.product,
  m.existencias,
  s.inventario
FROM data_bridge.prueba_inventory_prices_merged_export m
JOIN data_bridge.integration_alden_satelite s
  ON NULLIF(REGEXP_REPLACE(UPPER(BTRIM(s.product)), '[^A-Z0-9]+', '', 'g'), '')
   = NULLIF(REGEXP_REPLACE(UPPER(BTRIM(m.sku)), '[^A-Z0-9]+', '', 'g'), '')
WHERE m.business_id = '<business_id>'
  AND COALESCE(s.inventario, -1) <> GREATEST(0, ROUND(m.existencias)::int)
ORDER BY m.sku
LIMIT 100;
```

## Implementation Checklist

1. Run `database/agora/migration_data_bridge_prueba_export_tables.sql` in the target database.
2. Confirm `data_bridge.integration_alden_satelite` exists.
3. Add the upload and merge DTOs.
4. Add the upload endpoint.
5. Add the merge endpoint.
6. Add the publish endpoint.
7. Add frontend API client functions for upload, merge, and publish.
8. Add the web upload panel with inventory upload, prices upload, merge, and publish actions.
9. Build backend and frontend.
10. Upload inventory with replace enabled.
11. Upload prices with replace enabled.
12. Run merge.
13. Run publish.
14. Validate with the SQL queries above.
