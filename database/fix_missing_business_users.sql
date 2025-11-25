-- ============================================================================
-- CORRECCIÓN RÁPIDA: Asignar rol superadmin a negocios sin registro en business_users
-- ============================================================================
-- Este script corrige el problema donde un negocio existe pero no tiene
-- registro en core.business_users, lo que impide que el usuario lo vea en web-local.
-- 
-- Ejecuta este script para asignar automáticamente el rol 'superadmin' al
-- owner_id de todos los negocios que no tengan registro en business_users.
-- ============================================================================

SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- Mostrar negocios que necesitan corrección
SELECT 
    'Negocios que necesitan corrección:' AS info,
    b.id AS business_id,
    b.name AS business_name,
    b.owner_id,
    au.email AS owner_email,
    CASE 
        WHEN bu.id IS NULL THEN '❌ Sin registro en business_users'
        ELSE '✅ Ya tiene registro'
    END AS estado
FROM core.businesses b
INNER JOIN auth.users au ON b.owner_id = au.id
LEFT JOIN core.business_users bu ON bu.business_id = b.id AND bu.user_id = b.owner_id
WHERE bu.id IS NULL
ORDER BY b.created_at DESC;

-- Asignar rol superadmin a todos los negocios que no lo tengan
DO $$
DECLARE
    v_business_record RECORD;
    v_inserted_count INTEGER := 0;
    v_updated_count INTEGER := 0;
    v_error_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🚀 Iniciando corrección de negocios sin registro en business_users...';
    RAISE NOTICE '';
    
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
        BEGIN
            -- Insertar registro en business_users
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
            )
            ON CONFLICT (business_id, user_id) DO UPDATE SET
                role = 'superadmin',
                is_active = TRUE,
                updated_at = CURRENT_TIMESTAMP;
            
            v_inserted_count := v_inserted_count + 1;
            RAISE NOTICE '  ✅ Negocio "%" (ID: %) - Rol superadmin asignado a %', 
                v_business_record.business_name, 
                v_business_record.business_id,
                v_business_record.owner_email;
                
        EXCEPTION WHEN OTHERS THEN
            v_error_count := v_error_count + 1;
            RAISE NOTICE '  ❌ Error al asignar rol a negocio "%" (ID: %): %', 
                v_business_record.business_name, 
                v_business_record.business_id,
                SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Corrección completada!';
    RAISE NOTICE '📊 Resumen:';
    RAISE NOTICE '   - Registros insertados/actualizados: %', v_inserted_count;
    RAISE NOTICE '   - Errores: %', v_error_count;
    RAISE NOTICE '';
    
    IF v_inserted_count = 0 THEN
        RAISE NOTICE 'ℹ️  No se encontraron negocios que necesiten corrección.';
    ELSE
        RAISE NOTICE '🎉 Todos los negocios ahora tienen su owner como superadmin en business_users.';
    END IF;
    
END $$;

-- Verificar el resultado
SELECT 
    'Verificación final:' AS info,
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

-- Mostrar negocios que aún no tienen registro (debería estar vacío después de la corrección)
SELECT 
    'Negocios que aún necesitan corrección (debería estar vacío):' AS info,
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

