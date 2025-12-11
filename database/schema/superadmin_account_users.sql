-- ============================================================================
-- GESTIÓN DE USUARIOS A NIVEL DE CUENTA DEL SUPERADMIN
-- ============================================================================
-- Este script agrega funciones para que el superadmin gestione usuarios
-- a nivel de su cuenta (todas sus tiendas), no solo por tienda individual.
-- 
-- Concepto: Un superadmin puede tener múltiples tiendas, y debe poder
-- ver y gestionar todos los usuarios relacionados con SU CUENTA (todas sus tiendas),
-- no solo los usuarios de una tienda específica.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2025-01-16
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- FUNCIÓN: Obtener todos los usuarios de la cuenta del superadmin
-- ============================================================================
-- Retorna todos los usuarios que están asignados a CUALQUIERA de las tiendas
-- donde el usuario es superadmin. Esto permite al superadmin ver todos
-- los usuarios relacionados con su cuenta, no solo de una tienda.

DROP FUNCTION IF EXISTS core.get_superadmin_account_users(UUID);
CREATE OR REPLACE FUNCTION core.get_superadmin_account_users(p_superadmin_id UUID)
RETURNS TABLE (
    user_id UUID,
    user_email TEXT,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role business_role,
    business_id UUID,
    business_name VARCHAR(255),
    is_active BOOLEAN,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bu.user_id,
        au.email::TEXT,
        COALESCE(
            up.first_name,
            au.raw_user_meta_data->>'first_name',
            NULL
        )::VARCHAR(100) AS first_name,
        COALESCE(
            up.last_name,
            au.raw_user_meta_data->>'last_name',
            NULL
        )::VARCHAR(100) AS last_name,
        bu.role,
        bu.business_id,
        b.name AS business_name,
        bu.is_active,
        bu.created_at
    FROM core.business_users bu
    INNER JOIN core.businesses b ON bu.business_id = b.id
    INNER JOIN auth.users au ON bu.user_id = au.id
    LEFT JOIN core.user_profiles up ON bu.user_id = up.id
    WHERE bu.business_id IN (
        -- Obtener todas las tiendas donde el usuario es superadmin
        SELECT bu2.business_id
        FROM core.business_users bu2
        WHERE bu2.user_id = p_superadmin_id
        AND bu2.role = 'superadmin'
        AND bu2.is_active = TRUE
    )
    AND bu.is_active = TRUE
    -- Excluir al mismo superadmin
    AND bu.user_id != p_superadmin_id
    GROUP BY 
        bu.user_id,
        au.email,
        au.raw_user_meta_data,
        up.first_name,
        up.last_name,
        bu.role,
        bu.business_id,
        b.name,
        bu.is_active,
        bu.created_at
    ORDER BY 
        bu.created_at DESC,
        b.name,
        CASE bu.role
            WHEN 'superadmin' THEN 1
            WHEN 'admin' THEN 2
            WHEN 'operations_staff' THEN 3
            WHEN 'kitchen_staff' THEN 4
        END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.get_superadmin_account_users IS 'Obtiene todos los usuarios de todas las tiendas donde un usuario es superadmin (usuarios de su cuenta)';

-- ============================================================================
-- FUNCIÓN: Obtener usuarios disponibles para asignar a la cuenta del superadmin
-- ============================================================================
-- Retorna usuarios que pueden ser asignados a cualquiera de las tiendas
-- del superadmin. Muestra si ya están asignados a alguna de sus tiendas.

DROP FUNCTION IF EXISTS core.get_available_users_for_superadmin_account(UUID, TEXT);
CREATE OR REPLACE FUNCTION core.get_available_users_for_superadmin_account(
    p_superadmin_id UUID,
    p_search_term TEXT DEFAULT NULL
)
RETURNS TABLE (
    user_id UUID,
    user_email TEXT,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    is_already_assigned BOOLEAN,
    assigned_businesses TEXT[],
    assigned_roles core.business_role[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id::UUID AS user_id,
        au.email::TEXT AS user_email,
        up.first_name::VARCHAR(100),
        up.last_name::VARCHAR(100),
        COALESCE(up.phone, '')::VARCHAR(20) AS phone,
        -- Verificar si está asignado a alguna tienda del superadmin
        EXISTS (
            SELECT 1
            FROM core.business_users bu
            WHERE bu.user_id = au.id
            AND bu.business_id IN (
                SELECT bu2.business_id
                FROM core.business_users bu2
                WHERE bu2.user_id = p_superadmin_id
                AND bu2.role = 'superadmin'
                AND bu2.is_active = TRUE
            )
            AND bu.is_active = TRUE
        ) AS is_already_assigned,
        -- Lista de tiendas donde ya está asignado
        COALESCE(
            ARRAY(
                SELECT b.name::TEXT
                FROM core.business_users bu
                INNER JOIN core.businesses b ON bu.business_id = b.id
                WHERE bu.user_id = au.id
                AND bu.business_id IN (
                    SELECT bu2.business_id
                    FROM core.business_users bu2
                    WHERE bu2.user_id = p_superadmin_id
                    AND bu2.role = 'superadmin'
                    AND bu2.is_active = TRUE
                )
                AND bu.is_active = TRUE
            ),
            ARRAY[]::TEXT[]
        ) AS assigned_businesses,
        -- Lista de roles en las tiendas del superadmin
        COALESCE(
            ARRAY(
                SELECT bu.role::core.business_role
                FROM core.business_users bu
                WHERE bu.user_id = au.id
                AND bu.business_id IN (
                    SELECT bu2.business_id
                    FROM core.business_users bu2
                    WHERE bu2.user_id = p_superadmin_id
                    AND bu2.role = 'superadmin'
                    AND bu2.is_active = TRUE
                )
                AND bu.is_active = TRUE
            ),
            ARRAY[]::core.business_role[]
        ) AS assigned_roles
    FROM auth.users au
    LEFT JOIN core.user_profiles up ON au.id = up.id
    WHERE (
        p_search_term IS NULL 
        OR au.email ILIKE '%' || p_search_term || '%'
        OR up.first_name ILIKE '%' || p_search_term || '%'
        OR up.last_name ILIKE '%' || p_search_term || '%'
        OR up.phone ILIKE '%' || p_search_term || '%'
    )
    -- Excluir al mismo superadmin
    AND au.id != p_superadmin_id
    ORDER BY 
        -- Mostrar primero los ya asignados
        EXISTS (
            SELECT 1
            FROM core.business_users bu
            WHERE bu.user_id = au.id
            AND bu.business_id IN (
                SELECT bu2.business_id
                FROM core.business_users bu2
                WHERE bu2.user_id = p_superadmin_id
                AND bu2.role = 'superadmin'
                AND bu2.is_active = TRUE
            )
            AND bu.is_active = TRUE
        ) DESC,
        au.email;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.get_available_users_for_superadmin_account IS 'Obtiene usuarios disponibles para asignar a cualquiera de las tiendas del superadmin, mostrando si ya están asignados';

-- ============================================================================
-- FUNCIÓN: Remover usuario de todas las tiendas de la cuenta del superadmin
-- ============================================================================
-- Permite al superadmin remover un usuario de TODAS sus tiendas de una vez.

DROP FUNCTION IF EXISTS core.remove_user_from_superadmin_account(UUID, UUID);
CREATE OR REPLACE FUNCTION core.remove_user_from_superadmin_account(
    p_superadmin_id UUID,
    p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_removed_count INTEGER := 0;
BEGIN
    -- Verificar que el usuario que hace la remoción es superadmin
    IF NOT EXISTS (
        SELECT 1 
        FROM core.business_users 
        WHERE user_id = p_superadmin_id 
        AND role = 'superadmin' 
        AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Solo un superadmin puede remover usuarios de su cuenta';
    END IF;
    
    -- Verificar que no se intente remover al superadmin
    IF p_user_id = p_superadmin_id THEN
        RAISE EXCEPTION 'No puedes removerte a ti mismo de tu cuenta';
    END IF;
    
    -- Remover el usuario de todas las tiendas del superadmin
    UPDATE core.business_users
    SET is_active = FALSE,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id
    AND business_id IN (
        SELECT bu2.business_id
        FROM core.business_users bu2
        WHERE bu2.user_id = p_superadmin_id
        AND bu2.role = 'superadmin'
        AND bu2.is_active = TRUE
    )
    AND is_active = TRUE;
    
    GET DIAGNOSTICS v_removed_count = ROW_COUNT;
    
    RETURN v_removed_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.remove_user_from_superadmin_account IS 'Remueve un usuario de todas las tiendas de la cuenta del superadmin';

-- ============================================================================
-- FUNCIÓN: Obtener resumen de usuarios por tienda de la cuenta del superadmin
-- ============================================================================
-- Retorna un resumen agrupado de usuarios por tienda para el superadmin.

DROP FUNCTION IF EXISTS core.get_superadmin_account_users_summary(UUID);
CREATE OR REPLACE FUNCTION core.get_superadmin_account_users_summary(p_superadmin_id UUID)
RETURNS TABLE (
    business_id UUID,
    business_name VARCHAR(255),
    total_users INTEGER,
    total_admins INTEGER,
    total_operativos_aceptadores INTEGER,
    total_operativos_cocina INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.name,
        COUNT(bu.id) FILTER (WHERE bu.is_active = TRUE)::INTEGER AS total_users,
        COUNT(bu.id) FILTER (WHERE bu.role = 'admin' AND bu.is_active = TRUE)::INTEGER AS total_admins,
        COUNT(bu.id) FILTER (WHERE bu.role = 'operations_staff' AND bu.is_active = TRUE)::INTEGER AS total_operations_staff,
        COUNT(bu.id) FILTER (WHERE bu.role = 'kitchen_staff' AND bu.is_active = TRUE)::INTEGER AS total_kitchen_staff
    FROM core.businesses b
    INNER JOIN core.business_users bu_superadmin ON b.id = bu_superadmin.business_id
    LEFT JOIN core.business_users bu ON b.id = bu.business_id
    WHERE bu_superadmin.user_id = p_superadmin_id
    AND bu_superadmin.role = 'superadmin'
    AND bu_superadmin.is_active = TRUE
    -- Excluir al superadmin del conteo
    AND (bu.user_id IS NULL OR bu.user_id != p_superadmin_id)
    GROUP BY b.id, b.name
    ORDER BY b.name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.get_superadmin_account_users_summary IS 'Obtiene un resumen de usuarios por tienda de la cuenta del superadmin';

-- ============================================================================
-- EJEMPLOS DE USO
-- ============================================================================

/*
-- 1. Ver todos los usuarios de la cuenta del superadmin (todas sus tiendas)
SELECT * FROM core.get_superadmin_account_users('superadmin-user-uuid');

-- 2. Buscar usuarios disponibles para asignar a la cuenta del superadmin
SELECT * FROM core.get_available_users_for_superadmin_account(
    'superadmin-user-uuid',
    'juan'  -- Término de búsqueda (opcional)
);

-- 3. Remover un usuario de todas las tiendas de la cuenta del superadmin
SELECT core.remove_user_from_superadmin_account(
    'superadmin-user-uuid',
    'user-to-remove-uuid'
);

-- 4. Ver resumen de usuarios por tienda
SELECT * FROM core.get_superadmin_account_users_summary('superadmin-user-uuid');
*/

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

