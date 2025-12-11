-- ============================================================================
-- COPIAR EXACTAMENTE las políticas de personalizacion a products
-- ============================================================================

-- PASO 1: Ver las políticas EXACTAS de personalizacion
SELECT 
  'POLÍTICAS DE personalizacion (FUNCIONA)' as info,
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
    qual::text LIKE '%personalizacion%' 
    OR with_check::text LIKE '%personalizacion%'
    OR policyname LIKE '%personalizacion%'
  )
ORDER BY cmd;

-- PASO 2: Eliminar políticas actuales de products
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

-- PASO 3: Crear políticas para products con el MISMO patrón que personalizacion
-- Basado en las políticas comunes de Supabase Storage, típicamente incluyen:
-- public, authenticated, anon, service_role

CREATE POLICY "products_insert_policy"
ON storage.objects
FOR INSERT
TO public, authenticated, anon, service_role
WITH CHECK (bucket_id = 'products');

CREATE POLICY "products_select_policy"
ON storage.objects
FOR SELECT
TO public, authenticated, anon, service_role
USING (bucket_id = 'products');

CREATE POLICY "products_update_policy"
ON storage.objects
FOR UPDATE
TO public, authenticated, anon, service_role
USING (bucket_id = 'products')
WITH CHECK (bucket_id = 'products');

CREATE POLICY "products_delete_policy"
ON storage.objects
FOR DELETE
TO public, authenticated, anon, service_role
USING (bucket_id = 'products');

-- PASO 4: Verificar que ahora tienen la misma estructura
SELECT 
  'VERIFICACIÓN: products' as info,
  policyname,
  cmd as operacion,
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

-- PASO 5: Comparación final
DO $$
DECLARE
  personalizacion_roles TEXT;
  products_roles TEXT;
BEGIN
  -- Obtener roles de personalizacion (INSERT)
  SELECT roles::text INTO personalizacion_roles
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND cmd = 'INSERT'
    AND (qual::text LIKE '%personalizacion%' OR with_check::text LIKE '%personalizacion%')
  LIMIT 1;
  
  -- Obtener roles de products (INSERT)
  SELECT roles::text INTO products_roles
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND cmd = 'INSERT'
    AND (qual::text LIKE '%products%' OR with_check::text LIKE '%products%')
  LIMIT 1;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'COMPARACIÓN FINAL';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'personalizacion (INSERT) roles: %', personalizacion_roles;
  RAISE NOTICE 'products (INSERT) roles: %', products_roles;
  RAISE NOTICE '';
  
  IF personalizacion_roles = products_roles THEN
    RAISE NOTICE '✅ Las políticas tienen los MISMOS roles';
    RAISE NOTICE 'Ahora deberían funcionar igual.';
  ELSE
    RAISE WARNING '⚠️  Las políticas tienen roles DIFERENTES';
    RAISE WARNING 'Revisa manualmente las políticas de personalizacion y cópialas exactamente.';
  END IF;
  RAISE NOTICE '========================================';
END $$;

