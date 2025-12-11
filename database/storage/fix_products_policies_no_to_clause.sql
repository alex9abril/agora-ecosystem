-- ============================================================================
-- SOLUCIÓN: Crear políticas SIN TO clause (sin restricción de roles)
-- ============================================================================
-- Cuando no especificas TO, la política aplica a TODOS los roles por defecto
-- Esto es lo que probablemente tiene personalizacion y por eso funciona
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

-- PASO 2: Crear políticas SIN TO clause (aplican a TODOS los roles)
-- Esto es lo que probablemente tiene personalizacion

CREATE POLICY "products_insert_policy"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'products');

CREATE POLICY "products_select_policy"
ON storage.objects
FOR SELECT
USING (bucket_id = 'products');

CREATE POLICY "products_update_policy"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'products')
WITH CHECK (bucket_id = 'products');

CREATE POLICY "products_delete_policy"
ON storage.objects
FOR DELETE
USING (bucket_id = 'products');

-- PASO 3: Verificar
SELECT 
  'VERIFICACIÓN FINAL' as info,
  policyname,
  cmd as operacion,
  roles::text as roles_permitidos,
  CASE 
    WHEN roles IS NULL OR array_length(roles, 1) IS NULL THEN '✅ Sin restricción (aplica a TODOS)'
    ELSE '⚠️ Tiene restricción: ' || roles::text
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

-- PASO 4: Comparar con personalizacion
SELECT 
  'COMPARACIÓN CON personalizacion' as info,
  policyname,
  cmd as operacion,
  roles::text as roles_permitidos,
  CASE 
    WHEN roles IS NULL OR array_length(roles, 1) IS NULL THEN '✅ Sin restricción (aplica a TODOS)'
    ELSE '⚠️ Tiene restricción: ' || roles::text
  END as estado
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND (
    qual::text LIKE '%personalizacion%' 
    OR with_check::text LIKE '%personalizacion%'
    OR policyname LIKE '%personalizacion%'
  )
ORDER BY cmd;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'POLÍTICAS CREADAS SIN RESTRICCIÓN DE ROLES';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Estas políticas aplican a TODOS los roles, incluyendo service_role.';
  RAISE NOTICE '';
  RAISE NOTICE 'PRÓXIMOS PASOS:';
  RAISE NOTICE '1. Reinicia el backend';
  RAISE NOTICE '2. Intenta subir una imagen';
  RAISE NOTICE '3. Si aún no funciona, el problema NO es de políticas';
  RAISE NOTICE '========================================';
END $$;

