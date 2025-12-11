-- ============================================================================
-- COPIAR EXACTAMENTE las políticas de personalizacion a products
-- ============================================================================
-- personalizacion tiene:
-- - INSERT, UPDATE, DELETE: anon, authenticated, service_role (SIN public)
-- - SELECT: public
-- ============================================================================

-- PASO 1: Eliminar todas las políticas de products
DO $$
DECLARE
  policy_record RECORD;
BEGIN
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

-- PASO 2: Crear políticas EXACTAMENTE como personalizacion
-- INSERT: anon, authenticated, service_role (SIN public)
CREATE POLICY "Allow service role to upload product images"
ON storage.objects
FOR INSERT
TO anon, authenticated, service_role
WITH CHECK (bucket_id = 'products');

-- SELECT: public (para acceso público a las imágenes)
CREATE POLICY "Allow public read access to product images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'products');

-- UPDATE: anon, authenticated, service_role (SIN public)
CREATE POLICY "Allow service role to update product images"
ON storage.objects
FOR UPDATE
TO anon, authenticated, service_role
USING (bucket_id = 'products')
WITH CHECK (bucket_id = 'products');

-- DELETE: anon, authenticated, service_role (SIN public)
CREATE POLICY "Allow service role to delete product images"
ON storage.objects
FOR DELETE
TO anon, authenticated, service_role
USING (bucket_id = 'products');

-- PASO 3: Verificación
SELECT 
  'VERIFICACIÓN: products' as info,
  policyname,
  cmd as operacion,
  roles::text as roles_permitidos,
  CASE 
    WHEN cmd IN ('INSERT', 'UPDATE', 'DELETE') AND 'service_role' = ANY(roles::text[]) THEN '✅ Correcto (tiene service_role)'
    WHEN cmd = 'SELECT' AND 'public' = ANY(roles::text[]) THEN '✅ Correcto (SELECT es público)'
    ELSE '❌ Incorrecto'
  END as estado
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND (
    qual::text LIKE '%products%' 
    OR with_check::text LIKE '%products%'
    OR policyname LIKE '%product%'
  )
ORDER BY cmd;

-- PASO 4: Comparación final
DO $$
DECLARE
  products_insert_roles TEXT;
  personalizacion_insert_roles TEXT;
  products_select_roles TEXT;
  personalizacion_select_roles TEXT;
BEGIN
  -- Obtener roles de INSERT
  SELECT roles::text INTO products_insert_roles
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND cmd = 'INSERT'
    AND (qual::text LIKE '%products%' OR with_check::text LIKE '%products%')
  LIMIT 1;
  
  SELECT roles::text INTO personalizacion_insert_roles
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND cmd = 'INSERT'
    AND (qual::text LIKE '%personalizacion%' OR with_check::text LIKE '%personalizacion%')
  LIMIT 1;
  
  -- Obtener roles de SELECT
  SELECT roles::text INTO products_select_roles
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND cmd = 'SELECT'
    AND (qual::text LIKE '%products%' OR qual::text LIKE '%products%')
  LIMIT 1;
  
  SELECT roles::text INTO personalizacion_select_roles
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND cmd = 'SELECT'
    AND (qual::text LIKE '%personalizacion%' OR qual::text LIKE '%personalizacion%')
  LIMIT 1;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'COMPARACIÓN FINAL';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'INSERT:';
  RAISE NOTICE '  products: %', products_insert_roles;
  RAISE NOTICE '  personalizacion: %', personalizacion_insert_roles;
  RAISE NOTICE '';
  RAISE NOTICE 'SELECT:';
  RAISE NOTICE '  products: %', products_select_roles;
  RAISE NOTICE '  personalizacion: %', personalizacion_select_roles;
  RAISE NOTICE '';
  
  IF products_insert_roles = personalizacion_insert_roles 
     AND products_select_roles = personalizacion_select_roles THEN
    RAISE NOTICE '✅ Las políticas son IDÉNTICAS';
    RAISE NOTICE 'Ahora deberían funcionar igual.';
  ELSE
    RAISE WARNING '⚠️  Las políticas son DIFERENTES';
    RAISE WARNING 'Revisa manualmente.';
  END IF;
  RAISE NOTICE '========================================';
END $$;

