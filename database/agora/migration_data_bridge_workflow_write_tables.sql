-- ============================================================================
-- [AGORA] - Migration: data_bridge — tablas base para nodo workflow sinkAutomation
-- ============================================================================
-- Tabla de ingesta por filas (mapeo desde flujos). El esquema de vistas de catálogo
-- sigue siendo `automation`; la ingesta desde workflows vive en `data_bridge`.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS data_bridge;

COMMENT ON SCHEMA data_bridge IS 'Tablas de ingesta para integraciones y workflows (puente hacia Agora).';

CREATE TABLE IF NOT EXISTS data_bridge.workflow_ingested_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  product_code TEXT,
  quantity NUMERIC(18, 4),
  row_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  workflow_id UUID REFERENCES integration.workflows(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE data_bridge.workflow_ingested_rows IS
  'Filas insertadas por el nodo sinkAutomation (workflows); business_id y workflow_id rellenados por el servidor.';

CREATE INDEX IF NOT EXISTS idx_workflow_ingested_rows_business_created
  ON data_bridge.workflow_ingested_rows (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_ingested_rows_workflow
  ON data_bridge.workflow_ingested_rows (workflow_id)
  WHERE workflow_id IS NOT NULL;
