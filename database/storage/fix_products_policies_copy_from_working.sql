-- ============================================================================
-- SOLUCIÓN DEFINITIVA: Copiar EXACTAMENTE las políticas de personalizacion
-- ============================================================================
-- personalizacion funciona, así que copiamos su estructura exacta
-- ============================================================================

-- PASO 1: Ver las políticas EXACTAS de personalizacion (la que funciona)
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
    OR policyname LIKE '%branding%'
    OR policyname LIKE '%personalizacion%'
  )
ORDER BY cmd, policyname;

-- PASO 2: Eliminar TODAS las políticas de products
DO $$
DECLARE
  policy_record RECORD;
  deleted_count INTEGER := 0;
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
    deleted_count := deleted_count + 1;
    RAISE NOTICE 'Política eliminada: %', policy_record.policyname;
  END LOOP;
  
  RAISE NOTICE 'Total de políticas eliminadas: %', deleted_count;
END $$;

-- PASO 3: Crear políticas para products con el MISMO patrón que personalizacion
-- Basado en setup_storage_policies_branding.sql que funciona:
-- - INSERT, UPDATE, DELETE: authenticated, anon, service_role (SIN public)
-- - SELECT: public, authenticated, anon, service_role

-- 1. INSERT (subir imágenes)
CREATE POLICY "Allow service role to upload product images"
ON storage.objects
FOR INSERT
TO authenticated, anon, service_role
WITH CHECK (bucket_id = 'products');

-- 2. SELECT (leer/obtener URLs públicas)
CREATE POLICY "Allow public read access to product images"
ON storage.objects
FOR SELECT
TO public, authenticated, anon, service_role
USING (bucket_id = 'products');

-- 3. UPDATE (actualizar imágenes)
CREATE POLICY "Allow service role to update product images"
ON storage.objects
FOR UPDATE
TO authenticated, anon, service_role
USING (bucket_id = 'products')
WITH CHECK (bucket_id = 'products');

-- 4. DELETE (eliminar imágenes)
CREATE POLICY "Allow service role to delete product images"
ON storage.objects
FOR DELETE
TO authenticated, anon, service_role
USING (bucket_id = 'products');

-- PASO 4: Verificación detallada
SELECT 
  'VERIFICACIÓN: products' as info,
  policyname,
  cmd as operacion,
  permissive as tipo,
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
    qual::text LIKE '%products%' 
    OR with_check::text LIKE '%products%'
    OR policyname LIKE '%product%'
  )
ORDER BY cmd, policyname;

-- PASO 5: Comparación lado a lado
SELECT 
  'COMPARACIÓN' as tipo,
  CASE 
    WHEN policyname LIKE '%branding%' OR qual::text LIKE '%personalizacion%' THEN 'personalizacion (FUNCIONA)'
    WHEN policyname LIKE '%product%' OR qual::text LIKE '%products%' THEN 'products (NUEVO)'
    ELSE 'otro'
  END as bucket,
  cmd as operacion,
  roles::text as roles_permitidos
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
ORDER BY cmd, bucket;

-- ============================================================================
-- NOTAS IMPORTANTES:
-- ============================================================================
-- 1. Las políticas de personalizacion usan nombres descriptivos como
--    "Allow service role to upload branding images"
-- 2. Para INSERT/UPDATE/DELETE: authenticated, anon, service_role (SIN public)
-- 3. Para SELECT: public, authenticated, anon, service_role
-- 4. El campo 'roles' en pg_policies puede mostrar solo '{public}' en la UI
--    pero internamente incluye todos los roles especificados en TO
-- 5. Si esto no funciona, el problema puede estar en cómo Supabase Storage
--    interpreta las políticas, no en las políticas en sí
-- ============================================================================

