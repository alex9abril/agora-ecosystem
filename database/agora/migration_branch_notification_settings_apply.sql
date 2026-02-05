-- ============================================================================
-- AGORA ECOSYSTEM - Migración: Notificaciones por Sucursal (Aplicar Cambios)
-- ============================================================================
-- Descripción: Aplica únicamente los cambios necesarios para habilitar la
-- configuración de notificaciones por sucursal, incluyendo la extensión
-- del ENUM notification_type y la tabla de configuración con índices/trigger.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-02-03
-- Hora: 13:34:29
-- ============================================================================

-- Configuración inicial
SET search_path TO public, core, communication;

-- ============================================================================
-- 1. Extender ENUM notification_type (solo si falta)
-- ============================================================================

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'user_registration';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'order_confirmation';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'order_status_change';

-- ============================================================================
-- 2. Crear tabla de configuración por sucursal (si no existe)
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

-- Verificar ENUM
SELECT enumlabel
FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE pg_type.typname = 'notification_type'
ORDER BY enumsortorder;

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
-- 1. Ejecuta solo este script si tu base ya existe (no el schema completo).
-- 2. La configuración es por sucursal y por tipo de notificación.
-- 3. Si ambos canales están FALSE, no se envía notificación.
-- ============================================================================
