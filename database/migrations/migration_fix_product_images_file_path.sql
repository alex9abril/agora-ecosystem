-- ============================================================================
-- MIGRACIÓN: Corregir file_path en catalog.product_images
-- ============================================================================
-- Problema: Algunos file_path contienen URLs completas en lugar de rutas relativas
-- Solución: Extraer solo la ruta relativa de las URLs completas
--
-- Ejemplo de URL incorrecta:
-- https://jjuwvgezbgxlabofphzr.supabase.co/storage/v1/object/public/https://jjuwvgezbgxlabofphzr.storage.supabase.co/storage/v1/s3/00000001-0000-0000-0000-000000000001/image.jpg
--
-- Debe quedar como:
-- 00000001-0000-0000-0000-000000000001/image.jpg
-- ============================================================================

-- Función para normalizar file_path
CREATE OR REPLACE FUNCTION catalog.normalize_file_path(input_path TEXT)
RETURNS TEXT AS $$
DECLARE
  normalized_path TEXT;
BEGIN
  -- Si es NULL o vacío, retornar NULL
  IF input_path IS NULL OR TRIM(input_path) = '' THEN
    RETURN NULL;
  END IF;
  
  -- Si ya es una ruta relativa (no empieza con http), retornarla tal cual
  IF NOT input_path ~ '^https?://' THEN
    RETURN input_path;
  END IF;
  
  -- Intentar extraer el path después de /storage/v1/(object/public|s3)/[bucket]/
  -- Patrón 1: /storage/v1/object/public/[bucket]/[path]
  -- Patrón 2: /storage/v1/s3/[path]
  normalized_path := regexp_replace(
    input_path,
    '^.*/storage/v1/(?:object/public|s3)/[^/]+/(.+)$',
    '\1',
    'g'
  );
  
  -- Si el resultado todavía contiene una URL completa (caso de URLs duplicadas),
  -- intentar extraer de nuevo recursivamente
  IF normalized_path ~ '^https?://' THEN
    normalized_path := catalog.normalize_file_path(normalized_path);
  END IF;
  
  -- Si después de normalizar sigue siendo una URL completa, intentar extraer el último segmento
  IF normalized_path ~ '^https?://' THEN
    normalized_path := regexp_replace(
      normalized_path,
      '^.*/([^/]+/[^/]+)$',
      '\1',
      'g'
    );
  END IF;
  
  RETURN normalized_path;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Actualizar todos los file_path que contengan URLs completas
UPDATE catalog.product_images
SET file_path = catalog.normalize_file_path(file_path)
WHERE file_path ~ '^https?://'
  AND file_path != catalog.normalize_file_path(file_path);

-- Mostrar estadísticas
DO $$
DECLARE
  total_count INTEGER;
  fixed_count INTEGER;
  still_url_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM catalog.product_images;
  SELECT COUNT(*) INTO fixed_count 
  FROM catalog.product_images 
  WHERE file_path !~ '^https?://';
  SELECT COUNT(*) INTO still_url_count 
  FROM catalog.product_images 
  WHERE file_path ~ '^https?://';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Estadísticas de corrección de file_path:';
  RAISE NOTICE 'Total de imágenes: %', total_count;
  RAISE NOTICE 'Imágenes con path relativo: %', fixed_count;
  RAISE NOTICE 'Imágenes que aún tienen URL completa: %', still_url_count;
  RAISE NOTICE '========================================';
END $$;

-- Limpiar función temporal (opcional, comentar si quieres mantenerla)
-- DROP FUNCTION IF EXISTS catalog.normalize_file_path(TEXT);

-- ============================================================================
-- NOTAS:
-- ============================================================================
-- 1. Esta migración corrige los file_path que contienen URLs completas
-- 2. La función normalize_file_path extrae solo la ruta relativa
-- 3. El backend ahora usa normalizeStoragePath() para normalizar antes de generar URLs
-- 4. Si hay URLs duplicadas (URL dentro de URL), se normaliza recursivamente
-- ============================================================================

