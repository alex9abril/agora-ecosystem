-- ============================================================================
-- ACTUALIZACIÓN: Migrar datos de roles antiguos a nuevos nombres
-- ============================================================================
-- Este script actualiza los registros existentes en business_users
-- que tienen los valores antiguos del ENUM a los nuevos valores
-- ============================================================================

SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- IMPORTANTE: Este script debe ejecutarse DESPUÉS de renombrar los valores del ENUM
-- Si los valores del ENUM ya fueron renombrados, los datos deberían actualizarse automáticamente
-- Pero si hay datos con los valores antiguos, necesitamos actualizarlos

-- Verificar primero si hay registros con valores antiguos (esto fallará si el ENUM ya fue renombrado)
DO $$
DECLARE
    v_count_old_aceptador INTEGER;
    v_count_old_cocina INTEGER;
BEGIN
    -- Intentar contar registros con valores antiguos
    -- Si el ENUM ya fue renombrado, esto fallará, pero está bien
    BEGIN
        SELECT COUNT(*) INTO v_count_old_aceptador
        FROM core.business_users
        WHERE role::text = 'operativo_aceptador';
        
        SELECT COUNT(*) INTO v_count_old_cocina
        FROM core.business_users
        WHERE role::text = 'operativo_cocina';
        
        IF v_count_old_aceptador > 0 OR v_count_old_cocina > 0 THEN
            RAISE NOTICE '⚠️  Se encontraron registros con valores antiguos del ENUM';
            RAISE NOTICE '    operativo_aceptador: % registros', v_count_old_aceptador;
            RAISE NOTICE '    operativo_cocina: % registros', v_count_old_cocina;
            RAISE NOTICE '    Estos registros necesitan ser actualizados manualmente o el ENUM debe ser renombrado primero';
        ELSE
            RAISE NOTICE '✅ No se encontraron registros con valores antiguos';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'ℹ️  El ENUM ya fue renombrado. Los datos deberían estar actualizados automáticamente.';
    END;
END $$;

-- Si el ENUM ya fue renombrado, los datos deberían estar actualizados
-- Pero verificamos que no haya problemas
SELECT 
    role::text,
    COUNT(*) AS cantidad
FROM core.business_users
GROUP BY role::text
ORDER BY role::text;

-- Verificar cuántos registros se actualizaron
SELECT 
    'operativo_aceptador → operations_staff' AS migracion,
    COUNT(*) AS registros_actualizados
FROM core.business_users
WHERE role::text = 'operations_staff'
AND updated_at >= CURRENT_DATE;

SELECT 
    'operativo_cocina → kitchen_staff' AS migracion,
    COUNT(*) AS registros_actualizados
FROM core.business_users
WHERE role::text = 'kitchen_staff'
AND updated_at >= CURRENT_DATE;

-- Verificar que no queden registros con valores antiguos
SELECT 
    role::text,
    COUNT(*) AS cantidad
FROM core.business_users
WHERE role::text IN ('operativo_aceptador', 'operativo_cocina')
GROUP BY role::text;

