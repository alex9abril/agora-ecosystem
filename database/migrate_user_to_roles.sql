-- ============================================================================
-- MIGRACIÓN: Asignar rol superadmin a usuario existente
-- ============================================================================
-- Este script migra un usuario existente al nuevo sistema de roles
-- Asigna el rol 'superadmin' a todos los negocios donde el usuario es owner
-- 
-- Usuario: a7877018-6a38-4166-8f11-335fae96b45d
-- Email: a.lex9abril@gmail.com
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- Variable del usuario a migrar
DO $$
DECLARE
    v_user_id UUID := 'a7877018-6a38-4166-8f11-335fae96b45d';
    v_user_email TEXT := 'a.lex9abril@gmail.com';
    v_business_record RECORD;
    v_business_count INTEGER := 0;
    v_inserted_count INTEGER := 0;
    v_updated_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🚀 Iniciando migración de usuario: % (%)', v_user_email, v_user_id;
    
    -- Verificar que el usuario existe en auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
        RAISE EXCEPTION 'Usuario no encontrado en auth.users: %', v_user_id;
    END IF;
    
    RAISE NOTICE '✅ Usuario encontrado en auth.users';
    
    -- Verificar/crear user_profile si no existe
    IF NOT EXISTS (SELECT 1 FROM core.user_profiles WHERE id = v_user_id) THEN
        RAISE NOTICE '📝 Creando user_profile para el usuario...';
        
        INSERT INTO core.user_profiles (
            id,
            role,
            first_name,
            last_name,
            phone,
            phone_verified,
            is_active,
            created_at,
            updated_at
        )
        SELECT 
            au.id,
            'local', -- Rol de plataforma (dueño de local)
            COALESCE(au.raw_user_meta_data->>'first_name', ''),
            COALESCE(au.raw_user_meta_data->>'last_name', ''),
            COALESCE(au.raw_user_meta_data->>'phone', NULL),
            COALESCE((au.raw_user_meta_data->>'phone_verified')::boolean, FALSE),
            TRUE,
            COALESCE(au.created_at, CURRENT_TIMESTAMP),
            COALESCE(au.updated_at, CURRENT_TIMESTAMP)
        FROM auth.users au
        WHERE au.id = v_user_id
        ON CONFLICT (id) DO UPDATE SET
            first_name = COALESCE(EXCLUDED.first_name, core.user_profiles.first_name),
            last_name = COALESCE(EXCLUDED.last_name, core.user_profiles.last_name),
            phone = COALESCE(EXCLUDED.phone, core.user_profiles.phone),
            phone_verified = COALESCE(EXCLUDED.phone_verified, core.user_profiles.phone_verified),
            role = COALESCE(EXCLUDED.role, core.user_profiles.role),
            updated_at = CURRENT_TIMESTAMP;
        
        RAISE NOTICE '✅ user_profile creado/actualizado';
    ELSE
        RAISE NOTICE '✅ user_profile ya existe';
        
        -- Actualizar el rol a 'local' si no lo tiene
        UPDATE core.user_profiles
        SET role = 'local',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_user_id
        AND role != 'local';
        
        IF FOUND THEN
            RAISE NOTICE '✅ Rol de plataforma actualizado a "local"';
        END IF;
    END IF;
    
    -- Buscar todos los negocios donde el usuario es owner
    SELECT COUNT(*) INTO v_business_count
    FROM core.businesses
    WHERE owner_id = v_user_id;
    
    RAISE NOTICE '📊 Negocios encontrados donde el usuario es owner: %', v_business_count;
    
    IF v_business_count = 0 THEN
        RAISE NOTICE '⚠️  No se encontraron negocios para este usuario. El usuario puede crear un negocio desde la aplicación.';
        RETURN;
    END IF;
    
    -- Asignar rol superadmin a todos los negocios del usuario
    FOR v_business_record IN 
        SELECT id, name, owner_id 
        FROM core.businesses
        WHERE owner_id = v_user_id
    LOOP
        -- Verificar si ya existe el registro
        IF EXISTS (
            SELECT 1 FROM core.business_users 
            WHERE business_id = v_business_record.id 
            AND user_id = v_user_id
        ) THEN
            -- Actualizar registro existente
            UPDATE core.business_users
            SET role = 'superadmin',
                is_active = TRUE,
                updated_at = CURRENT_TIMESTAMP
            WHERE business_id = v_business_record.id 
            AND user_id = v_user_id;
            
            v_updated_count := v_updated_count + 1;
            RAISE NOTICE '  🔄 Negocio "%" (ID: %) - Rol superadmin actualizado', 
                v_business_record.name, 
                v_business_record.id;
        ELSE
            -- Insertar nuevo registro
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
                'superadmin',
                '{}'::jsonb,
                TRUE,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            );
            
            v_inserted_count := v_inserted_count + 1;
            RAISE NOTICE '  ✅ Negocio "%" (ID: %) - Rol superadmin asignado', 
                v_business_record.name, 
                v_business_record.id;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Migración completada exitosamente!';
    RAISE NOTICE '📊 Resumen:';
    RAISE NOTICE '   - Negocios procesados: %', v_business_count;
    RAISE NOTICE '   - Registros insertados: %', v_inserted_count;
    RAISE NOTICE '   - Registros actualizados: %', v_updated_count;
    RAISE NOTICE '';
    RAISE NOTICE '🎉 El usuario ahora tiene rol superadmin en todos sus negocios';
    
END $$;

-- ============================================================================
-- VERIFICACIÓN: Mostrar los resultados de la migración
-- ============================================================================

-- Verificar que el usuario tiene los roles asignados
SELECT 
    bu.id AS business_user_id,
    b.id AS business_id,
    b.name AS business_name,
    bu.user_id,
    au.email AS user_email,
    bu.role,
    bu.is_active,
    bu.created_at AS assigned_at
FROM core.business_users bu
INNER JOIN core.businesses b ON bu.business_id = b.id
INNER JOIN auth.users au ON bu.user_id = au.id
WHERE bu.user_id = 'a7877018-6a38-4166-8f11-335fae96b45d'
ORDER BY bu.created_at DESC;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

