-- ============================================================================
-- Corregir políticas RLS para incluir explícitamente service_role
-- ============================================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS products_insert_policy ON storage.objects;
DROP POLICY IF EXISTS products_select_policy ON storage.objects;
DROP POLICY IF EXISTS products_update_policy ON storage.objects;
DROP POLICY IF EXISTS products_delete_policy ON storage.objects;

-- Crear políticas con service_role explícitamente incluido
-- Política para INSERT (subir archivos)
CREATE POLICY products_insert_policy
ON storage.objects
FOR INSERT
TO public, authenticated, anon, service_role
WITH CHECK (bucket_id = 'products');

-- Política para SELECT (leer archivos)
CREATE POLICY products_select_policy
ON storage.objects
FOR SELECT
TO public, authenticated, anon, service_role
USING (bucket_id = 'products');

-- Política para UPDATE (actualizar archivos)
CREATE POLICY products_update_policy
ON storage.objects
FOR UPDATE
TO public, authenticated, anon, service_role
USING (bucket_id = 'products')
WITH CHECK (bucket_id = 'products');

-- Política para DELETE (eliminar archivos)
CREATE POLICY products_delete_policy
ON storage.objects
FOR DELETE
TO public, authenticated, anon, service_role
USING (bucket_id = 'products');

-- Verificar políticas creadas
SELECT 
  'POLÍTICAS ACTUALIZADAS' as tipo,
  policyname,
  cmd as operacion,
  roles::text as roles_permitidos
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE 'products_%'
ORDER BY cmd;

-- Resumen
DO $$
DECLARE
  total_policies INTEGER;
  policies_with_service_role INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_policies
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE 'products_%';
  
  SELECT COUNT(*) INTO policies_with_service_role
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE 'products_%'
    AND 'service_role' = ANY(roles::text[]);
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'POLÍTICAS ACTUALIZADAS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total de políticas: %', total_policies;
  RAISE NOTICE 'Políticas con service_role: %', policies_with_service_role;
  RAISE NOTICE '';
  
  IF total_policies = 4 AND policies_with_service_role = 4 THEN
    RAISE NOTICE '✅ TODAS LAS POLÍTICAS INCLUYEN service_role';
  ELSE
    RAISE WARNING '⚠️  ALGUNAS POLÍTICAS NO INCLUYEN service_role';
  END IF;
  RAISE NOTICE '========================================';
END $$;

