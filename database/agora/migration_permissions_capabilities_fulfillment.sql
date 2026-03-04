-- ============================================================================
-- AGORA ECOSYSTEM - Migration: Capabilities de fulfillment en permissions
-- ============================================================================
-- Descripción: Estándar de permissions en core.business_users incluye
--              "capabilities": { "can_fulfill", "can_assign_fulfillment" }.
--              can_fulfill: puede surtir pedidos (cambiar estado a preparando/
--              lista/entregada). can_assign_fulfillment: puede asignar pedidos
--              a otro surtidor. Este script rellena capabilities donde no existan.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-03-02
-- Hora: 18:00:00
-- ============================================================================

SET search_path TO core, public;

-- ----------------------------------------------------------------------------
-- Formato documentado de capabilities dentro de permissions (JSONB):
--   "capabilities": {
--     "can_fulfill": true | false,      -- puede surtir pedidos
--     "can_assign_fulfillment": true | false  -- puede asignar pedidos a surtidores
--   }
-- ----------------------------------------------------------------------------
-- Solo ejecutar si existe la tabla core.business_users (requiere haber ejecutado
-- antes schema/business_roles_and_multi_store.sql o equivalente).
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'core' AND table_name = 'business_users'
  ) THEN
    -- Backfill: superadmin y admin tienen can_fulfill y can_assign_fulfillment true
    UPDATE core.business_users
    SET
      permissions = COALESCE(permissions, '{}'::jsonb) || '{"capabilities": {"can_fulfill": true, "can_assign_fulfillment": true}}'::jsonb,
      updated_at = CURRENT_TIMESTAMP
    WHERE role IN ('superadmin', 'admin')
      AND (permissions IS NULL OR permissions = '{}'::jsonb OR permissions = 'null'::jsonb OR (permissions->'capabilities') IS NULL);

    -- Backfill: operations_staff y kitchen_staff tienen ambos false
    UPDATE core.business_users
    SET
      permissions = COALESCE(permissions, '{}'::jsonb) || '{"capabilities": {"can_fulfill": false, "can_assign_fulfillment": false}}'::jsonb,
      updated_at = CURRENT_TIMESTAMP
    WHERE role IN ('operations_staff', 'kitchen_staff')
      AND (permissions IS NULL OR permissions = '{}'::jsonb OR permissions = 'null'::jsonb OR (permissions->'capabilities') IS NULL);
  END IF;
END $$;

-- ============================================================================
-- NOTAS
-- ============================================================================
-- - Si la tabla core.business_users no existe, este script no hace nada (no falla).
--   La tabla se crea con database/schema/business_roles_and_multi_store.sql.
-- - No se modifica la estructura de tablas; solo UPDATE sobre core.business_users.
-- - Solo se añade "capabilities" cuando no existe (no se pisa un valor ya definido).
-- - superadmin/admin: pueden surtir y asignar surtidores por defecto.
-- - operations_staff/kitchen_staff: no pueden surtir ni asignar por defecto;
--   el superadmin puede activar can_fulfill desde Configuración > Usuarios y permisos.
-- ============================================================================
