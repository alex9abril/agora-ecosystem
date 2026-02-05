-- ============================================================================
-- AGORA ECOSYSTEM - Migración: Configuración de Notificaciones por Sucursal
-- ============================================================================
-- Descripción: Crea la entidad para definir, por sucursal, qué tipos de
-- notificación están habilitados y por qué canales (email/WhatsApp).
-- Esta base servirá para futuras extensiones del sistema de notificaciones.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-02-03
-- Hora: 13:15:29
-- ============================================================================

-- Configuración inicial
SET search_path TO core, communication, public;

-- ============================================================================
-- 1. TABLA: Configuración de notificaciones por sucursal
-- ============================================================================

CREATE TABLE IF NOT EXISTS communication.branch_notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,

    -- Tipo de notificación
    notification_type notification_type NOT NULL,

    -- Canales habilitados
    email_enabled BOOLEAN DEFAULT FALSE,
    whatsapp_enabled BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Unicidad: una configuración por tipo y sucursal
    UNIQUE (business_id, notification_type)
);

COMMENT ON TABLE communication.branch_notification_settings IS 'Configuración de notificaciones por sucursal y tipo, con canales habilitados.';
COMMENT ON COLUMN communication.branch_notification_settings.business_id IS 'Sucursal (core.businesses) a la que aplica la configuración.';
COMMENT ON COLUMN communication.branch_notification_settings.notification_type IS 'Tipo de notificación (ENUM notification_type).';
COMMENT ON COLUMN communication.branch_notification_settings.email_enabled IS 'Indica si se envía notificación por email.';
COMMENT ON COLUMN communication.branch_notification_settings.whatsapp_enabled IS 'Indica si se envía notificación por WhatsApp.';

CREATE INDEX IF NOT EXISTS idx_branch_notification_settings_business_id
    ON communication.branch_notification_settings(business_id);
CREATE INDEX IF NOT EXISTS idx_branch_notification_settings_notification_type
    ON communication.branch_notification_settings(notification_type);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_branch_notification_settings_updated_at
    ON communication.branch_notification_settings;
CREATE TRIGGER update_branch_notification_settings_updated_at
    BEFORE UPDATE ON communication.branch_notification_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICACIONES
-- ============================================================================

-- Verificar tabla
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'communication'
  AND table_name = 'branch_notification_settings';

-- Verificar índices
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'communication'
  AND tablename = 'branch_notification_settings';

-- Verificar trigger
SELECT tgname
FROM pg_trigger
WHERE tgrelid = 'communication.branch_notification_settings'::regclass;

-- ============================================================================
-- NOTAS:
-- ============================================================================
-- 1. La configuración es por sucursal (core.businesses) y tipo de notificación.
-- 2. Para deshabilitar una notificación, deja ambos canales en FALSE.
-- 3. Los tipos de notificación provienen del ENUM notification_type.
-- ============================================================================
