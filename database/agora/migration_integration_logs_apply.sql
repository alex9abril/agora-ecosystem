-- ============================================================================
-- AGORA ECOSYSTEM - Migración: Logs de Integraciones (Aplicar Cambios)
-- ============================================================================
-- Descripción: Aplica únicamente los cambios necesarios para habilitar
-- la tabla de logs de integraciones en una base ya existente.
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

CREATE TABLE IF NOT EXISTS communication.integration_logs (
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

CREATE INDEX IF NOT EXISTS idx_integration_logs_business_id ON communication.integration_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_integration_logs_user_id ON communication.integration_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_logs_order_id ON communication.integration_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_integration_logs_integration ON communication.integration_logs(integration);
CREATE INDEX IF NOT EXISTS idx_integration_logs_status ON communication.integration_logs(status);
CREATE INDEX IF NOT EXISTS idx_integration_logs_created_at ON communication.integration_logs(created_at DESC);

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
-- 1. Ejecuta solo este script si tu base ya existe.
-- 2. El campo status debe usar: success, failed o skipped.
-- ============================================================================
