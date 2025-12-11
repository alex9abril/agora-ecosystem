-- ============================================================================
-- CORRECCIÓN: Políticas de Storage SIN restricción de roles
-- ============================================================================
-- Las políticas actuales solo tienen 'public'. Vamos a crear políticas
-- SIN especificar roles, lo que las hace aplicables a TODOS los roles
-- incluyendo service_role, authenticated, anon, y public
-- ============================================================================

-- Eliminar las políticas actuales que solo tienen 'public'
DROP POLICY IF EXISTS "products_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "products_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "products_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "products_delete_policy" ON storage.objects;

-- ============================================================================
-- Crear políticas NUEVAS SIN restricción de roles
-- ============================================================================
-- Al no especificar "TO", la política se aplica a TODOS los roles
-- Esto incluye: public, authenticated, anon, service_role, etc.

-- Política para INSERT - Sin restricción de roles (aplica a todos)
CREATE POLICY "products_insert_policy"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'products');

-- Política para SELECT - Sin restricción de roles (aplica a todos)
CREATE POLICY "products_select_policy"
ON storage.objects
FOR SELECT
USING (bucket_id = 'products');

-- Política para UPDATE - Sin restricción de roles (aplica a todos)
CREATE POLICY "products_update_policy"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'products')
WITH CHECK (bucket_id = 'products');

-- Política para DELETE - Sin restricción de roles (aplica a todos)
CREATE POLICY "products_delete_policy"
ON storage.objects
FOR DELETE
USING (bucket_id = 'products');

-- ============================================================================
-- Verificar que las políticas se crearon correctamente
-- ============================================================================
SELECT 
  policyname,
  cmd as operacion,
  permissive as tipo,
  roles::text as roles_permitidos,
  CASE 
    WHEN roles::text[] @> ARRAY['service_role']::text[] THEN '✅ service_role incluido'
    WHEN roles::text[] @> ARRAY['public']::text[] THEN '✅ public incluido (puede funcionar)'
    ELSE '❌ Verificar roles'
  END as estado
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%products%'
ORDER BY cmd, policyname;

-- ============================================================================
-- NOTA IMPORTANTE:
-- ============================================================================
-- Si las políticas aún no muestran service_role explícitamente, puede ser
-- que Supabase Storage use un sistema diferente. En ese caso, las políticas
-- sin restricción de roles deberían funcionar para service_role también.
-- ============================================================================

