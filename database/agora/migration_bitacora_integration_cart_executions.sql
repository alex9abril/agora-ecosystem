-- ============================================================================
-- AGORA ECOSYSTEM - Schema bitacora + ejecuciones carrito de integración
-- ============================================================================
-- Descripción: Schema dedicado a bitácoras. Primera tabla: cada llamada HTTP
--              a /integrations/cart (parámetros recibidos, metadatos de red,
--              duración, resultado resumido).
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-04-27
-- ============================================================================

SET search_path TO public;

CREATE SCHEMA IF NOT EXISTS bitacora;

COMMENT ON SCHEMA bitacora IS 'Bitácoras y auditoría de ejecuciones (APIs de integración, webhooks, etc.).';

CREATE TABLE bitacora.integration_cart_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    http_method TEXT NOT NULL,
    path TEXT NOT NULL,
    route_path TEXT,

    path_params JSONB,
    query_params JSONB,
    body_params JSONB,

    status_code INT,
    success BOOLEAN NOT NULL DEFAULT true,
    duration_ms INT,

    error_name TEXT,
    error_message TEXT,

    cart_id UUID,
    store_id UUID,

    response_summary JSONB,
    metadata JSONB
);

COMMENT ON TABLE bitacora.integration_cart_executions IS
    'Una fila por petición al carrito de integración (/integrations/cart): entrada, metadatos HTTP y resultado resumido.';
COMMENT ON COLUMN bitacora.integration_cart_executions.route_path IS
    'Patrón de ruta registrado por Nest/Express cuando está disponible.';
COMMENT ON COLUMN bitacora.integration_cart_executions.body_params IS
    'Cuerpo JSON ya saneado en aplicación (sin secretos; teléfonos/token enmascarados).';
COMMENT ON COLUMN bitacora.integration_cart_executions.response_summary IS
    'Resumen del cuerpo de respuesta (sin listados completos de ítems).';
COMMENT ON COLUMN bitacora.integration_cart_executions.metadata IS
    'IP, user-agent, forwarded-for, host, indicadores de autenticación webhook, etc.';

CREATE INDEX idx_bitacora_ice_created_at ON bitacora.integration_cart_executions (created_at DESC);
CREATE INDEX idx_bitacora_ice_cart_id ON bitacora.integration_cart_executions (cart_id) WHERE cart_id IS NOT NULL;
CREATE INDEX idx_bitacora_ice_store_id ON bitacora.integration_cart_executions (store_id) WHERE store_id IS NOT NULL;
CREATE INDEX idx_bitacora_ice_success ON bitacora.integration_cart_executions (success);

GRANT USAGE ON SCHEMA bitacora TO service_role;
GRANT SELECT, INSERT ON bitacora.integration_cart_executions TO service_role;
