-- ============================================================================
-- DELIVERY ECOSYSTEM - Catálogo de Roles (OPCIONAL)
-- ============================================================================
-- ⚠️ IMPORTANTE: Este script es OPCIONAL
-- 
-- Los roles están definidos como ENUM en schema.sql:
--       CREATE TYPE user_role AS ENUM ('client', 'repartidor', 'local', 'admin');
-- 
-- El ENUM es lo que realmente usa la base de datos. Este catálogo es solo para:
-- - Documentación y consultas de permisos
-- - Reportes y estadísticas
-- - Validación en la aplicación
-- - UI que muestre roles disponibles
-- 
-- Si NO necesitas documentación de permisos, NO ejecutes este script.
-- Los roles funcionan perfectamente solo con el ENUM.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2024-11-18
-- ============================================================================

-- Configurar search_path
SET search_path TO core, public;

-- ============================================================================
-- TABLA DE CATÁLOGO DE ROLES (Para documentación y consultas)
-- ============================================================================
-- Esta tabla es opcional pero útil para:
-- - Documentar permisos y capacidades de cada rol
-- - Consultas de reportes y estadísticas
-- - Validación en la aplicación
-- - UI que muestre roles disponibles
--
-- RELACIÓN CON user_profiles:
-- - user_profiles.role (tipo: user_role ENUM) se relaciona con roles_catalog.role_code (VARCHAR)
-- - La relación es lógica (no hay FK directa porque ENUM no puede ser FK)
-- - Se hace JOIN usando: user_profiles.role::text = roles_catalog.role_code

CREATE TABLE IF NOT EXISTS core.roles_catalog (
    role_code VARCHAR(50) PRIMARY KEY, -- Código del rol (debe coincidir con el ENUM)
    role_name VARCHAR(100) NOT NULL, -- Nombre legible del rol
    description TEXT, -- Descripción del rol
    permissions JSONB, -- Permisos y capacidades del rol (estructura flexible)
    display_order INTEGER DEFAULT 0, -- Orden de visualización
    is_active BOOLEAN DEFAULT TRUE, -- Si el rol está activo
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint para asegurar que role_code coincida con valores del ENUM
    CONSTRAINT roles_catalog_role_code_check CHECK (
        role_code IN ('client', 'repartidor', 'local', 'admin')
    )
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_roles_catalog_is_active ON core.roles_catalog(is_active);
CREATE INDEX IF NOT EXISTS idx_roles_catalog_display_order ON core.roles_catalog(display_order);

-- ============================================================================
-- DATOS DEL CATÁLOGO DE ROLES
-- ============================================================================

INSERT INTO core.roles_catalog (
    role_code,
    role_name,
    description,
    permissions,
    display_order,
    is_active
) VALUES
    (
        'client',
        'Cliente',
        'Usuario final que realiza pedidos en la plataforma. Puede ver locales, crear pedidos, rastrear entregas, dejar reseñas y propinas.',
        '{
            "can_order": true,
            "can_view_businesses": true,
            "can_track_delivery": true,
            "can_review": true,
            "can_tip": true,
            "can_use_promotions": true,
            "can_manage_profile": true,
            "can_view_social_feed": true,
            "can_create_social_posts": true,
            "can_manage_own_addresses": true,
            "can_view_order_history": true,
            "can_cancel_own_orders": true,
            "can_purchase_localcoins": true
        }'::jsonb,
        1,
        TRUE
    ),
    (
        'repartidor',
        'Repartidor',
        'Usuario que realiza entregas. Puede ver pedidos disponibles, aceptar/rechazar entregas, actualizar estado de entrega, ver historial y ganancias.',
        '{
            "can_view_available_orders": true,
            "can_accept_delivery": true,
            "can_reject_delivery": true,
            "can_update_delivery_status": true,
            "can_view_delivery_history": true,
            "can_view_earnings": true,
            "can_receive_tips": true,
            "can_manage_profile": true,
            "can_update_location": true,
            "can_set_availability": true,
            "can_view_social_feed": true,
            "can_create_social_posts": true,
            "can_view_eco_metrics": true,
            "can_manage_vehicle_info": true
        }'::jsonb,
        2,
        TRUE
    ),
    (
        'local',
        'Dueño/Gerente de Local',
        'Dueño o gerente de un negocio registrado. Puede gestionar menú, recibir pedidos, actualizar estado de pedidos, ver estadísticas del negocio.',
        '{
            "can_manage_menu": true,
            "can_manage_products": true,
            "can_manage_collections": true,
            "can_receive_orders": true,
            "can_confirm_orders": true,
            "can_update_order_status": true,
            "can_cancel_orders": true,
            "can_view_business_stats": true,
            "can_manage_business_profile": true,
            "can_manage_business_hours": true,
            "can_manage_promotions": true,
            "can_view_reviews": true,
            "can_respond_to_reviews": true,
            "can_manage_subscriptions": true,
            "can_view_earnings": true,
            "can_manage_eco_packaging": true
        }'::jsonb,
        3,
        TRUE
    ),
    (
        'admin',
        'Administrador del Sistema',
        'Administrador con acceso completo al sistema. Puede gestionar usuarios, negocios, ver reportes globales, configurar sistema, moderar contenido.',
        '{
            "can_manage_all_users": true,
            "can_manage_all_businesses": true,
            "can_manage_all_orders": true,
            "can_view_all_reports": true,
            "can_view_system_stats": true,
            "can_moderate_content": true,
            "can_manage_system_settings": true,
            "can_manage_api_keys": true,
            "can_view_all_logs": true,
            "can_manage_promotions_global": true,
            "can_manage_subscriptions_global": true,
            "can_ban_users": true,
            "can_verify_businesses": true,
            "can_verify_repartidores": true,
            "can_access_admin_panel": true,
            "can_export_data": true,
            "can_manage_roles": true
        }'::jsonb,
        4,
        TRUE
    )
ON CONFLICT (role_code) DO UPDATE SET
    role_name = EXCLUDED.role_name,
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    display_order = EXCLUDED.display_order,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- VISTA ÚTIL: Roles con Conteo de Usuarios
-- ============================================================================

CREATE OR REPLACE VIEW core.roles_with_user_count AS
SELECT 
    rc.role_code,
    rc.role_name,
    rc.description,
    rc.permissions,
    rc.display_order,
    rc.is_active,
    COUNT(up.id) AS user_count,
    COUNT(CASE WHEN up.is_active THEN 1 END) AS active_user_count
FROM core.roles_catalog rc
LEFT JOIN core.user_profiles up ON up.role::text = rc.role_code
GROUP BY rc.role_code, rc.role_name, rc.description, rc.permissions, rc.display_order, rc.is_active
ORDER BY rc.display_order;

-- ============================================================================
-- VISTA ÚTIL: User Profiles con Información del Catálogo de Roles
-- ============================================================================
-- Esta vista combina user_profiles con información del catálogo de roles

CREATE OR REPLACE VIEW core.user_profiles_with_role_info AS
SELECT 
    up.id,
    up.role,
    up.first_name,
    up.last_name,
    up.phone,
    up.profile_image_url,
    up.phone_verified,
    up.is_active,
    up.is_blocked,
    up.wallet_user_id,
    up.created_at,
    up.updated_at,
    -- Información del catálogo de roles
    rc.role_name,
    rc.description AS role_description,
    rc.permissions AS role_permissions,
    rc.display_order AS role_display_order
FROM core.user_profiles up
LEFT JOIN core.roles_catalog rc ON up.role::text = rc.role_code
WHERE rc.is_active = TRUE OR rc.role_code IS NULL; -- Incluir usuarios aunque no tengan catálogo

-- ============================================================================
-- FUNCIÓN: Obtener Permisos de un Rol
-- ============================================================================

CREATE OR REPLACE FUNCTION core.get_role_permissions(p_role_code VARCHAR(50))
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_permissions JSONB;
BEGIN
    SELECT permissions INTO v_permissions
    FROM core.roles_catalog
    WHERE role_code = p_role_code AND is_active = TRUE;
    
    RETURN COALESCE(v_permissions, '{}'::jsonb);
END;
$$;

-- ============================================================================
-- FUNCIÓN: Verificar si un Rol tiene un Permiso Específico
-- ============================================================================

CREATE OR REPLACE FUNCTION core.has_permission(
    p_role_code VARCHAR(50),
    p_permission_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_permissions JSONB;
    v_has_permission BOOLEAN;
BEGIN
    SELECT permissions INTO v_permissions
    FROM core.roles_catalog
    WHERE role_code = p_role_code AND is_active = TRUE;
    
    IF v_permissions IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar si el permiso existe y es true
    v_has_permission := COALESCE((v_permissions->>p_permission_name)::boolean, FALSE);
    
    RETURN v_has_permission;
END;
$$;

-- ============================================================================
-- FUNCIÓN: Obtener Permisos de un Usuario por su ID
-- ============================================================================
-- Útil para verificar permisos directamente desde user_profiles.id

CREATE OR REPLACE FUNCTION core.get_user_permissions(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_role_code VARCHAR(50);
    v_permissions JSONB;
BEGIN
    -- Obtener el rol del usuario
    SELECT role::text INTO v_role_code
    FROM core.user_profiles
    WHERE id = p_user_id AND is_active = TRUE;
    
    IF v_role_code IS NULL THEN
        RETURN '{}'::jsonb;
    END IF;
    
    -- Obtener permisos del catálogo
    SELECT permissions INTO v_permissions
    FROM core.roles_catalog
    WHERE role_code = v_role_code AND is_active = TRUE;
    
    RETURN COALESCE(v_permissions, '{}'::jsonb);
END;
$$;

-- ============================================================================
-- FUNCIÓN: Verificar si un Usuario tiene un Permiso Específico
-- ============================================================================

CREATE OR REPLACE FUNCTION core.user_has_permission(
    p_user_id UUID,
    p_permission_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_role_code VARCHAR(50);
    v_has_permission BOOLEAN;
BEGIN
    -- Obtener el rol del usuario
    SELECT role::text INTO v_role_code
    FROM core.user_profiles
    WHERE id = p_user_id AND is_active = TRUE;
    
    IF v_role_code IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar permiso usando la función existente
    SELECT core.has_permission(v_role_code, p_permission_name) INTO v_has_permission;
    
    RETURN COALESCE(v_has_permission, FALSE);
END;
$$;

-- ============================================================================
-- COMENTARIOS
-- ============================================================================

COMMENT ON TABLE core.roles_catalog IS 'Catálogo de roles del sistema con permisos y descripciones. Se relaciona con user_profiles.role mediante JOIN (user_profiles.role::text = roles_catalog.role_code)';
COMMENT ON VIEW core.roles_with_user_count IS 'Vista que muestra roles con conteo de usuarios por rol';
COMMENT ON VIEW core.user_profiles_with_role_info IS 'Vista que combina user_profiles con información del catálogo de roles (nombre, descripción, permisos)';
COMMENT ON FUNCTION core.get_role_permissions IS 'Obtiene los permisos de un rol específico';
COMMENT ON FUNCTION core.has_permission IS 'Verifica si un rol tiene un permiso específico';
COMMENT ON FUNCTION core.get_user_permissions IS 'Obtiene los permisos de un usuario por su ID';
COMMENT ON FUNCTION core.user_has_permission IS 'Verifica si un usuario tiene un permiso específico';

-- ============================================================================
-- CONSULTAS DE EJEMPLO
-- ============================================================================

-- Ver todos los roles disponibles
-- SELECT * FROM core.roles_catalog WHERE is_active = TRUE ORDER BY display_order;

-- Ver roles con conteo de usuarios
-- SELECT * FROM core.roles_with_user_count ORDER BY display_order;

-- Ver user_profiles con información del catálogo de roles
-- SELECT * FROM core.user_profiles_with_role_info WHERE is_active = TRUE;

-- Obtener permisos de un rol específico
-- SELECT core.get_role_permissions('admin');

-- Verificar si un rol tiene un permiso
-- SELECT core.has_permission('client', 'can_order');

-- Obtener permisos de un usuario específico
-- SELECT core.get_user_permissions('user-uuid-here');

-- Verificar si un usuario tiene un permiso
-- SELECT core.user_has_permission('user-uuid-here', 'can_order');

-- JOIN manual entre user_profiles y roles_catalog
-- SELECT 
--     up.id,
--     up.first_name,
--     up.last_name,
--     up.role,
--     rc.role_name,
--     rc.description,
--     rc.permissions
-- FROM core.user_profiles up
-- LEFT JOIN core.roles_catalog rc ON up.role::text = rc.role_code
-- WHERE up.is_active = TRUE;

-- ============================================================================
-- FIN DEL SCRIPT DE CATÁLOGO DE ROLES
-- ============================================================================
