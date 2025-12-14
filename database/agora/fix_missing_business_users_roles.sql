-- ============================================================================
-- AGORA ECOSYSTEM - Corregir roles faltantes en business_users
-- ============================================================================
-- Descripción: Asigna automáticamente el rol 'superadmin' a los owners de
--              sucursales que no tienen un registro en business_users
-- 
-- Uso: Ejecutar para corregir sucursales existentes que no tienen roles asignados
-- ============================================================================

SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- IDENTIFICAR SUCURSALES SIN ROLES ASIGNADOS
-- ============================================================================

-- Ver sucursales que tienen owner_id pero no tienen registro en business_users
SELECT 
    b.id,
    b.name,
    b.owner_id,
    au.email,
    up.first_name,
    up.last_name
FROM core.businesses b
LEFT JOIN core.business_users bu ON b.id = bu.business_id AND b.owner_id = bu.user_id
LEFT JOIN core.user_profiles up ON b.owner_id = up.id
LEFT JOIN auth.users au ON b.owner_id = au.id
WHERE b.owner_id IS NOT NULL
  AND bu.id IS NULL
ORDER BY b.created_at DESC;

-- ============================================================================
-- ASIGNAR ROL SUPERADMIN A OWNERS SIN ROLES
-- ============================================================================

-- Insertar registros en business_users para owners que no tienen rol asignado
INSERT INTO core.business_users (
    business_id,
    user_id,
    role,
    permissions,
    is_active,
    created_at,
    updated_at
)
SELECT 
    b.id as business_id,
    b.owner_id as user_id,
    'superadmin'::core.business_role as role,
    '{}'::jsonb as permissions,
    TRUE as is_active,
    COALESCE(b.created_at, CURRENT_TIMESTAMP) as created_at,
    CURRENT_TIMESTAMP as updated_at
FROM core.businesses b
LEFT JOIN core.business_users bu ON b.id = bu.business_id AND b.owner_id = bu.user_id
WHERE b.owner_id IS NOT NULL
  AND bu.id IS NULL
ON CONFLICT (business_id, user_id) DO UPDATE SET
    role = 'superadmin'::core.business_role,
    is_active = TRUE,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar que todos los owners tienen rol asignado
SELECT 
    COUNT(*) as total_businesses,
    COUNT(bu.id) as businesses_with_roles,
    COUNT(*) - COUNT(bu.id) as businesses_without_roles
FROM core.businesses b
LEFT JOIN core.business_users bu ON b.id = bu.business_id AND b.owner_id = bu.user_id
WHERE b.owner_id IS NOT NULL;

-- Mostrar sucursales que aún no tienen roles (debería ser 0 después de ejecutar)
SELECT 
    b.id,
    b.name,
    b.owner_id,
    '⚠️ Sin rol asignado' as status
FROM core.businesses b
LEFT JOIN core.business_users bu ON b.id = bu.business_id AND b.owner_id = bu.user_id
WHERE b.owner_id IS NOT NULL
  AND bu.id IS NULL;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

