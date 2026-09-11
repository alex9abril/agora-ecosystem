-- ============================================================================
-- [AGORA] - Migration: data_bridge prueba export staging tables
-- ============================================================================
-- Destructive reset for the prueba import/merge tables.
--
-- Source layouts:
-- 1) INVENTARIO ACC 26.xls
--    "No. Parte", "Descripción", "Ubica", "Exist"
-- 2) Data for Mex Insurance Companies - Sep 2026.txt
--    "ADJSTCLAIM", "ADJSTMNT", "WARR.", "CLAIM"
--
-- Merge rule:
-- - match only by normalized_sku
-- - skip non-matching rows
-- - skip rows where exist <= 0
-- - skip rows where claim <= 0
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS data_bridge;

DROP TABLE IF EXISTS data_bridge.prueba_inventory_prices_merged_export;
DROP TABLE IF EXISTS data_bridge.prueba_mex_insurance_prices_export;
DROP TABLE IF EXISTS data_bridge.prueba_inventory_export;

CREATE TABLE data_bridge.prueba_inventory_export (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  "No. Parte" TEXT,
  "Descripción" TEXT,
  "Ubica" TEXT,
  "Exist" NUMERIC(18, 4),
  source_file_name TEXT NOT NULL,
  source_row_number INTEGER NOT NULL,
  import_batch_id UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE data_bridge.prueba_inventory_export IS
  'Prueba para INVENTARIO ACC 26.xls con columnas originales del export.';

CREATE INDEX idx_prueba_inventory_export_business_no_parte
  ON data_bridge.prueba_inventory_export (business_id, "No. Parte");

CREATE INDEX idx_prueba_inventory_export_business_normalized_sku
  ON data_bridge.prueba_inventory_export (
    business_id,
    (NULLIF(REGEXP_REPLACE(UPPER(BTRIM("No. Parte")), '[^A-Z0-9]+', '', 'g'), ''))
  );

CREATE INDEX idx_prueba_inventory_export_batch
  ON data_bridge.prueba_inventory_export (import_batch_id, source_row_number);

CREATE TABLE data_bridge.prueba_mex_insurance_prices_export (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  "ADJSTCLAIM" TEXT,
  "ADJSTMNT" TEXT,
  "WARR." TEXT,
  "CLAIM" NUMERIC(18, 2),
  source_file_name TEXT NOT NULL,
  source_row_number INTEGER NOT NULL,
  import_batch_id UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE data_bridge.prueba_mex_insurance_prices_export IS
  'Prueba para Data for Mex Insurance Companies con columnas originales del export.';

CREATE INDEX idx_prueba_mex_insurance_prices_business_adjstclaim
  ON data_bridge.prueba_mex_insurance_prices_export (business_id, "ADJSTCLAIM");

CREATE INDEX idx_prueba_mex_insurance_prices_business_normalized_sku
  ON data_bridge.prueba_mex_insurance_prices_export (
    business_id,
    (NULLIF(REGEXP_REPLACE(UPPER(BTRIM("ADJSTCLAIM")), '[^A-Z0-9]+', '', 'g'), ''))
  );

CREATE INDEX idx_prueba_mex_insurance_prices_batch
  ON data_bridge.prueba_mex_insurance_prices_export (import_batch_id, source_row_number);

CREATE TABLE data_bridge.prueba_inventory_prices_merged_export (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  descripcion TEXT,
  ubicacion TEXT,
  existencias NUMERIC(18, 4) NOT NULL,
  nombres TEXT,
  price NUMERIC(18, 2) NOT NULL,
  merge_batch_id UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE data_bridge.prueba_inventory_prices_merged_export IS
  'Prueba fusionada por SKU normalizado; solo filas con exist > 0 y claim > 0.';

CREATE UNIQUE INDEX uq_prueba_inventory_prices_merged_business_sku
  ON data_bridge.prueba_inventory_prices_merged_export (business_id, sku);

CREATE INDEX idx_prueba_inventory_prices_merged_batch
  ON data_bridge.prueba_inventory_prices_merged_export (merge_batch_id, sku);

GRANT SELECT, INSERT, UPDATE, DELETE ON data_bridge.prueba_inventory_export TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON data_bridge.prueba_mex_insurance_prices_export TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON data_bridge.prueba_inventory_prices_merged_export TO authenticated, service_role;
