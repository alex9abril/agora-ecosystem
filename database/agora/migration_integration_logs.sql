-- ============================================================================
-- AGORA ECOSYSTEM - Migración: Logs de Integraciones
-- ============================================================================
-- Descripción: Crea la entidad para registrar eventos de integraciones
-- (Karbot, Skydropx, Karlopay, correo, etc.), con estado, payloads
-- y contexto (sucursal/usuario/pedido) para auditoría y soporte.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-02-03
-- Hora: 15:45:35
-- ============================================================================

-- Configuración inicial
SET search_path TO public, core, orders, communication;

-- ============================================================================
-- 1. TABLA: Logs de Integraciones
-- ============================================================================

CREATE TABLE communication.integration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Contexto
    business_id UUID REFERENCES core.businesses(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    order_id UUID REFERENCES orders.orders(id) ON DELETE SET NULL,

    -- Clasificación
    integration VARCHAR(50) NOT NULL, -- ej: 'karbot', 'skydropx', 'karlopay', 'email'
    event_type VARCHAR(100) NOT NULL, -- ej: 'order_confirmation', 'order_status_change'
    channel VARCHAR(30), -- ej: 'email', 'whatsapp', 'api'
    status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'skipped'

    -- Detalles
    message TEXT,
    error_message TEXT,
    request_payload JSONB,
    response_payload JSONB,
    metadata JSONB,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE communication.integration_logs IS 'Registro de eventos de integraciones (auditoría/soporte).';
COMMENT ON COLUMN communication.integration_logs.integration IS 'Nombre de la integración (karbot, skydropx, karlopay, email).';
COMMENT ON COLUMN communication.integration_logs.event_type IS 'Tipo de evento asociado a la integración.';
COMMENT ON COLUMN communication.integration_logs.channel IS 'Canal usado por la integración (email, whatsapp, api, etc.).';
COMMENT ON COLUMN communication.integration_logs.status IS 'Estado del evento: success, failed o skipped.';

CREATE INDEX idx_integration_logs_business_id ON communication.integration_logs(business_id);
CREATE INDEX idx_integration_logs_user_id ON communication.integration_logs(user_id);
CREATE INDEX idx_integration_logs_order_id ON communication.integration_logs(order_id);
CREATE INDEX idx_integration_logs_integration ON communication.integration_logs(integration);
CREATE INDEX idx_integration_logs_status ON communication.integration_logs(status);
CREATE INDEX idx_integration_logs_created_at ON communication.integration_logs(created_at DESC);

-- ============================================================================
-- VERIFICACIONES
-- ============================================================================

SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'communication'
  AND table_name = 'integration_logs';

SELECT indexname
FROM pg_indexes
WHERE schemaname = 'communication'
  AND tablename = 'integration_logs';

-- ============================================================================
-- NOTAS:
-- ============================================================================
-- 1. El campo status debe usar: success, failed o skipped.
-- 2. request_payload/response_payload deben limitarse a datos útiles.
-- 3. Útil para soporte cuando una notificación no llega.
-- ============================================================================
