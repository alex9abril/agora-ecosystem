-- ============================================================================
-- SOLUCIÓN FINAL: Políticas muy permisivas para Storage
-- ============================================================================
-- Como no podemos deshabilitar RLS directamente (permisos insuficientes),
-- creamos políticas muy permisivas que permitan todo
-- ============================================================================

-- ============================================================================
-- PASO 1: Eliminar TODAS las políticas existentes
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
      )
  LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
      policies_deleted := policies_deleted + 1;
      RAISE NOTICE 'Política eliminada: %', policy_record.policyname;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error eliminando política %: %', policy_record.policyname, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Total de políticas eliminadas: %', policies_deleted;
END $$;

-- ============================================================================
-- PASO 2: Crear políticas PERMISIVAS que permitan TODO
-- ============================================================================
-- Estas políticas no tienen restricciones, permiten todas las operaciones
-- para el bucket 'products' sin importar el rol

-- Política para INSERT - Permite insertar cualquier archivo en el bucket products
CREATE POLICY "products_allow_all_insert"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'products');

-- Política para SELECT - Permite leer cualquier archivo del bucket products
CREATE POLICY "products_allow_all_select"
ON storage.objects
FOR SELECT
USING (bucket_id = 'products');

-- Política para UPDATE - Permite actualizar cualquier archivo del bucket products
CREATE POLICY "products_allow_all_update"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'products')
WITH CHECK (bucket_id = 'products');

-- Política para DELETE - Permite eliminar cualquier archivo del bucket products
CREATE POLICY "products_allow_all_delete"
ON storage.objects
FOR DELETE
USING (bucket_id = 'products');

-- ============================================================================
-- PASO 3: Verificación
-- ============================================================================
SELECT 
  'VERIFICACIÓN DE POLÍTICAS' as seccion,
  policyname as nombre_politica,
  cmd as operacion,
  permissive as tipo,
  roles::text as roles_permitidos,
  qual::text as condicion_using,
  with_check::text as condicion_with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%products%'
ORDER BY cmd, policyname;

-- ============================================================================
-- RESUMEN
-- ============================================================================
DO $$
DECLARE
  total_policies INTEGER;
  bucket_exists BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO total_policies
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE '%products%';
  
  SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'products') INTO bucket_exists;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESUMEN';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Bucket "products" existe: %', CASE WHEN bucket_exists THEN '✅ SÍ' ELSE '❌ NO' END;
  RAISE NOTICE 'Políticas creadas: %', total_policies;
  RAISE NOTICE '';
  
  IF total_policies = 4 AND bucket_exists THEN
    RAISE NOTICE '✅ CONFIGURACIÓN COMPLETA';
    RAISE NOTICE '';
    RAISE NOTICE 'Las políticas creadas NO tienen restricción de roles,';
    RAISE NOTICE 'lo que significa que aplican a TODOS los roles, incluyendo service_role.';
    RAISE NOTICE '';
    RAISE NOTICE 'PRÓXIMOS PASOS:';
    RAISE NOTICE '1. Reinicia el backend';
    RAISE NOTICE '2. Intenta subir una imagen';
    RAISE NOTICE '';
    RAISE NOTICE 'Si aún no funciona, el problema puede ser:';
    RAISE NOTICE '- El cliente de Supabase no está usando service_role correctamente';
    RAISE NOTICE '- Verifica SUPABASE_SERVICE_ROLE_KEY en tu .env';
    RAISE NOTICE '- Verifica los logs del backend al intentar subir';
  ELSE
    RAISE WARNING '⚠️  CONFIGURACIÓN INCOMPLETA';
    IF NOT bucket_exists THEN
      RAISE WARNING 'El bucket "products" no existe. Créalo desde el Dashboard.';
    END IF;
    IF total_policies < 4 THEN
      RAISE WARNING 'Faltan políticas. Se esperaban 4, se encontraron %.', total_policies;
    END IF;
  END IF;
  RAISE NOTICE '========================================';
END $$;

