-- ============================================================================
-- [AGORA] - Migration: automation — tablas base para nodo workflow sinkAutomation
-- ============================================================================
-- Tabla de ingesta por filas (mapeo desde flujos). Las vistas automation.v_*
-- no son insertables; esta es BASE TABLE para INSERT desde integration-workflows.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS automation;

COMMENT ON SCHEMA automation IS 'Objetos para integraciones automatizadas (vistas de lectura y tablas de ingesta).';

CREATE TABLE IF NOT EXISTS automation.workflow_ingested_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  product_code TEXT,
  quantity NUMERIC(18, 4),
  row_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  workflow_id UUID REFERENCES integration.workflows(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE automation.workflow_ingested_rows IS
  'Filas insertadas por el nodo sinkAutomation (workflows); business_id y workflow_id rellenados por el servidor.';

CREATE INDEX IF NOT EXISTS idx_workflow_ingested_rows_business_created
  ON automation.workflow_ingested_rows (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_ingested_rows_workflow
  ON automation.workflow_ingested_rows (workflow_id)
  WHERE workflow_id IS NOT NULL;
