-- ============================================================================
-- ASIGNAR ROL A USUARIO EN SUCURSAL
-- ============================================================================
-- Este script permite asignar un rol (superadmin o admin) a un usuario
-- específico en una sucursal específica.
-- 
-- Útil cuando:
-- - Estás trabajando desde el admin y necesitas permisos en una sucursal
-- - La sucursal fue creada por otro usuario
-- - Necesitas gestionar el branding, productos, etc. de una sucursal
-- 
-- Uso:
-- 1. Reemplaza los valores de las variables al inicio del script
-- 2. Ejecuta el script completo
-- ============================================================================

SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- CONFIGURACIÓN: Modifica estos valores según tus necesidades
-- ============================================================================

-- CAMBIAR AQUÍ: ID de la sucursal (business_id)
-- Ejemplo: 'b7bde5c9-03e4-47aa-a735-7a8777a984ac'
-- CAMBIAR AQUÍ: ID del usuario (user_id)
-- Ejemplo: 'c9996110-a5b1-42d9-9336-f1efd7111b15'

-- ============================================================================
-- VERIFICACIÓN: Ver información antes de asignar
-- ============================================================================

-- Ver información de la sucursal
SELECT 
    'Información de la sucursal:' AS info,
    b.id AS business_id,
    b.name AS business_name,
    b.owner_id AS owner_id,
    au.email AS owner_email,
    bg.name AS group_name,
    bg.owner_id AS group_owner_id
FROM core.businesses b
LEFT JOIN auth.users au ON b.owner_id = au.id
LEFT JOIN core.business_groups bg ON b.business_group_id = bg.id
WHERE b.id = 'b7bde5c9-03e4-47aa-a735-7a8777a984ac'; -- CAMBIAR AQUÍ

-- Ver información del usuario
SELECT 
    'Información del usuario:' AS info,
    au.id AS user_id,
    au.email AS user_email,
    up.first_name,
    up.last_name,
    up.role AS platform_role
FROM auth.users au
LEFT JOIN core.user_profiles up ON au.id = up.id
WHERE au.id = 'c9996110-a5b1-42d9-9336-f1efd7111b15'; -- CAMBIAR AQUÍ

-- Ver roles actuales del usuario en esta sucursal
SELECT 
    'Roles actuales del usuario en esta sucursal:' AS info,
    bu.id,
    bu.business_id,
    bu.user_id,
    bu.role,
    bu.is_active,
    bu.created_at,
    bu.updated_at
FROM core.business_users bu
WHERE bu.business_id = 'b7bde5c9-03e4-47aa-a735-7a8777a984ac' -- CAMBIAR AQUÍ
  AND bu.user_id = 'c9996110-a5b1-42d9-9336-f1efd7111b15'; -- CAMBIAR AQUÍ

-- ============================================================================
-- ASIGNACIÓN: Asignar o actualizar el rol
-- ============================================================================

DO $$
DECLARE
    -- CAMBIAR AQUÍ: ID de la sucursal
    v_business_id UUID := 'b7bde5c9-03e4-47aa-a735-7a8777a984ac';
    
    -- CAMBIAR AQUÍ: ID del usuario al que quieres asignar el rol (user_id)
    -- Ejemplo: 'c9996110-a5b1-42d9-9336-f1efd7111b15'
    v_user_id UUID := 'c9996110-a5b1-42d9-9336-f1efd7111b15';
    
    -- CAMBIAR AQUÍ: Rol a asignar ('superadmin' o 'admin')
    v_role core.business_role := 'superadmin';
    v_business_name VARCHAR(255);
    v_user_email VARCHAR(255);
    v_result_id UUID;
    v_existing_superadmin_id UUID;
    v_existing_superadmin_email VARCHAR(255);
BEGIN
    RAISE NOTICE '🚀 Iniciando asignación de rol...';
    RAISE NOTICE '';
    
    -- Verificar que la sucursal existe
    SELECT name INTO v_business_name
    FROM core.businesses
    WHERE id = v_business_id;
    
    IF v_business_name IS NULL THEN
        RAISE EXCEPTION '❌ La sucursal con ID % no existe', v_business_id;
    END IF;
    
    -- Verificar que el usuario existe
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = v_user_id;
    
    IF v_user_email IS NULL THEN
        RAISE EXCEPTION '❌ El usuario con ID % no existe', v_user_id;
    END IF;
    
    RAISE NOTICE '📋 Información:';
    RAISE NOTICE '   - Sucursal: % (ID: %)', v_business_name, v_business_id;
    RAISE NOTICE '   - Usuario: % (ID: %)', v_user_email, v_user_id;
    RAISE NOTICE '   - Rol a asignar: %', v_role;
    RAISE NOTICE '';
    
    -- Si se está asignando superadmin, verificar si ya existe uno activo
    IF v_role = 'superadmin' THEN
        -- Buscar superadmin activo existente (que no sea el usuario actual)
        SELECT bu.user_id, au.email INTO v_existing_superadmin_id, v_existing_superadmin_email
        FROM core.business_users bu
        INNER JOIN auth.users au ON bu.user_id = au.id
        WHERE bu.business_id = v_business_id
          AND bu.role = 'superadmin'
          AND bu.is_active = TRUE
          AND bu.user_id != v_user_id
        LIMIT 1;
        
        -- Si existe un superadmin activo diferente, cambiarlo a 'admin' para mantener acceso
        IF v_existing_superadmin_id IS NOT NULL THEN
            RAISE NOTICE '⚠️  Se encontró un superadmin activo existente:';
            RAISE NOTICE '   - Usuario: % (ID: %)', v_existing_superadmin_email, v_existing_superadmin_id;
            RAISE NOTICE '   - Cambiando rol de superadmin a admin para mantener acceso...';
            
            UPDATE core.business_users
            SET role = 'admin'::core.business_role,
                is_active = TRUE,
                updated_at = CURRENT_TIMESTAMP
            WHERE business_id = v_business_id
              AND user_id = v_existing_superadmin_id
              AND role = 'superadmin'
              AND is_active = TRUE;
            
            RAISE NOTICE '   ✅ Usuario original ahora tiene rol "admin" y mantiene acceso.';
            RAISE NOTICE '';
        END IF;
    END IF;
    
    -- Asignar o actualizar el rol
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
        v_business_id,
        v_user_id,
        v_role,
        '{}'::jsonb,
        TRUE,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (business_id, user_id) DO UPDATE SET
        role = v_role,
        is_active = TRUE,
        updated_at = CURRENT_TIMESTAMP
    RETURNING id INTO v_result_id;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Rol asignado exitosamente!';
    RAISE NOTICE '📋 Detalles:';
    RAISE NOTICE '   - Sucursal: % (ID: %)', v_business_name, v_business_id;
    RAISE NOTICE '   - Usuario: % (ID: %)', v_user_email, v_user_id;
    RAISE NOTICE '   - Rol asignado: %', v_role;
    RAISE NOTICE '   - Registro ID: %', v_result_id;
    RAISE NOTICE '';
    RAISE NOTICE '🎉 El usuario ahora puede gestionar esta sucursal!';
    
END $$;

-- ============================================================================
-- VERIFICACIÓN: Ver el resultado
-- ============================================================================

SELECT 
    '✅ Verificación final:' AS info,
    b.name AS business_name,
    au.email AS user_email,
    bu.role,
    bu.is_active,
    bu.created_at AS assigned_at,
    bu.updated_at AS last_updated
FROM core.business_users bu
INNER JOIN core.businesses b ON bu.business_id = b.id
INNER JOIN auth.users au ON bu.user_id = au.id
WHERE bu.business_id = 'b7bde5c9-03e4-47aa-a735-7a8777a984ac' -- CAMBIAR AQUÍ (mismo ID de arriba)
  AND bu.user_id = 'c9996110-a5b1-42d9-9336-f1efd7111b15'; -- CAMBIAR AQUÍ (mismo ID de arriba)

-- ============================================================================
-- OPCIONAL: Asignar el mismo rol a todas las sucursales de un grupo
-- ============================================================================
-- Si quieres asignar el rol a todas las sucursales de un grupo empresarial,
-- descomenta y ejecuta esta sección:

/*
DO $$
DECLARE
    v_user_id UUID := 'c9996110-a5b1-42d9-9336-f1efd7111b15'; -- CAMBIAR AQUÍ
    v_role core.business_role := 'superadmin'; -- CAMBIAR AQUÍ
    v_group_id UUID := 'da020da9-d182-4aa1-a6c6-3330955ebdb6'; -- CAMBIAR AQUÍ: ID del grupo
    v_business_record RECORD;
    v_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🚀 Asignando rol % a todas las sucursales del grupo...', v_role;
    
    FOR v_business_record IN 
        SELECT id, name
        FROM core.businesses
        WHERE business_group_id = v_group_id
    LOOP
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
            v_business_record.id,
            v_user_id,
            v_role,
            '{}'::jsonb,
            TRUE,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (business_id, user_id) DO UPDATE SET
            role = v_role,
            is_active = TRUE,
            updated_at = CURRENT_TIMESTAMP;
        
        v_count := v_count + 1;
        RAISE NOTICE '  ✅ Sucursal "%" (ID: %)', v_business_record.name, v_business_record.id;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Proceso completado! % sucursales actualizadas.', v_count;
END $$;
*/

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

