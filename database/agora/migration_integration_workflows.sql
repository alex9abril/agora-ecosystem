-- ============================================================================
-- [AGORA] - Migration: integration — workflows, conectores y ejecuciones
-- ============================================================================
-- Descripción: Esquema integration para flujos tipo n8n (motor propio),
--              conectores por sucursal (core.businesses), catálogo de tipos
--              extensible (MSSQL primero; http_rest reservado).
--              RLS para acceso authenticated por membresía en core.business_users.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-04-22
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS integration;

COMMENT ON SCHEMA integration IS 'Automatización e integraciones por sucursal (workflows internos, conectores DMS/API).';

-- ----------------------------------------------------------------------------
-- Catálogo de tipos de conector (extensible)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS integration.connector_types (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  implementation_status TEXT NOT NULL DEFAULT 'planned' CHECK (implementation_status IN ('active', 'planned', 'deprecated')),
  metadata JSONB DEFAULT '{}'::jsonb,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE integration.connector_types IS 'Tipos de conector reutilizables (mssql, http_rest, ...).';
COMMENT ON COLUMN integration.connector_types.implementation_status IS 'active = ejecutable en backend; planned = reservado para UI futura.';

CREATE INDEX IF NOT EXISTS idx_connector_types_sort ON integration.connector_types(sort_order);

DROP TRIGGER IF EXISTS update_connector_types_updated_at ON integration.connector_types;
CREATE TRIGGER update_connector_types_updated_at
  BEFORE UPDATE ON integration.connector_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Conectores por sucursal (credenciales sensibles en password_ciphertext)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS integration.connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  connector_type_id TEXT NOT NULL REFERENCES integration.connector_types(id),
  name TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  password_ciphertext TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE integration.connectors IS 'Instancia de conector por sucursal; config = host/puerto/db/usuario; password almacenado cifrado por el backend.';
COMMENT ON COLUMN integration.connectors.password_ciphertext IS 'Secreto cifrado (AES-GCM) por WORKFLOW_CONNECTOR_ENCRYPTION_KEY; nunca exponer al cliente.';

CREATE INDEX IF NOT EXISTS idx_connectors_business ON integration.connectors(business_id);
CREATE INDEX IF NOT EXISTS idx_connectors_business_enabled ON integration.connectors(business_id, is_enabled);
CREATE INDEX IF NOT EXISTS idx_connectors_type ON integration.connectors(connector_type_id);

DROP TRIGGER IF EXISTS update_connectors_updated_at ON integration.connectors;
CREATE TRIGGER update_connectors_updated_at
  BEFORE UPDATE ON integration.connectors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Definiciones de workflow (grafo JSON estilo React Flow / @xyflow/react)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS integration.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  definition JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE integration.workflows IS 'Flujo con nodes/edges/viewport; disparo manual o programado interno (sin webhooks externos en v1).';
COMMENT ON COLUMN integration.workflows.definition IS 'JSON compatible con React Flow: nodes, edges, viewport.';

CREATE INDEX IF NOT EXISTS idx_workflows_business ON integration.workflows(business_id);
CREATE INDEX IF NOT EXISTS idx_workflows_business_enabled ON integration.workflows(business_id, is_enabled);

DROP TRIGGER IF EXISTS update_workflows_updated_at ON integration.workflows;
CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON integration.workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Runs (auditoría)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS integration.workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES integration.workflows(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed', 'cancelled')),
  trigger_type TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'schedule')),
  started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMPTZ,
  error TEXT,
  log_summary JSONB DEFAULT '{}'::jsonb
);

COMMENT ON TABLE integration.workflow_runs IS 'Historial de ejecuciones por workflow.';

CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow ON integration.workflow_runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON integration.workflow_runs(status);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_started ON integration.workflow_runs(started_at DESC);

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
ALTER TABLE integration.connector_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration.connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration.workflow_runs ENABLE ROW LEVEL SECURITY;

-- Catálogo: lectura para cualquier authenticated
DROP POLICY IF EXISTS connector_types_select ON integration.connector_types;
CREATE POLICY connector_types_select ON integration.connector_types
  FOR SELECT USING (true);

-- business_users: membresía activa
DROP POLICY IF EXISTS connectors_select ON integration.connectors;
CREATE POLICY connectors_select ON integration.connectors
  FOR SELECT USING (
    business_id IN (
      SELECT bu.business_id FROM core.business_users bu
      WHERE bu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS connectors_insert ON integration.connectors;
CREATE POLICY connectors_insert ON integration.connectors
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT bu.business_id FROM core.business_users bu
      WHERE bu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS connectors_update ON integration.connectors;
CREATE POLICY connectors_update ON integration.connectors
  FOR UPDATE USING (
    business_id IN (
      SELECT bu.business_id FROM core.business_users bu
      WHERE bu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS connectors_delete ON integration.connectors;
CREATE POLICY connectors_delete ON integration.connectors
  FOR DELETE USING (
    business_id IN (
      SELECT bu.business_id FROM core.business_users bu
      WHERE bu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS workflows_select ON integration.workflows;
CREATE POLICY workflows_select ON integration.workflows
  FOR SELECT USING (
    business_id IN (
      SELECT bu.business_id FROM core.business_users bu
      WHERE bu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS workflows_insert ON integration.workflows;
CREATE POLICY workflows_insert ON integration.workflows
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT bu.business_id FROM core.business_users bu
      WHERE bu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS workflows_update ON integration.workflows;
CREATE POLICY workflows_update ON integration.workflows
  FOR UPDATE USING (
    business_id IN (
      SELECT bu.business_id FROM core.business_users bu
      WHERE bu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS workflows_delete ON integration.workflows;
CREATE POLICY workflows_delete ON integration.workflows
  FOR DELETE USING (
    business_id IN (
      SELECT bu.business_id FROM core.business_users bu
      WHERE bu.user_id = auth.uid()
    )
  );

-- Runs: acceso vía workflow perteneciente a la sucursal del usuario
DROP POLICY IF EXISTS workflow_runs_select ON integration.workflow_runs;
CREATE POLICY workflow_runs_select ON integration.workflow_runs
  FOR SELECT USING (
    workflow_id IN (
      SELECT w.id FROM integration.workflows w
      INNER JOIN core.business_users bu ON bu.business_id = w.business_id
      WHERE bu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS workflow_runs_insert ON integration.workflow_runs;
CREATE POLICY workflow_runs_insert ON integration.workflow_runs
  FOR INSERT WITH CHECK (
    workflow_id IN (
      SELECT w.id FROM integration.workflows w
      INNER JOIN core.business_users bu ON bu.business_id = w.business_id
      WHERE bu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS workflow_runs_update ON integration.workflow_runs;
CREATE POLICY workflow_runs_update ON integration.workflow_runs
  FOR UPDATE USING (
    workflow_id IN (
      SELECT w.id FROM integration.workflows w
      INNER JOIN core.business_users bu ON bu.business_id = w.business_id
      WHERE bu.user_id = auth.uid()
    )
  );

-- Grants (PostgREST / cliente directo; el backend vía service_role o pool suele bypassear RLS)
GRANT USAGE ON SCHEMA integration TO authenticated, service_role;
GRANT SELECT ON integration.connector_types TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON integration.connectors TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON integration.workflows TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON integration.workflow_runs TO authenticated, service_role;

-- service_role: backend Nest con clave (bypass RLS)
GRANT ALL ON ALL TABLES IN SCHEMA integration TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA integration TO service_role;

-- ============================================================================
-- NOTAS
-- ============================================================================
-- - Exponer el schema "integration" en API Settings de Supabase si se usa
--   PostgREST directo desde el front (recomendado: usar solo API Nest + pool).
-- - Contraseñas: cifrar en backend; nunca devolver en GET.
-- - Webhooks de entrada/salida a terceros: fuera de alcance de esta migración.
-- ============================================================================
