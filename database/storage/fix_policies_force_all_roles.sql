-- ============================================================================
-- SOLUCIÓN FORZADA: Eliminar y recrear políticas con verificación explícita
-- ============================================================================
-- Este script fuerza la eliminación de políticas y las recrea con un enfoque
-- diferente que garantiza que service_role tenga acceso
-- ============================================================================

-- ============================================================================
-- PASO 1: Verificar estado actual ANTES de eliminar
-- ============================================================================
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE '%products%';
  
  RAISE NOTICE 'Políticas existentes antes de eliminar: %', policy_count;
END $$;

-- ============================================================================
-- PASO 2: Eliminar TODAS las políticas relacionadas con 'products'
-- ============================================================================
-- Usar CASCADE para asegurar que se eliminen completamente
DO $$
DECLARE
  policy_record RECORD;
  policies_deleted INTEGER := 0;
  policy_count INTEGER;
BEGIN
  -- Primero, intentar eliminar por nombre específico
  DROP POLICY IF EXISTS "products_insert_policy" ON storage.objects CASCADE;
  DROP POLICY IF EXISTS "products_select_policy" ON storage.objects CASCADE;
  DROP POLICY IF EXISTS "products_update_policy" ON storage.objects CASCADE;
  DROP POLICY IF EXISTS "products_delete_policy" ON storage.objects CASCADE;
  
  -- Luego, eliminar cualquier otra política relacionada
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
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects CASCADE', policy_record.policyname);
      policies_deleted := policies_deleted + 1;
      RAISE NOTICE 'Política eliminada: %', policy_record.policyname;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error eliminando política %: %', policy_record.policyname, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Total de políticas eliminadas: %', policies_deleted;
  
  -- Verificar que se eliminaron
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE '%products%';
  
  RAISE NOTICE 'Políticas restantes después de eliminar: %', policy_count;
END $$;

-- Esperar un momento para asegurar que las eliminaciones se completen
DO $$
BEGIN
  PERFORM pg_sleep(0.5);
END $$;

-- ============================================================================
-- PASO 3: Crear políticas usando ALTER TABLE con políticas explícitas
-- ============================================================================
-- Intentar crear las políticas de manera más explícita

-- Política para INSERT
CREATE POLICY "products_insert_policy"
ON storage.objects
FOR INSERT
TO public, authenticated, anon, service_role
WITH CHECK (bucket_id = 'products');

-- Política para SELECT  
CREATE POLICY "products_select_policy"
ON storage.objects
FOR SELECT
TO public, authenticated, anon, service_role
USING (bucket_id = 'products');

-- Política para UPDATE
CREATE POLICY "products_update_policy"
ON storage.objects
FOR UPDATE
TO public, authenticated, anon, service_role
USING (bucket_id = 'products')
WITH CHECK (bucket_id = 'products');

-- Política para DELETE
CREATE POLICY "products_delete_policy"
ON storage.objects
FOR DELETE
TO public, authenticated, anon, service_role
USING (bucket_id = 'products');

-- ============================================================================
-- PASO 4: Verificación inmediata después de crear
-- ============================================================================
DO $$
DECLARE
  policy_record RECORD;
  has_service_role BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICACIÓN INMEDIATA DE POLÍTICAS';
  RAISE NOTICE '========================================';
  
  FOR policy_record IN 
    SELECT 
      policyname,
      cmd,
      roles::text[] as roles_array
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname LIKE '%products%'
    ORDER BY cmd
  LOOP
    has_service_role := 'service_role' = ANY(policy_record.roles_array);
    
    RAISE NOTICE 'Política: %', policy_record.policyname;
    RAISE NOTICE '  Operación: %', policy_record.cmd;
    RAISE NOTICE '  Roles: %', policy_record.roles_array::text;
    RAISE NOTICE '  Tiene service_role: %', CASE WHEN has_service_role THEN '✅ SÍ' ELSE '❌ NO' END;
    RAISE NOTICE '';
  END LOOP;
END $$;

-- ============================================================================
-- PASO 5: Si las políticas aún no tienen service_role, intentar ALTER POLICY
-- ============================================================================
-- Nota: ALTER POLICY no existe en PostgreSQL, así que recreamos las políticas
DO $$
DECLARE
  policy_has_service_role BOOLEAN;
BEGIN
  -- Verificar si alguna política tiene service_role
  SELECT EXISTS(
    SELECT 1 
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname LIKE '%products%'
      AND 'service_role' = ANY(roles::text[])
  ) INTO policy_has_service_role;
  
  IF NOT policy_has_service_role THEN
    RAISE WARNING '⚠️  Las políticas no tienen service_role. Recreando...';
    
    -- Eliminar y recrear
    DROP POLICY IF EXISTS "products_insert_policy" ON storage.objects CASCADE;
    DROP POLICY IF EXISTS "products_select_policy" ON storage.objects CASCADE;
    DROP POLICY IF EXISTS "products_update_policy" ON storage.objects CASCADE;
    DROP POLICY IF EXISTS "products_delete_policy" ON storage.objects CASCADE;
    
    -- Recrear SIN especificar roles (aplica a todos)
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
    
    RAISE NOTICE '✅ Políticas recreadas SIN restricción de roles';
  END IF;
END $$;

-- ============================================================================
-- RESUMEN FINAL
-- ============================================================================
SELECT 
  'RESUMEN FINAL' as seccion,
  policyname as nombre_politica,
  cmd as operacion,
  roles::text as roles_permitidos,
  CASE 
    WHEN roles IS NULL OR array_length(roles, 1) IS NULL THEN '✅ Sin restricción'
    WHEN 'service_role' = ANY(roles::text[]) THEN '✅ service_role incluido'
    ELSE '❌ Solo roles específicos'
  END as estado
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%products%'
ORDER BY cmd;

-- ============================================================================
-- VERIFICACIÓN DEL BUCKET
-- ============================================================================
SELECT 
  'VERIFICACIÓN DEL BUCKET' as seccion,
  id,
  name,
  public as es_publico,
  CASE 
    WHEN EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'products') 
    THEN '✅ Bucket existe'
    ELSE '❌ Bucket NO existe'
  END as estado
FROM storage.buckets
WHERE id = 'products';

