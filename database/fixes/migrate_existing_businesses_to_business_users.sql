-- ============================================================================
-- MIGRACIÓN: Asignar rol superadmin a negocios existentes
-- ============================================================================
-- Este script migra los negocios existentes que no tienen registro en
-- core.business_users, asignando el rol 'superadmin' al owner_id de cada negocio.
-- 
-- IMPORTANTE: Ejecutar este script después de business_roles_and_multi_store.sql
-- ============================================================================

SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- Variable para contar registros
DO $$
DECLARE
    v_business_record RECORD;
    v_inserted_count INTEGER := 0;
    v_updated_count INTEGER := 0;
    v_skipped_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🚀 Iniciando migración de negocios existentes a business_users...';
    
    -- Buscar todos los negocios que tienen owner_id pero no tienen registro en business_users
    FOR v_business_record IN 
        SELECT 
            b.id AS business_id,
            b.name AS business_name,
            b.owner_id,
            au.email AS owner_email
        FROM core.businesses b
        INNER JOIN auth.users au ON b.owner_id = au.id
        WHERE NOT EXISTS (
            SELECT 1 
            FROM core.business_users bu 
            WHERE bu.business_id = b.id 
            AND bu.user_id = b.owner_id
        )
    LOOP
        -- Verificar si el usuario existe en auth.users
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_business_record.owner_id) THEN
            RAISE NOTICE '  ⚠️  Negocio "%" (ID: %) - Owner no existe en auth.users, saltando', 
                v_business_record.business_name, 
                v_business_record.business_id;
            v_skipped_count := v_skipped_count + 1;
            CONTINUE;
        END IF;
        
        -- Verificar si ya existe un registro (por si acaso)
        IF EXISTS (
            SELECT 1 FROM core.business_users 
            WHERE business_id = v_business_record.business_id 
            AND user_id = v_business_record.owner_id
        ) THEN
            -- Actualizar registro existente
            UPDATE core.business_users
            SET role = 'superadmin',
                is_active = TRUE,
                updated_at = CURRENT_TIMESTAMP
            WHERE business_id = v_business_record.business_id 
            AND user_id = v_business_record.owner_id;
            
            v_updated_count := v_updated_count + 1;
            RAISE NOTICE '  🔄 Negocio "%" (ID: %) - Rol superadmin actualizado para %', 
                v_business_record.business_name, 
                v_business_record.business_id,
                v_business_record.owner_email;
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
                v_business_record.business_id,
                v_business_record.owner_id,
                'superadmin',
                '{}'::jsonb,
                TRUE,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            );
            
            v_inserted_count := v_inserted_count + 1;
            RAISE NOTICE '  ✅ Negocio "%" (ID: %) - Rol superadmin asignado a %', 
                v_business_record.business_name, 
                v_business_record.business_id,
                v_business_record.owner_email;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Migración completada exitosamente!';
    RAISE NOTICE '📊 Resumen:';
    RAISE NOTICE '   - Registros insertados: %', v_inserted_count;
    RAISE NOTICE '   - Registros actualizados: %', v_updated_count;
    RAISE NOTICE '   - Registros omitidos: %', v_skipped_count;
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Todos los negocios existentes ahora tienen su owner como superadmin';
    
END $$;

-- ============================================================================
-- VERIFICACIÓN: Mostrar los resultados de la migración
-- ============================================================================

-- Verificar que todos los negocios tienen su owner como superadmin
SELECT 
    b.id AS business_id,
    b.name AS business_name,
    b.owner_id,
    au.email AS owner_email,
    bu.role,
    bu.is_active,
    bu.created_at AS assigned_at
FROM core.businesses b
INNER JOIN auth.users au ON b.owner_id = au.id
LEFT JOIN core.business_users bu ON bu.business_id = b.id AND bu.user_id = b.owner_id
ORDER BY b.created_at DESC;

-- Mostrar negocios que NO tienen registro en business_users (debería estar vacío)
SELECT 
    b.id AS business_id,
    b.name AS business_name,
    b.owner_id,
    au.email AS owner_email
FROM core.businesses b
INNER JOIN auth.users au ON b.owner_id = au.id
WHERE NOT EXISTS (
    SELECT 1 
    FROM core.business_users bu 
    WHERE bu.business_id = b.id 
    AND bu.user_id = b.owner_id
);

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

