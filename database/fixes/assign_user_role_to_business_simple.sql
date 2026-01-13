-- ============================================================================
-- ASIGNAR ROL A USUARIO EN SUCURSAL (Versión Simple)
-- ============================================================================
-- Este script permite asignar un rol (superadmin o admin) a un usuario
-- específico en una sucursal específica.
-- 
-- Útil cuando:
-- - Estás trabajando desde el admin y necesitas permisos en una sucursal
-- - La sucursal fue creada por otro usuario
-- - Necesitas gestionar el branding, productos, etc. de una sucursal
-- 
-- INSTRUCCIONES:
-- 1. Reemplaza los valores en las líneas marcadas con "CAMBIAR AQUÍ"
-- 2. Ejecuta el script completo
-- ============================================================================

SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- CONFIGURACIÓN: Modifica estos valores
-- ============================================================================

-- CAMBIAR AQUÍ: ID de la sucursal (business_id)
-- Ejemplo: 'b7bde5c9-03e4-47aa-a735-7a8777a984ac'
DO $$
DECLARE
    v_business_id UUID := 'b7bde5c9-03e4-47aa-a735-7a8777a984ac'; -- CAMBIAR AQUÍ
    
    -- CAMBIAR AQUÍ: ID del usuario al que quieres asignar el rol (user_id)
    -- Ejemplo: 'c9996110-a5b1-42d9-9336-f1efd7111b15'
    v_user_id UUID := 'c9996110-a5b1-42d9-9336-f1efd7111b15'; -- CAMBIAR AQUÍ
    
    -- CAMBIAR AQUÍ: Rol a asignar ('superadmin' o 'admin')
    v_role core.business_role := 'superadmin'; -- CAMBIAR AQUÍ si necesitas 'admin'
    
    -- Variables internas
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
    
    RAISE NOTICE '✅ Rol asignado exitosamente!';
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
-- FIN DEL SCRIPT
-- ============================================================================

