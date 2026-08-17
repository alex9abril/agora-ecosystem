-- ============================================================================
-- AGORA ECOSYSTEM - Create: data_bridge.integration_dalton_demo
-- ============================================================================
-- Descripción:
--   Crea la tabla de ingesta para la integración Dalton (ambiente demo / fase 1).
--   Sigue el estándar de data_bridge.integration_alden_*: una fila por artículo,
--   columnas con los nombres del endpoint (sin renombrar), más columnas de control
--   (id, fecha_importacion).
--   Fuente esperada: GET /catalogo o GET /inventario (payload items[]).
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-08-14
-- Hora: 18:57:10
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS data_bridge;

COMMENT ON SCHEMA data_bridge IS
  'Tablas de ingesta para integraciones y workflows (puente hacia Agora).';

CREATE TABLE IF NOT EXISTS data_bridge.integration_dalton_demo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Campos del endpoint (sin modificación de nombres)
  sku VARCHAR(255),
  nombre TEXT,
  tipo VARCHAR(255),
  categoria VARCHAR(255),
  marca_producto VARCHAR(255),
  precio NUMERIC(18, 4),
  moneda VARCHAR(16),
  stock INTEGER DEFAULT 0,
  disponible BOOLEAN,
  descripcion TEXT,
  -- Control de ingesta (mismo patrón que integration_alden_*)
  fecha_importacion TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE data_bridge.integration_dalton_demo IS
  'Ingesta cruda Dalton demo (refacciones). Columnas = campos del API /catalogo|/inventario + fecha_importacion.';

COMMENT ON COLUMN data_bridge.integration_dalton_demo.sku IS 'Código de artículo (endpoint.sku)';
COMMENT ON COLUMN data_bridge.integration_dalton_demo.nombre IS 'Nombre del artículo (endpoint.nombre)';
COMMENT ON COLUMN data_bridge.integration_dalton_demo.tipo IS 'Tipo de producto, ej. refaccion (endpoint.tipo)';
COMMENT ON COLUMN data_bridge.integration_dalton_demo.categoria IS 'Categoría, ej. REF > RME (endpoint.categoria)';
COMMENT ON COLUMN data_bridge.integration_dalton_demo.marca_producto IS 'Marca (endpoint.marca_producto)';
COMMENT ON COLUMN data_bridge.integration_dalton_demo.precio IS 'Precio lista (endpoint.precio); validar IVA con Dalton';
COMMENT ON COLUMN data_bridge.integration_dalton_demo.moneda IS 'Moneda, ej. MXN (endpoint.moneda)';
COMMENT ON COLUMN data_bridge.integration_dalton_demo.stock IS 'Existencia (endpoint.stock)';
COMMENT ON COLUMN data_bridge.integration_dalton_demo.disponible IS 'Disponibilidad (endpoint.disponible)';
COMMENT ON COLUMN data_bridge.integration_dalton_demo.descripcion IS 'Descripción (endpoint.descripcion)';
COMMENT ON COLUMN data_bridge.integration_dalton_demo.fecha_importacion IS 'Fecha/hora de descarga hacia data_bridge';

CREATE INDEX IF NOT EXISTS idx_integration_dalton_demo_sku
  ON data_bridge.integration_dalton_demo (sku);

CREATE INDEX IF NOT EXISTS idx_integration_dalton_demo_fecha_importacion
  ON data_bridge.integration_dalton_demo (fecha_importacion DESC);

-- ============================================================================
-- Verificación
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'data_bridge'
      AND table_name = 'integration_dalton_demo'
  ) THEN
    RAISE EXCEPTION 'Tabla data_bridge.integration_dalton_demo no fue creada';
  END IF;
  RAISE NOTICE 'OK: data_bridge.integration_dalton_demo lista';
END $$;

-- ============================================================================
-- NOTAS
-- ============================================================================
-- - Estándar de nombre: integration_<partner>_<ambiente> (ej. integration_alden_demo).
-- - No transforma datos: columnas = claves del JSON de cada item.
-- - Para producción, crear integration_dalton_<ambiente> (ej. satelite) con la misma forma.
-- - IVA de precio aún pendiente de confirmación por correo (Jorge / Dalton).
-- ============================================================================
