-- ============================================================================
-- CORRECCIÓN: Actualizar datos después de renombrar valores del ENUM
-- ============================================================================
-- Este script corrige el problema cuando el ENUM fue renombrado pero
-- los datos en business_users aún tienen los valores antiguos.
-- 
-- IMPORTANTE: Este script asume que el ENUM ya fue renombrado usando:
--   ALTER TYPE core.business_role RENAME VALUE 'operativo_aceptador' TO 'operations_staff';
--   ALTER TYPE core.business_role RENAME VALUE 'operativo_cocina' TO 'kitchen_staff';
-- ============================================================================

SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- SOLUCIÓN: Eliminar dependencias, cambiar temporalmente la columna a TEXT, actualizar, y restaurar
DO $$
DECLARE
    v_updated_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🔄 Iniciando corrección de datos...';
    
    -- Paso 1: Eliminar la vista que depende de la columna
    DROP VIEW IF EXISTS core.businesses_with_users;
    RAISE NOTICE '✅ Vista eliminada temporalmente';
    
    -- Paso 2: Cambiar la columna temporalmente a TEXT para poder actualizar
    ALTER TABLE core.business_users 
    ALTER COLUMN role TYPE TEXT;
    
    RAISE NOTICE '✅ Columna cambiada a TEXT';
    
    -- Paso 3: Actualizar los valores antiguos
    UPDATE core.business_users
    SET role = CASE 
        WHEN role = 'operativo_aceptador' THEN 'operations_staff'
        WHEN role = 'operativo_cocina' THEN 'kitchen_staff'
        ELSE role
    END,
    updated_at = CURRENT_TIMESTAMP
    WHERE role IN ('operativo_aceptador', 'operativo_cocina');
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Actualizados % registros', v_updated_count;
    
    -- Paso 4: Volver a cambiar la columna al tipo ENUM
    ALTER TABLE core.business_users 
    ALTER COLUMN role TYPE core.business_role USING role::core.business_role;
    
    RAISE NOTICE '✅ Columna restaurada al tipo business_role';
    
    -- Paso 5: Recrear la vista (será recreada por business_roles_and_multi_store.sql)
    RAISE NOTICE 'ℹ️  La vista businesses_with_users será recreada al ejecutar business_roles_and_multi_store.sql';
    
    RAISE NOTICE '🎉 Migración completada exitosamente';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error durante la migración: %', SQLERRM;
    RAISE NOTICE '⚠️  Intentando restaurar la columna al tipo original...';
    
    -- Intentar restaurar en caso de error
    BEGIN
        ALTER TABLE core.business_users 
        ALTER COLUMN role TYPE core.business_role USING role::core.business_role;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️  No se pudo restaurar automáticamente. Revisa manualmente.';
    END;
    
    RAISE;
END $$;

-- Verificar el resultado final
SELECT 
    'Estado final de roles en business_users' AS info,
    role::text,
    COUNT(*) AS cantidad
FROM core.business_users
GROUP BY role::text
ORDER BY role::text;
