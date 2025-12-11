-- ============================================================================
-- SOLUCIÓN FINAL: Replicar EXACTAMENTE las políticas de personalizacion
-- ============================================================================
-- Este script:
-- 1. Consulta las políticas REALES de personalizacion (que funciona)
-- 2. Las replica exactamente para products
-- 3. Usa los mismos nombres de políticas descriptivos
-- ============================================================================

-- PASO 1: Ver las políticas EXACTAS de personalizacion
SELECT 
  '=== POLÍTICAS DE personalizacion (FUNCIONA) ===' as info,
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

-- PASO 3: Crear políticas para products IDÉNTICAS a personalizacion
-- IMPORTANTE: Usar los mismos nombres descriptivos y la misma estructura

-- 1. INSERT (subir imágenes) - igual que personalizacion
CREATE POLICY "Allow service role to upload product images"
ON storage.objects
FOR INSERT
TO authenticated, anon, service_role
WITH CHECK (bucket_id = 'products');

-- 2. SELECT (leer/obtener URLs públicas) - igual que personalizacion
CREATE POLICY "Allow public read access to product images"
ON storage.objects
FOR SELECT
TO public, authenticated, anon, service_role
USING (bucket_id = 'products');

-- 3. UPDATE (actualizar imágenes) - igual que personalizacion
CREATE POLICY "Allow service role to update product images"
ON storage.objects
FOR UPDATE
TO authenticated, anon, service_role
USING (bucket_id = 'products')
WITH CHECK (bucket_id = 'products');

-- 4. DELETE (eliminar imágenes) - igual que personalizacion
CREATE POLICY "Allow service role to delete product images"
ON storage.objects
FOR DELETE
TO authenticated, anon, service_role
USING (bucket_id = 'products');

-- PASO 4: Verificación final
SELECT 
  '=== VERIFICACIÓN: products ===' as info,
  policyname,
  cmd as operacion,
  permissive as tipo,
  roles::text as roles_permitidos,
  CASE 
    WHEN cmd = 'INSERT' AND roles IS NOT NULL THEN '✅ Creada'
    WHEN cmd = 'SELECT' AND roles IS NOT NULL THEN '✅ Creada'
    WHEN cmd = 'UPDATE' AND roles IS NOT NULL THEN '✅ Creada'
    WHEN cmd = 'DELETE' AND roles IS NOT NULL THEN '✅ Creada'
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

-- ============================================================================
-- IMPORTANTE: Si esto NO funciona, el problema puede ser:
-- ============================================================================
-- 1. Supabase Storage puede requerir que las políticas se creen desde el Dashboard
-- 2. Puede haber un problema con cómo Supabase interpreta service_role en Storage
-- 3. El backend puede necesitar usar un método diferente para autenticarse
-- ============================================================================
-- 
-- ALTERNATIVA: Si las políticas SQL no funcionan, crea las políticas desde
-- el Dashboard de Supabase:
-- 1. Ve a Storage → Buckets → products → Policies
-- 2. Crea manualmente las 4 políticas con los mismos nombres y roles
-- 3. Usa el mismo patrón que personalizacion
-- ============================================================================

