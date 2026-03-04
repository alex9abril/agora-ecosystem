-- ============================================================================
-- AGORA ECOSYSTEM - Migración: Configuración de Notificaciones por Grupo
-- ============================================================================
-- Descripción: Crea la entidad para definir, por grupo empresarial, qué tipos
--              de notificación están habilitados y por qué canales (email/WhatsApp).
--              Espejo de branch_notification_settings a nivel de grupo.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-02-24
-- Hora: 12:00:00
-- ============================================================================

-- Configuración inicial
SET search_path TO core, communication, public;

-- ============================================================================
-- 1. TABLA: Configuración de notificaciones por grupo empresarial
-- ============================================================================

CREATE TABLE IF NOT EXISTS communication.business_group_notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_group_id UUID NOT NULL REFERENCES core.business_groups(id) ON DELETE CASCADE,

    -- Tipo de notificación (mismo ENUM que branch)
    notification_type notification_type NOT NULL,

    -- Canales habilitados
    email_enabled BOOLEAN DEFAULT FALSE,
    whatsapp_enabled BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Unicidad: una configuración por tipo y grupo
    UNIQUE (business_group_id, notification_type)
);

COMMENT ON TABLE communication.business_group_notification_settings IS 'Configuración de notificaciones por grupo empresarial y tipo, con canales habilitados.';
COMMENT ON COLUMN communication.business_group_notification_settings.business_group_id IS 'Grupo empresarial (core.business_groups) al que aplica la configuración.';
COMMENT ON COLUMN communication.business_group_notification_settings.notification_type IS 'Tipo de notificación (ENUM notification_type).';
COMMENT ON COLUMN communication.business_group_notification_settings.email_enabled IS 'Indica si se envía notificación por email.';
COMMENT ON COLUMN communication.business_group_notification_settings.whatsapp_enabled IS 'Indica si se envía notificación por WhatsApp.';

CREATE INDEX IF NOT EXISTS idx_business_group_notification_settings_business_group_id
    ON communication.business_group_notification_settings(business_group_id);
CREATE INDEX IF NOT EXISTS idx_business_group_notification_settings_notification_type
    ON communication.business_group_notification_settings(notification_type);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_business_group_notification_settings_updated_at
    ON communication.business_group_notification_settings;
CREATE TRIGGER update_business_group_notification_settings_updated_at
    BEFORE UPDATE ON communication.business_group_notification_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICACIONES
-- ============================================================================

-- Verificar tabla
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'communication'
  AND table_name = 'business_group_notification_settings';

-- Verificar índices
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'communication'
  AND tablename = 'business_group_notification_settings';

-- Verificar trigger
SELECT tgname
FROM pg_trigger
WHERE tgrelid = 'communication.business_group_notification_settings'::regclass;

-- ============================================================================
-- NOTAS:
-- ============================================================================
-- 1. La configuración es por grupo (core.business_groups) y tipo de notificación.
-- 2. Para deshabilitar una notificación, deja ambos canales en FALSE.
-- 3. Los tipos de notificación son los mismos que en branch_notification_settings.
-- 4. Ejecutar este script después de migration_branch_notification_settings y
--    migration_business_groups (el ENUM notification_type y core.business_groups deben existir).
-- ============================================================================
