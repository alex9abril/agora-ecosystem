-- ============================================================================
-- [AGORA ECOSYSTEM] - Migración: get_user_businesses_summary con fallback owner
-- ============================================================================
-- Descripción: Modifica core.get_user_businesses_summary para que devuelva
--              también los negocios donde el usuario es owner_id (core.businesses)
--              con rol superadmin cuando no tiene fila en core.business_users.
--              Así el usuario principal (dueño de la cuenta) siempre tiene
--              permisos completos aunque falle o falte el INSERT en business_users.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-03-12
-- Hora: 12:00:00
-- ============================================================================

SET search_path TO core, public;

DROP FUNCTION IF EXISTS core.get_user_businesses_summary(UUID);

CREATE OR REPLACE FUNCTION core.get_user_businesses_summary(p_user_id UUID)
RETURNS TABLE (
    business_id UUID,
    business_name VARCHAR(255),
    role core.business_role,
    permissions JSONB,
    is_active BOOLEAN,
    can_access BOOLEAN,
    assigned_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sub.id,
        sub.name,
        sub.role,
        sub.permissions,
        sub.is_active,
        sub.can_access,
        sub.assigned_at
    FROM (
        -- Filas desde business_users (comportamiento actual)
        SELECT
            b.id,
            b.name,
            bu.role,
            bu.permissions,
            bu.is_active,
            (bu.is_active AND b.is_active) AS can_access,
            bu.created_at AS assigned_at
        FROM core.business_users bu
        INNER JOIN core.businesses b ON bu.business_id = b.id
        WHERE bu.user_id = p_user_id

        UNION ALL

        -- Fallback: negocios donde el usuario es owner y no está en business_users
        SELECT
            b.id,
            b.name,
            'superadmin'::core.business_role AS role,
            '{}'::jsonb AS permissions,
            TRUE AS is_active,
            b.is_active AS can_access,
            b.created_at AS assigned_at
        FROM core.businesses b
        WHERE b.owner_id = p_user_id
          AND b.id NOT IN (
              SELECT bu2.business_id
              FROM core.business_users bu2
              WHERE bu2.user_id = p_user_id
          )
    ) sub
    ORDER BY sub.can_access DESC, sub.assigned_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.get_user_businesses_summary(UUID) IS 'Resumen de tiendas del usuario (roles desde business_users). Incluye fallback: si es owner_id del negocio y no tiene fila en business_users, se devuelve con rol superadmin.';

-- ============================================================================
-- NOTAS
-- ============================================================================
-- - El frontend usa este resumen para availableBusinesses y selectedBusiness.role.
-- - Con el fallback, el usuario que creó la cuenta (owner) siempre tendrá al menos
--   una fila por su negocio con role = superadmin y canManageClients = true.
-- - Si ya existe fila en business_users, no se duplica (NOT IN en el fallback).
