-- ============================================================================
-- DIAGNÓSTICO DE POSTGIS
-- ============================================================================
-- Ejecuta este script para diagnosticar problemas con PostGIS
-- ============================================================================

-- 1. Verificar que PostGIS está habilitado
SELECT 
    'PostGIS Extension' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') 
        THEN '✅ HABILITADO' 
        ELSE '❌ NO HABILITADO' 
    END as status;

-- 2. Verificar dónde está el tipo geometry
SELECT 
    'Geometry Type Location' as check_type,
    n.nspname as schema_name,
    t.typname as type_name,
    CASE 
        WHEN n.nspname = 'public' THEN '✅ En public'
        ELSE '⚠️ En schema: ' || n.nspname
    END as status
FROM pg_type t
JOIN pg_namespace n ON t.typnamespace = n.oid
WHERE t.typname = 'geometry';

-- 3. Verificar funciones de PostGIS disponibles (buscar en todos los schemas)
SELECT 
    'PostGIS Functions Location' as check_type,
    n.nspname as schema_name,
    COUNT(DISTINCT p.proname) as function_count,
    CASE 
        WHEN COUNT(DISTINCT p.proname) <= 10 
        THEN STRING_AGG(DISTINCT p.proname, ', ' ORDER BY p.proname)
        ELSE (
            SELECT STRING_AGG(proname, ', ' ORDER BY proname)
            FROM (
                SELECT DISTINCT p2.proname
                FROM pg_proc p2
                JOIN pg_namespace n2 ON p2.pronamespace = n2.oid
                WHERE p2.proname LIKE 'st_%'
                AND n2.nspname = n.nspname
                ORDER BY p2.proname
                LIMIT 5
            ) sub
        ) || ' ... (y más)'
    END as sample_functions,
    CASE 
        WHEN COUNT(DISTINCT p.proname) > 0 
        THEN '✅ ' || COUNT(DISTINCT p.proname) || ' funciones en ' || n.nspname
        ELSE '❌ No hay funciones'
    END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname LIKE 'st_%'
AND n.nspname NOT IN ('pg_catalog', 'information_schema')
GROUP BY n.nspname
ORDER BY function_count DESC;

-- 4. Intentar crear un tipo geometry de prueba
DO $$
BEGIN
    BEGIN
        -- Intentar usar el tipo geometry (en extensions)
        PERFORM 'POINT(0 0)'::extensions.geometry;
        RAISE NOTICE '✅ El tipo geometry funciona correctamente (extensions.geometry)';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Error al usar extensions.geometry: %', SQLERRM;
    END;
    
    BEGIN
        -- Intentar usar funciones de PostGIS
        PERFORM extensions.ST_MakePoint(0, 0);
        RAISE NOTICE '✅ Las funciones de PostGIS funcionan (extensions.ST_*)';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Error al usar funciones PostGIS: %', SQLERRM;
    END;
END $$;

