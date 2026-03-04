-- ============================================================================
-- [AGORA] - Migration: Rellenar permissions para operadores existentes
-- ============================================================================
-- Descripción: Actualiza core.business_users para que los roles
--              operations_staff y kitchen_staff tengan un JSONB permissions
--              con valor por defecto (solo módulo orders), de modo que la app
--              web-local siga mostrando acceso a Pedidos hasta que el admin
--              ajuste permisos granulares.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-03-02
-- Hora: 12:00:00
-- ============================================================================

SET search_path TO core, public;

-- ----------------------------------------------------------------------------
-- Backfill: permissions por defecto para operadores sin permissions definidos
-- ----------------------------------------------------------------------------
UPDATE core.business_users
SET
  permissions = '{
    "modules": {
      "products": false,
      "clients": false,
      "orders": true,
      "sliders": false,
      "collections": false,
      "reports": false
    },
    "settings": {}
  }'::jsonb,
  updated_at = CURRENT_TIMESTAMP
WHERE role IN ('operations_staff', 'kitchen_staff')
  AND (permissions IS NULL OR permissions = '{}'::jsonb OR permissions = 'null'::jsonb);

-- ============================================================================
-- NOTAS
-- ============================================================================
-- - Solo se actualizan filas con role operations_staff o kitchen_staff.
-- - Solo se actualiza si permissions está vacío o no definido.
-- - El valor por defecto otorga solo acceso al módulo "orders" (Pedidos).
-- - Después de ejecutar, los operadores existentes seguirán viendo Pedidos
--   en web-local; el administrador puede editar permisos por sucursal desde
--   Configuración > Usuarios y permisos > Editar permisos.
-- ============================================================================
