-- ============================================================================
-- AGORA ECOSYSTEM - Asignar rol a usuario en sucursal o grupo
-- ============================================================================
-- Descripción: Script para asignar un rol específico a un usuario en una
--              sucursal o en todas las sucursales de un grupo
-- 
-- Uso: Ejecutar para asignar roles manualmente cuando sea necesario
-- ============================================================================

SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- OPCIÓN 1: ASIGNAR ROL A USUARIO EN UNA SUCURSAL ESPECÍFICA
-- ============================================================================

-- Ejemplo: Asignar rol 'admin' al usuario en la sucursal
-- Reemplaza los valores según necesites:
-- - user_id: ID del usuario
-- - business_id: ID de la sucursal
-- - role: 'superadmin', 'admin', 'operations_staff', o 'kitchen_staff'

/*
INSERT INTO core.business_users (
    business_id,
    user_id,
    role,
    permissions,
    is_active,
    created_at,
    updated_at
)
VALUES (
    '4ed0decf-6d29-4681-aa9d-39bc7b8a7e58'::uuid,  -- business_id (Toyota Satelite)
    'c9996110-a5b1-42d9-9336-f1efd7111b15'::uuid,  -- user_id
    'admin'::core.business_role,                    -- role
    '{}'::jsonb,                                    -- permissions
    TRUE,                                           -- is_active
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (business_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    is_active = TRUE,
    updated_at = CURRENT_TIMESTAMP;
*/

-- ============================================================================
-- OPCIÓN 2: ASIGNAR ROL A USUARIO EN TODAS LAS SUCURSALES DE UN GRUPO
-- ============================================================================

-- Ejemplo: Asignar rol 'admin' al usuario en todas las sucursales del grupo
-- Reemplaza los valores según necesites:
-- - user_id: ID del usuario
-- - group_id: ID del grupo empresarial
-- - role: 'superadmin', 'admin', 'operations_staff', o 'kitchen_staff'

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
    'c9996110-a5b1-42d9-9336-f1efd7111b15'::uuid as user_id,  -- user_id
    'admin'::core.business_role as role,                       -- role
    '{}'::jsonb as permissions,
    TRUE as is_active,
    CURRENT_TIMESTAMP as created_at,
    CURRENT_TIMESTAMP as updated_at
FROM core.businesses b
WHERE b.business_group_id = '615fd239-55cb-4232-abba-2232a03f2942'::uuid  -- group_id (Grupo Premier Automotriz)
  AND NOT EXISTS (
      SELECT 1 
      FROM core.business_users bu 
      WHERE bu.business_id = b.id 
        AND bu.user_id = 'c9996110-a5b1-42d9-9336-f1efd7111b15'::uuid
  )
ON CONFLICT (business_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    is_active = TRUE,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar que el rol se asignó correctamente
SELECT 
    b.name as sucursal,
    b.business_group_id,
    bg.name as grupo,
    bu.role,
    bu.is_active,
    au.email as user_email,
    up.first_name,
    up.last_name
FROM core.business_users bu
INNER JOIN core.businesses b ON bu.business_id = b.id
LEFT JOIN core.business_groups bg ON b.business_group_id = bg.id
LEFT JOIN auth.users au ON bu.user_id = au.id
LEFT JOIN core.user_profiles up ON bu.user_id = up.id
WHERE bu.user_id = 'c9996110-a5b1-42d9-9336-f1efd7111b15'::uuid
  AND b.business_group_id = '615fd239-55cb-4232-abba-2232a03f2942'::uuid
ORDER BY b.name;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

