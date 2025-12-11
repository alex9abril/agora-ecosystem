-- ============================================================================
-- RECREAR POLÍTICAS DE PRODUCTS - COPIA EXACTA DE PERSONALIZACION
-- ============================================================================
-- Este script:
-- 1. Elimina TODAS las políticas existentes de products
-- 2. Recrea las políticas EXACTAMENTE como personalizacion
-- 3. Usa los mismos nombres descriptivos y la misma estructura
-- ============================================================================

-- PASO 1: Eliminar TODAS las políticas de products
DO $$
DECLARE
  policy_record RECORD;
  deleted_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Eliminando políticas existentes de products...';
  
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects'
      AND (
        qual::text LIKE '%products%' 
        OR with_check::text LIKE '%products%'
        OR policyname LIKE '%product%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
    deleted_count := deleted_count + 1;
    RAISE NOTICE 'Política eliminada: %', policy_record.policyname;
  END LOOP;
  
  RAISE NOTICE 'Total de políticas eliminadas: %', deleted_count;
END $$;

-- PASO 2: Crear políticas EXACTAMENTE como personalizacion
-- Estructura idéntica a setup_storage_policies_branding.sql

-- 1. Política para INSERT (subir imágenes de productos)
-- EXACTA COPIA de "Allow service role to upload branding images"
CREATE POLICY "Allow service role to upload product images"
ON storage.objects
FOR INSERT
TO authenticated, anon, service_role
WITH CHECK (bucket_id = 'products');

-- 2. Política para SELECT (leer/obtener URLs públicas)
-- EXACTA COPIA de "Allow public read access to branding images"
CREATE POLICY "Allow public read access to product images"
ON storage.objects
FOR SELECT
TO public, authenticated, anon, service_role
USING (bucket_id = 'products');

-- 3. Política para UPDATE (actualizar imágenes de productos)
-- EXACTA COPIA de "Allow service role to update branding images"
CREATE POLICY "Allow service role to update product images"
ON storage.objects
FOR UPDATE
TO authenticated, anon, service_role
USING (bucket_id = 'products')
WITH CHECK (bucket_id = 'products');

-- 4. Política para DELETE (eliminar imágenes de productos)
-- EXACTA COPIA de "Allow service role to delete branding images"
CREATE POLICY "Allow service role to delete product images"
ON storage.objects
FOR DELETE
TO authenticated, anon, service_role
USING (bucket_id = 'products');

-- PASO 3: Verificación detallada
SELECT 
  '=== VERIFICACIÓN: Políticas de products ===' as info,
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
    qual::text LIKE '%products%' 
    OR with_check::text LIKE '%products%'
    OR policyname LIKE '%product%'
  )
ORDER BY cmd, policyname;

-- PASO 4: Comparación lado a lado con personalizacion
SELECT 
  '=== COMPARACIÓN: personalizacion vs products ===' as info,
  CASE 
    WHEN policyname LIKE '%branding%' OR qual::text LIKE '%personalizacion%' THEN 'personalizacion (FUNCIONA)'
    WHEN policyname LIKE '%product%' OR qual::text LIKE '%products%' THEN 'products (RECREADO)'
    ELSE 'otro'
  END as bucket,
  cmd as operacion,
  policyname,
  roles::text as roles_permitidos,
  CASE 
    WHEN cmd = 'INSERT' AND 'service_role' = ANY(roles::text[]) THEN '✅ OK'
    WHEN cmd = 'SELECT' AND 'public' = ANY(roles::text[]) THEN '✅ OK'
    WHEN cmd = 'UPDATE' AND 'service_role' = ANY(roles::text[]) THEN '✅ OK'
    WHEN cmd = 'DELETE' AND 'service_role' = ANY(roles::text[]) THEN '✅ OK'
    ELSE '⚠️ Revisar'
  END as estado
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND (
    qual::text LIKE '%personalizacion%' 
    OR with_check::text LIKE '%personalizacion%'
    OR policyname LIKE '%branding%'
    OR qual::text LIKE '%products%' 
    OR with_check::text LIKE '%products%'
    OR policyname LIKE '%product%'
  )
ORDER BY cmd, bucket, policyname;

-- PASO 5: Resumen final
DO $$
DECLARE
  products_policies_count INTEGER;
  personalizacion_policies_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO products_policies_count
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND (
      qual::text LIKE '%products%' 
      OR with_check::text LIKE '%products%'
      OR policyname LIKE '%product%'
    );
  
  SELECT COUNT(*) INTO personalizacion_policies_count
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND (
      qual::text LIKE '%personalizacion%' 
      OR with_check::text LIKE '%personalizacion%'
      OR policyname LIKE '%branding%'
    );
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESUMEN FINAL';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Políticas de personalizacion: %', personalizacion_policies_count;
  RAISE NOTICE 'Políticas de products: %', products_policies_count;
  RAISE NOTICE '';
  
  IF products_policies_count = 4 AND personalizacion_policies_count = 4 THEN
    RAISE NOTICE '✅ Ambas tienen 4 políticas (INSERT, SELECT, UPDATE, DELETE)';
  ELSE
    RAISE WARNING '⚠️  Número de políticas no coincide';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'PRÓXIMOS PASOS:';
  RAISE NOTICE '1. Reinicia el backend';
  RAISE NOTICE '2. Intenta subir una imagen';
  RAISE NOTICE '3. Si no funciona, verifica los logs del backend';
  RAISE NOTICE '========================================';
END $$;

