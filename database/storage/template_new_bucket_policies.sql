-- ============================================================================
-- TEMPLATE: Políticas RLS para Nuevo Bucket de Supabase Storage
-- ============================================================================
-- INSTRUCCIONES:
-- 1. Reemplaza [NOMBRE_BUCKET] con el nombre real del bucket
-- 2. Reemplaza [NOMBRE_BUCKET_CAPITALIZADO] con el nombre capitalizado (ej: "Product" para "products")
-- 3. Ejecuta este script en tu base de datos de Supabase
-- ============================================================================

-- PASO 1: Eliminar políticas existentes (si las hay)
DO $$
DECLARE
  policy_record RECORD;
  deleted_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Eliminando políticas existentes para [NOMBRE_BUCKET]...';
  
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects'
      AND (
        qual::text LIKE '%[NOMBRE_BUCKET]%' 
        OR with_check::text LIKE '%[NOMBRE_BUCKET]%'
        OR policyname LIKE '%[NOMBRE_BUCKET]%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
    deleted_count := deleted_count + 1;
    RAISE NOTICE 'Política eliminada: %', policy_record.policyname;
  END LOOP;
  
  RAISE NOTICE 'Total de políticas eliminadas: %', deleted_count;
END $$;

-- ============================================================================
-- PASO 2: Crear las 4 políticas requeridas
-- ============================================================================

-- 1. Política para INSERT (subir archivos)
CREATE POLICY "Allow service role to upload [NOMBRE_BUCKET_CAPITALIZADO] images"
ON storage.objects
FOR INSERT
TO authenticated, anon, service_role
WITH CHECK (bucket_id = '[NOMBRE_BUCKET]');

-- 2. Política para SELECT (leer/obtener URLs públicas)
CREATE POLICY "Allow public read access to [NOMBRE_BUCKET_CAPITALIZADO] images"
ON storage.objects
FOR SELECT
TO public, authenticated, anon, service_role
USING (bucket_id = '[NOMBRE_BUCKET]');

-- 3. Política para UPDATE (actualizar archivos)
CREATE POLICY "Allow service role to update [NOMBRE_BUCKET_CAPITALIZADO] images"
ON storage.objects
FOR UPDATE
TO authenticated, anon, service_role
USING (bucket_id = '[NOMBRE_BUCKET]')
WITH CHECK (bucket_id = '[NOMBRE_BUCKET]');

-- 4. Política para DELETE (eliminar archivos)
CREATE POLICY "Allow service role to delete [NOMBRE_BUCKET_CAPITALIZADO] images"
ON storage.objects
FOR DELETE
TO authenticated, anon, service_role
USING (bucket_id = '[NOMBRE_BUCKET]');

-- ============================================================================
-- PASO 3: Verificación
-- ============================================================================

SELECT 
  'VERIFICACIÓN: Políticas creadas para [NOMBRE_BUCKET]' as info,
  policyname,
  cmd as operacion,
  permissive as tipo,
  roles::text as roles_permitidos,
  qual::text as condicion_using,
  with_check::text as condicion_with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND (
    qual::text LIKE '%[NOMBRE_BUCKET]%' 
    OR with_check::text LIKE '%[NOMBRE_BUCKET]%'
    OR policyname LIKE '%[NOMBRE_BUCKET]%'
  )
ORDER BY cmd, policyname;

-- ============================================================================
-- RESUMEN
-- ============================================================================

DO $$
DECLARE
  policies_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policies_count
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND (
      qual::text LIKE '%[NOMBRE_BUCKET]%' 
      OR with_check::text LIKE '%[NOMBRE_BUCKET]%'
      OR policyname LIKE '%[NOMBRE_BUCKET]%'
    );
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'POLÍTICAS CREADAS PARA [NOMBRE_BUCKET]';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total de políticas: %', policies_count;
  RAISE NOTICE '';
  
  IF policies_count = 4 THEN
    RAISE NOTICE '✅ Todas las políticas creadas correctamente (INSERT, SELECT, UPDATE, DELETE)';
  ELSE
    RAISE WARNING '⚠️  Se esperaban 4 políticas, pero se encontraron %', policies_count;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'PRÓXIMOS PASOS:';
  RAISE NOTICE '1. Reinicia el backend';
  RAISE NOTICE '2. Intenta subir un archivo al bucket [NOMBRE_BUCKET]';
  RAISE NOTICE '3. Verifica los logs si hay errores';
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- NOTAS:
-- ============================================================================
-- 1. Este template replica exactamente la estructura que funciona para
--    los buckets 'personalizacion' y 'products'
-- 2. Los roles son críticos: INSERT/UPDATE/DELETE NO incluyen 'public',
--    solo SELECT incluye 'public'
-- 3. Los nombres de las políticas deben seguir el patrón descriptivo
-- 4. Después de ejecutar, reinicia el backend para que los cambios surtan efecto
-- ============================================================================

