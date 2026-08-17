-- ============================================================================
-- SEED: Catálogo de conectores + workflow de ejemplo (integration)
-- ============================================================================
-- Prerequisito: migration_integration_workflows.sql aplicada.
--               Debe existir al menos un registro en core.businesses; si no
--               existe el UUID de prueba, se omite inserción con DO $$.
-- Referencia: seed_test_products_pescaditos.sql usa
--   f1bacb26-be0b-4de6-b02f-b54527212d99 en algunos entornos.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-04-22
-- ============================================================================

SET search_path TO integration, core, public;

-- Catálogo de tipos (idempotente)
-- Uso de dollar-quoting en metadata para evitar que apostrofes o guiones raros rompan el literal.
-- No meter punto y coma dentro de cadenas que algunos clientes SQL cortan mal por ';'.
INSERT INTO integration.connector_types (id, label, implementation_status, sort_order, metadata)
VALUES
  (
    'mssql',
    'Microsoft SQL Server',
    'active',
    1,
    $${"icon":"database","doc":"Lectura vía mssql (solo red autorizada / IP permitida)."}$$::jsonb
  ),
  (
    'http_rest',
    'HTTP / REST',
    'active',
    2,
    $${"icon":"globe","doc":"Llamadas HTTP con URL base, header de API key y ruta de health check."}$$::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  implementation_status = EXCLUDED.implementation_status,
  sort_order = EXCLUDED.sort_order,
  metadata = EXCLUDED.metadata,
  updated_at = CURRENT_TIMESTAMP;

-- Conector y workflow de demo por negocio existente (host ficticio, sin credencial real)
DO $seed$
DECLARE
  v_business_id UUID;
  v_connector_id UUID;
  v_workflow_id UUID;
BEGIN
  -- Preferir negocio de prueba frecuente; si no existe, cualquier business activo
  SELECT b.id INTO v_business_id
  FROM core.businesses b
  WHERE b.id = 'f1bacb26-be0b-4de6-b02f-b54527212d99'::uuid
  LIMIT 1;

  IF v_business_id IS NULL THEN
    SELECT b.id INTO v_business_id
    FROM core.businesses b
    WHERE COALESCE(b.is_active, true) = true
    ORDER BY b.created_at NULLS LAST
    LIMIT 1;
  END IF;

  IF v_business_id IS NULL THEN
    RAISE NOTICE 'seed_integration_workflows_demo: no hay filas en core.businesses, omitiendo conector y workflow de ejemplo';
  ELSE
  SELECT c.id INTO v_connector_id
  FROM integration.connectors c
  WHERE c.business_id = v_business_id AND c.name = 'DMS SQL (demo)' AND c.connector_type_id = 'mssql'
  LIMIT 1;

  IF v_connector_id IS NULL THEN
    v_connector_id := gen_random_uuid();
    INSERT INTO integration.connectors (
      id, business_id, connector_type_id, name, is_enabled, config, password_ciphertext
    ) VALUES (
      v_connector_id,
      v_business_id,
      'mssql',
      'DMS SQL (demo)',
      false,
      jsonb_build_object(
        'server', 'demo-mssql.internal.example.com',
        'port', 1433,
        'database', 'DMS_Catalog',
        'user', 'agora_readonly',
        'options', jsonb_build_object('encrypt', true)
      ),
      NULL
    );
  END IF;

  SELECT w.id INTO v_workflow_id
  FROM integration.workflows w
  WHERE w.business_id = v_business_id AND w.name = 'Sincronización demo (lectura catálogo)'
  LIMIT 1;

  IF v_workflow_id IS NULL THEN
    v_workflow_id := gen_random_uuid();
    -- Sin punto y coma al final: algunos clientes parten el script en ';' dentro de literales
    INSERT INTO integration.workflows (id, business_id, name, description, is_enabled, definition, version)
    VALUES (
      v_workflow_id,
      v_business_id,
      'Sincronización demo (lectura catálogo)',
      'Flujo de ejemplo: disparo manual → consulta SQL de solo lectura → registro de salida. Activar conector y workflow para probar en entorno con MSSQL real.',
      false,
      jsonb_build_object(
        'nodes', jsonb_build_array(
          jsonb_build_object(
            'id', 'node-trigger-1',
            'type', 'triggerManual',
            'position', jsonb_build_object('x', 80, 'y', 120),
            'data', jsonb_build_object('label', 'Inicio (manual)')
          ),
          jsonb_build_object(
            'id', 'node-mssql-1',
            'type', 'connectorMssql',
            'position', jsonb_build_object('x', 380, 'y', 120),
            'data', jsonb_build_object(
              'label', 'Listar productos (TOP 10)',
              'connectorId', v_connector_id::text,
              'query', 'SELECT TOP 10 * FROM sys.tables'
            )
          ),
          jsonb_build_object(
            'id', 'node-sink-1',
            'type', 'sinkLog',
            'position', jsonb_build_object('x', 680, 'y', 120),
            'data', jsonb_build_object('label', 'Resultado (log interno)')
          )
        ),
        'edges', jsonb_build_array(
          jsonb_build_object('id', 'e1', 'source', 'node-trigger-1', 'target', 'node-mssql-1', 'type', 'smoothstep'),
          jsonb_build_object('id', 'e2', 'source', 'node-mssql-1', 'target', 'node-sink-1', 'type', 'smoothstep')
        ),
        'viewport', jsonb_build_object('x', 0, 'y', 0, 'zoom', 1)
      ),
      1
    );
  END IF;
  END IF;
END $seed$ LANGUAGE plpgsql;
