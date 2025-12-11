-- ============================================================================
-- SOLUCIÓN DEFINITIVA: Políticas sin restricción de roles
-- ============================================================================
-- Este script crea políticas SIN especificar roles, lo que las hace aplicables
-- a TODOS los roles por defecto, incluyendo service_role, authenticated, anon, public
-- ============================================================================

-- ============================================================================
-- PASO 1: Eliminar TODAS las políticas existentes relacionadas con 'products'
-- ============================================================================
DO $$
DECLARE
  policy_record RECORD;
  policies_deleted INTEGER := 0;
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
        OR policyname LIKE '%products%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
    policies_deleted := policies_deleted + 1;
    RAISE NOTICE 'Política eliminada: %', policy_record.policyname;
  END LOOP;
  
  RAISE NOTICE 'Total de políticas eliminadas: %', policies_deleted;
END $$;

-- ============================================================================
-- PASO 2: Crear políticas SIN restricción de roles (aplicables a TODOS)
-- ============================================================================
-- Al NO especificar "TO", la política se aplica a TODOS los roles automáticamente
-- Esto incluye: service_role, authenticated, anon, public, y cualquier otro rol

-- Política para INSERT (subir imágenes)
CREATE POLICY "products_insert_policy"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'products');

-- Política para SELECT (leer/obtener URLs públicas)
CREATE POLICY "products_select_policy"
ON storage.objects
FOR SELECT
USING (bucket_id = 'products');

-- Política para UPDATE (actualizar imágenes)
CREATE POLICY "products_update_policy"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'products')
WITH CHECK (bucket_id = 'products');

-- Política para DELETE (eliminar imágenes)
CREATE POLICY "products_delete_policy"
ON storage.objects
FOR DELETE
USING (bucket_id = 'products');

DO $$
BEGIN
  RAISE NOTICE '✅ 4 políticas creadas SIN restricción de roles';
  RAISE NOTICE 'Estas políticas aplican a TODOS los roles, incluyendo service_role';
END $$;

-- ============================================================================
-- PASO 3: Verificación detallada
-- ============================================================================

-- Verificar que las políticas se crearon
SELECT 
  'VERIFICACIÓN DE POLÍTICAS' as seccion,
  policyname as nombre_politica,
  cmd as operacion,
  permissive as tipo,
  roles::text as roles_permitidos,
  CASE 
    WHEN roles IS NULL OR array_length(roles, 1) IS NULL THEN '✅ Sin restricción (aplica a TODOS)'
    WHEN 'service_role' = ANY(roles::text[]) THEN '✅ service_role incluido'
    ELSE '⚠️ Solo roles específicos'
  END as estado_roles
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
  policies_without_restriction INTEGER;
  bucket_exists BOOLEAN;
BEGIN
  -- Contar políticas
  SELECT COUNT(*) INTO total_policies
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE '%products%';
  
  -- Contar políticas sin restricción de roles (roles IS NULL)
  SELECT COUNT(*) INTO policies_without_restriction
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE '%products%'
    AND (roles IS NULL OR array_length(roles, 1) IS NULL);
  
  -- Verificar bucket
  SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'products') INTO bucket_exists;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESUMEN DE CONFIGURACIÓN';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Bucket "products" existe: %', CASE WHEN bucket_exists THEN '✅ SÍ' ELSE '❌ NO' END;
  RAISE NOTICE 'Total de políticas: %', total_policies;
  RAISE NOTICE 'Políticas sin restricción de roles: %', policies_without_restriction;
  RAISE NOTICE '';
  
  IF total_policies = 4 AND policies_without_restriction = 4 AND bucket_exists THEN
    RAISE NOTICE '✅ CONFIGURACIÓN CORRECTA';
    RAISE NOTICE 'Las políticas aplican a TODOS los roles, incluyendo service_role.';
    RAISE NOTICE '';
    RAISE NOTICE 'PRÓXIMOS PASOS:';
    RAISE NOTICE '1. Reinicia el backend';
    RAISE NOTICE '2. Intenta subir una imagen nuevamente';
    RAISE NOTICE '3. Si aún hay problemas, verifica:';
    RAISE NOTICE '   - SUPABASE_STORAGE_BUCKET_PRODUCTS=products en .env';
    RAISE NOTICE '   - SUPABASE_SERVICE_ROLE_KEY está configurado';
    RAISE NOTICE '   - El bucket existe en el Dashboard de Supabase';
  ELSE
    RAISE WARNING '⚠️  CONFIGURACIÓN INCOMPLETA';
    IF NOT bucket_exists THEN
      RAISE WARNING 'El bucket "products" no existe. Créalo desde el Dashboard de Supabase.';
    END IF;
    IF total_policies < 4 THEN
      RAISE WARNING 'Faltan políticas. Se esperaban 4, se encontraron %.', total_policies;
    END IF;
    IF policies_without_restriction < 4 THEN
      RAISE WARNING 'Algunas políticas tienen restricción de roles. Deben estar sin restricción.';
    END IF;
  END IF;
  RAISE NOTICE '========================================';
END $$;

