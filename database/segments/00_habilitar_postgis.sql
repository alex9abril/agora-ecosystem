-- ============================================================================
-- HABILITAR POSTGIS (REQUERIDO PARA SEGMENTO 11)
-- ============================================================================
-- Este script debe ejecutarse ANTES del segmento 11
-- 
-- INSTRUCCIONES:
-- 1. Si este script falla con error de permisos, habilita PostGIS manualmente:
--    - Ve a Supabase Dashboard
--    - Database > Extensions
--    - Busca "postgis"
--    - Haz clic en "Enable" o "Activar"
-- 
-- 2. Una vez habilitado, puedes continuar con el segmento 11
-- ============================================================================

-- Intentar crear la extensión PostGIS
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;

-- Verificar que PostGIS esté habilitado
DO $$
BEGIN
    -- Verificar que la extensión existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'postgis'
    ) THEN
        RAISE EXCEPTION 'PostGIS no está habilitado. Por favor, habilítalo desde Supabase Dashboard > Database > Extensions > postgis';
    END IF;
    
    -- Verificar que el tipo geometry existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'geometry'
    ) THEN
        RAISE EXCEPTION 'PostGIS no está correctamente configurado. El tipo geometry no existe.';
    END IF;
    
    RAISE NOTICE '✅ PostGIS está habilitado correctamente. Puedes continuar con el segmento 11.';
END $$;

