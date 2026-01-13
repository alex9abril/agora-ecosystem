-- ============================================================================
-- RESTAURAR ACCESO DE USUARIO A SUCURSAL
-- ============================================================================
-- Este script restaura el acceso de un usuario a una sucursal.
-- Útil cuando un usuario perdió acceso accidentalmente.
-- 
-- ⚠️  IMPORTANTE SOBRE ROLES:
-- - 'superadmin': Tiene acceso COMPLETO incluyendo:
--   ✅ Sección de configuración
--   ✅ Gestión de usuarios
--   ✅ Todas las funcionalidades
-- - 'admin': Tiene acceso a gestión pero:
--   ❌ NO tiene acceso a configuración
--   ❌ NO puede gestionar usuarios
-- 
-- Si el usuario original necesita acceder a configuración, DEBE tener rol 'superadmin'
-- 
-- INSTRUCCIONES:
-- 1. Reemplaza los valores en las líneas marcadas con "CAMBIAR AQUÍ"
-- 2. Si el usuario original necesita configuración, usa 'superadmin'
-- 3. El script automáticamente cambiará el otro usuario a 'admin' si es necesario
-- 4. Ejecuta el script completo
-- ============================================================================

SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- CONFIGURACIÓN: Modifica estos valores
-- ============================================================================

DO $$
DECLARE
    -- CAMBIAR AQUÍ: ID de la sucursal (business_id)
    v_business_id UUID := 'b7bde5c9-03e4-47aa-a735-7a8777a984ac';
    
    -- CAMBIAR AQUÍ: ID del usuario al que quieres restaurar acceso (user_id)
    -- Este es el usuario que perdió acceso
    v_user_id UUID := '7a4956e4-7204-45e7-8039-22e79a45e6b0'; -- CAMBIAR AQUÍ
    
    -- CAMBIAR AQUÍ: Rol a asignar
    -- IMPORTANTE: Solo 'superadmin' tiene acceso a la sección de configuración
    -- Opciones:
    -- - 'superadmin': Acceso completo incluyendo configuración (recomendado para usuario original)
    -- - 'admin': Permisos de gestión pero SIN acceso a configuración
    v_role core.business_role := 'superadmin'; -- CAMBIAR AQUÍ (recomendado: 'superadmin' para acceso a configuración)
    
    -- Variables internas
    v_business_name VARCHAR(255);
    v_user_email VARCHAR(255);
    v_result_id UUID;
    v_existing_superadmin_id UUID;
    v_existing_superadmin_email VARCHAR(255);
    v_current_role core.business_role;
    v_current_is_active BOOLEAN;
BEGIN
    RAISE NOTICE '🚀 Iniciando restauración de acceso...';
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
    
    -- Verificar si el usuario ya tiene un registro en business_users
    SELECT role, is_active INTO v_current_role, v_current_is_active
    FROM core.business_users
    WHERE business_id = v_business_id
      AND user_id = v_user_id;
    
    RAISE NOTICE '📋 Información:';
    RAISE NOTICE '   - Sucursal: % (ID: %)', v_business_name, v_business_id;
    RAISE NOTICE '   - Usuario: % (ID: %)', v_user_email, v_user_id;
    RAISE NOTICE '   - Rol a asignar: %', v_role;
    IF v_role = 'superadmin' THEN
        RAISE NOTICE '   - ⚠️  NOTA: Este rol tiene acceso a configuración y gestión de usuarios';
    ELSIF v_role = 'admin' THEN
        RAISE NOTICE '   - ⚠️  NOTA: Este rol NO tiene acceso a configuración';
    END IF;
    
    IF v_current_role IS NOT NULL THEN
        RAISE NOTICE '   - Estado actual: Rol "%", Activo: %', v_current_role, v_current_is_active;
    ELSE
        RAISE NOTICE '   - Estado actual: Sin registro en business_users';
    END IF;
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
            
            RAISE NOTICE '   ✅ Usuario existente ahora tiene rol "admin" y mantiene acceso.';
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
    
    RAISE NOTICE '✅ Acceso restaurado exitosamente!';
    RAISE NOTICE '   - Registro ID: %', v_result_id;
    RAISE NOTICE '';
    RAISE NOTICE '🎉 El usuario ahora puede gestionar esta sucursal nuevamente!';
    
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
  AND bu.user_id = '7a4956e4-7204-45e7-8039-22e79a45e6b0'; -- CAMBIAR AQUÍ (mismo ID de arriba)

-- ============================================================================
-- VER TODOS LOS USUARIOS CON ACCESO A ESTA SUCURSAL
-- ============================================================================

SELECT 
    'Usuarios con acceso a la sucursal:' AS info,
    au.email AS user_email,
    bu.role,
    bu.is_active,
    CASE 
        WHEN b.owner_id = bu.user_id THEN '✅ Propietario'
        ELSE ''
    END AS es_propietario
FROM core.business_users bu
INNER JOIN core.businesses b ON bu.business_id = b.id
INNER JOIN auth.users au ON bu.user_id = au.id
WHERE bu.business_id = 'b7bde5c9-03e4-47aa-a735-7a8777a984ac' -- CAMBIAR AQUÍ (mismo ID de arriba)
  AND bu.is_active = TRUE
ORDER BY 
    CASE bu.role 
        WHEN 'superadmin' THEN 1
        WHEN 'admin' THEN 2
        ELSE 3
    END,
    au.email;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

