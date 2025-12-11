-- ============================================================================
-- Script de VERIFICACIÓN y CORRECCIÓN de políticas de Storage
-- ============================================================================
-- Este script verifica el estado actual y corrige cualquier problema
-- ============================================================================

-- ============================================================================
-- VERIFICACIÓN 1: Estado del bucket
-- ============================================================================
SELECT 
  'VERIFICACIÓN 1: Estado del Bucket' as seccion,
  id as bucket_id,
  public as es_publico,
  file_size_limit as limite_tamaño,
  CASE 
    WHEN public THEN '✅ Bucket público - URLs públicas funcionarán'
    ELSE '⚠️ Bucket privado - Necesitarás URLs firmadas'
  END as estado
FROM storage.buckets
WHERE id = 'products';

-- ============================================================================
-- VERIFICACIÓN 2: Políticas existentes
-- ============================================================================
SELECT 
  'VERIFICACIÓN 2: Políticas Existentes' as seccion,
  policyname,
  cmd as operacion,
  permissive as tipo,
  roles::text as roles_permitidos,
  CASE 
    WHEN 'service_role' = ANY(roles::text[]) THEN '✅ service_role incluido'
    ELSE '❌ service_role NO incluido'
  END as tiene_service_role
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
-- CORRECCIÓN: Eliminar políticas problemáticas y crear nuevas
-- ============================================================================

-- Eliminar TODAS las políticas relacionadas con products
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
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
      deleted_count := deleted_count + 1;
      RAISE NOTICE 'Política eliminada: %', policy_record.policyname;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error eliminando política %: %', policy_record.policyname, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Total de políticas eliminadas: %', deleted_count;
END $$;

-- ============================================================================
-- CREAR POLÍTICAS NUEVAS - MÁXIMA PERMISIVIDAD
-- ============================================================================

-- Política para INSERT - SIN restricción de roles (permite a todos incluyendo service_role)
DROP POLICY IF EXISTS "products_insert_policy" ON storage.objects;
CREATE POLICY "products_insert_policy"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'products');

-- Política para SELECT - SIN restricción de roles (permite a todos incluyendo service_role)
DROP POLICY IF EXISTS "products_select_policy" ON storage.objects;
CREATE POLICY "products_select_policy"
ON storage.objects
FOR SELECT
USING (bucket_id = 'products');

-- Política para UPDATE - SIN restricción de roles (permite a todos incluyendo service_role)
DROP POLICY IF EXISTS "products_update_policy" ON storage.objects;
CREATE POLICY "products_update_policy"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'products')
WITH CHECK (bucket_id = 'products');

-- Política para DELETE - SIN restricción de roles (permite a todos incluyendo service_role)
DROP POLICY IF EXISTS "products_delete_policy" ON storage.objects;
CREATE POLICY "products_delete_policy"
ON storage.objects
FOR DELETE
USING (bucket_id = 'products');

-- ============================================================================
-- VERIFICACIÓN FINAL: Confirmar que las políticas están correctas
-- ============================================================================
SELECT 
  'VERIFICACIÓN FINAL: Políticas Creadas' as seccion,
  policyname,
  cmd as operacion,
  permissive as tipo,
  roles::text as roles_permitidos,
  CASE 
    WHEN 'service_role' = ANY(roles::text[]) THEN '✅'
    ELSE '❌'
  END as service_role_ok
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%products%'
ORDER BY cmd, policyname;

-- ============================================================================
-- RESUMEN EJECUTIVO
-- ============================================================================
DO $$
DECLARE
  total_policies INTEGER;
  policies_with_service_role INTEGER;
  bucket_exists BOOLEAN;
  bucket_public BOOLEAN;
BEGIN
  -- Contar políticas
  SELECT COUNT(*) INTO total_policies
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE '%products%';
  
  -- Contar políticas con service_role
  SELECT COUNT(*) INTO policies_with_service_role
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE '%products%'
    AND 'service_role' = ANY(roles::text[]);
  
  -- Verificar bucket
  SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'products') INTO bucket_exists;
  SELECT public INTO bucket_public FROM storage.buckets WHERE id = 'products';
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESUMEN EJECUTIVO';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Bucket "products" existe: %', CASE WHEN bucket_exists THEN '✅ SÍ' ELSE '❌ NO' END;
  RAISE NOTICE 'Bucket es público: %', CASE WHEN bucket_public THEN '✅ SÍ' ELSE '❌ NO' END;
  RAISE NOTICE 'Total de políticas: %', total_policies;
  RAISE NOTICE 'Políticas con service_role: %', policies_with_service_role;
  RAISE NOTICE '';
  
  IF total_policies = 4 AND policies_with_service_role = 4 AND bucket_exists AND bucket_public THEN
    RAISE NOTICE '✅ CONFIGURACIÓN CORRECTA';
    RAISE NOTICE 'El bucket está listo para recibir archivos.';
    RAISE NOTICE 'Reinicia el backend y prueba subir una imagen.';
  ELSE
    RAISE WARNING '⚠️  CONFIGURACIÓN INCOMPLETA';
    IF total_policies < 4 THEN
      RAISE WARNING 'Faltan políticas. Se esperaban 4, se encontraron %.', total_policies;
    END IF;
    IF policies_with_service_role < 4 THEN
      RAISE WARNING 'Algunas políticas no incluyen service_role.';
    END IF;
    IF NOT bucket_public THEN
      RAISE WARNING 'El bucket no es público. Las URLs públicas pueden no funcionar.';
    END IF;
  END IF;
  RAISE NOTICE '========================================';
END $$;

