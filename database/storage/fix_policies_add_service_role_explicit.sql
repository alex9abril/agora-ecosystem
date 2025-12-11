-- ============================================================================
-- Script para CORREGIR las políticas RLS agregando service_role explícitamente
-- ============================================================================
-- Las políticas actuales solo permiten 'public', necesitamos agregar 'service_role'
-- ============================================================================

-- ============================================================================
-- PASO 1: Eliminar las políticas existentes
-- ============================================================================
DROP POLICY IF EXISTS "products_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "products_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "products_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "products_delete_policy" ON storage.objects;

DO $$
BEGIN
  RAISE NOTICE '✅ Políticas antiguas eliminadas';
END $$;

-- ============================================================================
-- PASO 2: Crear nuevas políticas que incluyan service_role explícitamente
-- ============================================================================

-- Política para INSERT (subir imágenes)
CREATE POLICY "products_insert_policy"
ON storage.objects
FOR INSERT
TO public, authenticated, anon, service_role
WITH CHECK (
  bucket_id = 'products'
);

-- Política para SELECT (leer/obtener URLs públicas)
CREATE POLICY "products_select_policy"
ON storage.objects
FOR SELECT
TO public, authenticated, anon, service_role
USING (
  bucket_id = 'products'
);

-- Política para UPDATE (actualizar imágenes)
CREATE POLICY "products_update_policy"
ON storage.objects
FOR UPDATE
TO public, authenticated, anon, service_role
USING (
  bucket_id = 'products'
)
WITH CHECK (
  bucket_id = 'products'
);

-- Política para DELETE (eliminar imágenes)
CREATE POLICY "products_delete_policy"
ON storage.objects
FOR DELETE
TO public, authenticated, anon, service_role
USING (
  bucket_id = 'products'
);

DO $$
BEGIN
  RAISE NOTICE '✅ 4 políticas recreadas con service_role incluido';
END $$;

-- ============================================================================
-- PASO 3: Verificación
-- ============================================================================

SELECT 
  'VERIFICACIÓN DE POLÍTICAS' as seccion,
  policyname as nombre_politica,
  cmd as operacion,
  permissive as tipo,
  roles::text as roles_permitidos,
  CASE 
    WHEN 'service_role' = ANY(roles::text[]) THEN '✅ service_role incluido'
    ELSE '❌ service_role NO incluido'
  END as tiene_service_role
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%products%'
ORDER BY cmd, policyname;

-- ============================================================================
-- RESUMEN EJECUTIVO
-- ============================================================================
DO $$
DECLARE
  total_policies INTEGER;
  policies_with_service_role INTEGER;
BEGIN
  -- Contar políticas
  SELECT COUNT(*) INTO total_policies
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE '%products%';
  
  -- Contar políticas con service_role
  SELECT COUNT(*) INTO policies_with_service_role
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE '%products%'
    AND 'service_role' = ANY(roles::text[]);
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESUMEN DE CORRECCIÓN';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total de políticas: %', total_policies;
  RAISE NOTICE 'Políticas con service_role: %', policies_with_service_role;
  RAISE NOTICE '';
  
  IF total_policies = 4 AND policies_with_service_role = 4 THEN
    RAISE NOTICE '✅ CORRECCIÓN EXITOSA';
    RAISE NOTICE 'Todas las políticas ahora incluyen service_role.';
    RAISE NOTICE '';
    RAISE NOTICE 'PRÓXIMOS PASOS:';
    RAISE NOTICE '1. Reinicia el backend';
    RAISE NOTICE '2. Intenta subir una imagen nuevamente';
  ELSE
    RAISE WARNING '⚠️  CORRECCIÓN INCOMPLETA';
    IF total_policies < 4 THEN
      RAISE WARNING 'Faltan políticas. Se esperaban 4, se encontraron %.', total_policies;
    END IF;
    IF policies_with_service_role < 4 THEN
      RAISE WARNING 'Algunas políticas no incluyen service_role.';
    END IF;
  END IF;
  RAISE NOTICE '========================================';
END $$;

