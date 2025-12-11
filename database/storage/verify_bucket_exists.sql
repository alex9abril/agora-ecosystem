-- ============================================================================
-- Script de VERIFICACIÓN: Verificar si el bucket 'products' existe
-- ============================================================================
-- Este script verifica el estado completo del bucket y sus políticas
-- ============================================================================

-- Verificar si el bucket existe en storage.buckets
SELECT 
  'VERIFICACIÓN DEL BUCKET' as tipo,
  CASE 
    WHEN EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'products') 
    THEN '✅ El bucket "products" EXISTE en storage.buckets'
    ELSE '❌ El bucket "products" NO EXISTE en storage.buckets'
  END as estado,
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at,
  updated_at
FROM storage.buckets
WHERE id = 'products';

-- Si no existe, mostrar todos los buckets disponibles
SELECT 
  'BUCKETS DISPONIBLES' as tipo,
  id,
  name,
  public,
  created_at
FROM storage.buckets
ORDER BY created_at DESC;

-- Verificar políticas RLS para el bucket 'products'
SELECT 
  'POLÍTICAS RLS' as tipo,
  policyname,
  cmd as operacion,
  permissive as tipo_politica,
  roles::text as roles_permitidos,
  qual::text as condicion_using,
  with_check::text as condicion_with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND (
    qual::text LIKE '%products%' 
    OR with_check::text LIKE '%products%'
    OR policyname LIKE '%product%'
    OR policyname LIKE '%products%'
  )
ORDER BY cmd, policyname;

-- Resumen final
DO $$
DECLARE
  bucket_exists BOOLEAN;
  bucket_public BOOLEAN;
  total_policies INTEGER;
  policies_with_service_role INTEGER;
BEGIN
  -- Verificar bucket
  SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'products') INTO bucket_exists;
  
  IF bucket_exists THEN
    SELECT public INTO bucket_public FROM storage.buckets WHERE id = 'products';
  ELSE
    bucket_public := false;
  END IF;
  
  -- Contar políticas
  SELECT COUNT(*) INTO total_policies
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND (
      qual::text LIKE '%products%' 
      OR with_check::text LIKE '%products%'
      OR policyname LIKE '%product%'
      OR policyname LIKE '%products%'
    );
  
  -- Contar políticas con service_role
  SELECT COUNT(*) INTO policies_with_service_role
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND (
      qual::text LIKE '%products%' 
      OR with_check::text LIKE '%products%'
      OR policyname LIKE '%product%'
      OR policyname LIKE '%products%'
    )
    AND 'service_role' = ANY(roles::text[]);
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESUMEN DE VERIFICACIÓN';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Bucket "products" existe: %', CASE WHEN bucket_exists THEN '✅ SÍ' ELSE '❌ NO' END;
  
  IF bucket_exists THEN
    RAISE NOTICE 'Bucket es público: %', CASE WHEN bucket_public THEN '✅ SÍ' ELSE '❌ NO' END;
  END IF;
  
  RAISE NOTICE 'Total de políticas: %', total_policies;
  RAISE NOTICE 'Políticas con service_role: %', policies_with_service_role;
  RAISE NOTICE '';
  
  IF NOT bucket_exists THEN
    RAISE WARNING '⚠️  EL BUCKET NO EXISTE';
    RAISE NOTICE '';
    RAISE NOTICE 'SOLUCIÓN:';
    RAISE NOTICE '1. Ve al Dashboard de Supabase → Storage';
    RAISE NOTICE '2. Haz clic en "New bucket"';
    RAISE NOTICE '3. Nombre: products';
    RAISE NOTICE '4. Marca "Public bucket"';
    RAISE NOTICE '5. Haz clic en "Create bucket"';
    RAISE NOTICE '6. Luego ejecuta: create_and_configure_products_bucket.sql (solo las políticas)';
  ELSIF total_policies < 4 THEN
    RAISE WARNING '⚠️  FALTAN POLÍTICAS';
    RAISE NOTICE 'Ejecuta: create_and_configure_products_bucket.sql';
  ELSIF NOT bucket_public THEN
    RAISE WARNING '⚠️  EL BUCKET NO ES PÚBLICO';
    RAISE NOTICE 'Actualiza el bucket para que sea público desde el Dashboard';
  ELSE
    RAISE NOTICE '✅ CONFIGURACIÓN CORRECTA';
    RAISE NOTICE 'Si aún tienes problemas, verifica:';
    RAISE NOTICE '1. Que SUPABASE_STORAGE_BUCKET_PRODUCTS=products en tu .env';
    RAISE NOTICE '2. Que SUPABASE_SERVICE_ROLE_KEY esté configurado correctamente';
    RAISE NOTICE '3. Que hayas reiniciado el backend después de los cambios';
  END IF;
  RAISE NOTICE '========================================';
END $$;

