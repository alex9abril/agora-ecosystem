-- ============================================================================
-- DIAGNÓSTICO PASO A PASO: Comparar buckets y corregir
-- ============================================================================

-- PASO 1: Verificar qué buckets existen
SELECT 
  'PASO 1: BUCKETS EXISTENTES' as paso,
  id,
  name,
  public as es_publico,
  file_size_limit,
  created_at
FROM storage.buckets
ORDER BY created_at;

-- PASO 2: Verificar políticas del bucket que FUNCIONA (personalizacion)
SELECT 
  'PASO 2: POLÍTICAS DE personalizacion (FUNCIONA)' as paso,
  policyname,
  cmd as operacion,
  permissive as tipo,
  roles::text as roles_permitidos
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND (
    qual::text LIKE '%personalizacion%' 
    OR with_check::text LIKE '%personalizacion%'
    OR policyname LIKE '%personalizacion%'
  )
ORDER BY cmd;

-- PASO 3: Verificar políticas del bucket que NO FUNCIONA (products)
SELECT 
  'PASO 3: POLÍTICAS DE products (NO FUNCIONA)' as paso,
  policyname,
  cmd as operacion,
  permissive as tipo,
  roles::text as roles_permitidos
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND (
    qual::text LIKE '%products%' 
    OR with_check::text LIKE '%products%'
    OR policyname LIKE '%product%'
  )
ORDER BY cmd;

-- PASO 4: Eliminar políticas de products y copiar el patrón de personalizacion
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  -- Eliminar todas las políticas de products
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
    RAISE NOTICE 'Política eliminada: %', policy_record.policyname;
  END LOOP;
END $$;

-- PASO 5: Crear políticas para products usando el MISMO patrón que personalizacion
-- (sin restricción de roles, igual que personalizacion)

CREATE POLICY "products_allow_all_insert"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'products');

CREATE POLICY "products_allow_all_select"
ON storage.objects
FOR SELECT
USING (bucket_id = 'products');

CREATE POLICY "products_allow_all_update"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'products')
WITH CHECK (bucket_id = 'products');

CREATE POLICY "products_allow_all_delete"
ON storage.objects
FOR DELETE
USING (bucket_id = 'products');

-- PASO 6: Verificación final
SELECT 
  'PASO 6: VERIFICACIÓN FINAL' as paso,
  'products' as bucket,
  COUNT(*) as total_politicas,
  COUNT(CASE WHEN roles IS NULL OR array_length(roles, 1) IS NULL THEN 1 END) as politicas_sin_restriccion
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND (
    qual::text LIKE '%products%' 
    OR with_check::text LIKE '%products%'
    OR policyname LIKE '%product%'
  );

-- Comparar con personalizacion
SELECT 
  'COMPARACIÓN CON personalizacion' as paso,
  'personalizacion' as bucket,
  COUNT(*) as total_politicas,
  COUNT(CASE WHEN roles IS NULL OR array_length(roles, 1) IS NULL THEN 1 END) as politicas_sin_restriccion
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND (
    qual::text LIKE '%personalizacion%' 
    OR with_check::text LIKE '%personalizacion%'
    OR policyname LIKE '%personalizacion%'
  );

