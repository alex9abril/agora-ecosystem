-- ============================================================================
-- AGORA ECOSYSTEM - Migración: Destinatarios de Notificaciones por Sucursal/Grupo
-- ============================================================================
-- Descripción: Crea la tabla para registrar correos electrónicos de
-- supervisores/destinatarios que recibirán notificaciones de eventos
-- (compras, nuevos clientes, cambios de estatus de pedido) por tienda.
-- Soporta asignación a sucursal (business_id) o grupo (business_group_id).
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-04-10
-- Hora: 12:00:00
-- ============================================================================

-- Configuración inicial
SET search_path TO core, communication, public;

-- ============================================================================
-- 1. TABLA: Destinatarios de notificaciones
-- ============================================================================

CREATE TABLE IF NOT EXISTS communication.notification_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    business_id UUID REFERENCES core.businesses(id) ON DELETE CASCADE,
    business_group_id UUID REFERENCES core.business_groups(id) ON DELETE CASCADE,

    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_notification_recipient_owner
        CHECK (
            (business_id IS NOT NULL AND business_group_id IS NULL)
            OR
            (business_id IS NULL AND business_group_id IS NOT NULL)
        )
);

COMMENT ON TABLE communication.notification_recipients IS 'Correos de supervisores que reciben notificaciones de eventos por sucursal o grupo.';
COMMENT ON COLUMN communication.notification_recipients.business_id IS 'Sucursal a la que aplica (NULL si es por grupo).';
COMMENT ON COLUMN communication.notification_recipients.business_group_id IS 'Grupo empresarial al que aplica (NULL si es por sucursal).';
COMMENT ON COLUMN communication.notification_recipients.email IS 'Correo electrónico del destinatario.';
COMMENT ON COLUMN communication.notification_recipients.name IS 'Nombre o etiqueta opcional del destinatario.';
COMMENT ON COLUMN communication.notification_recipients.is_active IS 'Si el destinatario está activo para recibir notificaciones.';

-- Unicidad: un correo por sucursal, un correo por grupo
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_recipients_business_email
    ON communication.notification_recipients(business_id, email)
    WHERE business_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_recipients_group_email
    ON communication.notification_recipients(business_group_id, email)
    WHERE business_group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_recipients_business_id
    ON communication.notification_recipients(business_id)
    WHERE business_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_recipients_business_group_id
    ON communication.notification_recipients(business_group_id)
    WHERE business_group_id IS NOT NULL;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_notification_recipients_updated_at
    ON communication.notification_recipients;
CREATE TRIGGER update_notification_recipients_updated_at
    BEFORE UPDATE ON communication.notification_recipients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICACIONES
-- ============================================================================

SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'communication'
  AND table_name = 'notification_recipients';

SELECT indexname
FROM pg_indexes
WHERE schemaname = 'communication'
  AND tablename = 'notification_recipients';

SELECT tgname
FROM pg_trigger
WHERE tgrelid = 'communication.notification_recipients'::regclass;

-- ============================================================================
-- NOTAS:
-- ============================================================================
-- 1. Cada fila representa un correo de supervisor para una sucursal o grupo.
-- 2. El CHECK constraint garantiza que siempre pertenece a exactamente uno
--    (sucursal o grupo), nunca ambos ni ninguno.
-- 3. Los índices únicos parciales permiten un mismo correo en distintas
--    sucursales/grupos pero no duplicados dentro de la misma.
-- 4. Para desactivar un destinatario sin eliminarlo, usar is_active = FALSE.
-- ============================================================================
