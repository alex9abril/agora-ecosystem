-- ============================================================================
-- AGORA ECOSYSTEM - Migración: Extender ENUM notification_type
-- ============================================================================
-- Descripción: Agrega nuevos tipos de notificación para soportar la
-- configuración por sucursal asociada a correos de bienvenida,
-- confirmación de pedido y cambio de estatus.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-02-03
-- Hora: 13:23:24
-- ============================================================================

-- Configuración inicial
SET search_path TO public, core, communication;

-- ============================================================================
-- 1. Extender ENUM notification_type
-- ============================================================================

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'user_registration';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'order_confirmation';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'order_status_change';

-- ============================================================================
-- VERIFICACIONES
-- ============================================================================

SELECT enumlabel
FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE pg_type.typname = 'notification_type'
ORDER BY enumsortorder;

-- ============================================================================
-- NOTAS:
-- ============================================================================
-- 1. Estos valores habilitan configurar canales para correos base.
-- 2. No elimina ni modifica valores existentes del ENUM.
-- ============================================================================
