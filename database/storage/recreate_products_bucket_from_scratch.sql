-- ============================================================================
-- SCRIPT AGRESIVO: Eliminar y recrear el bucket 'products' desde cero
-- ============================================================================
-- Este script:
-- 1. Elimina TODOS los objetos del bucket (si existe)
-- 2. Elimina el bucket completamente
-- 3. Elimina TODAS las políticas relacionadas
-- 4. Crea el bucket desde cero
-- 5. Configura las políticas RLS correctamente
-- ============================================================================

-- PASO 1: Eliminar TODOS los objetos del bucket (si existen)
DO $$
DECLARE
  object_record RECORD;
  deleted_count INTEGER := 0;
BEGIN
  -- Eliminar todos los objetos del bucket 'products'
  FOR object_record IN 
    SELECT name 
    FROM storage.objects 
    WHERE bucket_id = 'products'
  LOOP
    DELETE FROM storage.objects 
    WHERE bucket_id = 'products' AND name = object_record.name;
    deleted_count := deleted_count + 1;
  END LOOP;
  
  IF deleted_count > 0 THEN
    RAISE NOTICE '✅ Eliminados % objetos del bucket "products"', deleted_count;
  ELSE
    RAISE NOTICE 'ℹ️  No había objetos en el bucket "products"';
  END IF;
END $$;

-- PASO 2: Eliminar el bucket completamente
DO $$
DECLARE
  bucket_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'products') INTO bucket_exists;
  
  IF bucket_exists THEN
    DELETE FROM storage.buckets WHERE id = 'products';
    RAISE NOTICE '✅ Bucket "products" eliminado completamente';
  ELSE
    RAISE NOTICE 'ℹ️  El bucket "products" no existía';
  END IF;
END $$;

-- PASO 3: Eliminar TODAS las políticas relacionadas con 'products'
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
    RAISE NOTICE '   Política eliminada: %', policy_record.policyname;
  END LOOP;
  
  IF policies_deleted > 0 THEN
    RAISE NOTICE '✅ Eliminadas % políticas relacionadas con "products"', policies_deleted;
  ELSE
    RAISE NOTICE 'ℹ️  No había políticas relacionadas con "products"';
  END IF;
END $$;

-- PASO 4: Crear el bucket desde cero
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'products',
  'products',
  true, -- Público
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

DO $$
BEGIN
  RAISE NOTICE '✅ Bucket "products" creado/actualizado exitosamente';
END $$;

-- PASO 5: Crear políticas RLS (sin especificar roles, para que apliquen a todos)
-- Política para INSERT (subir archivos)
CREATE POLICY products_insert_policy
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'products');

-- Política para SELECT (leer archivos)
CREATE POLICY products_select_policy
ON storage.objects
FOR SELECT
USING (bucket_id = 'products');

-- Política para UPDATE (actualizar archivos)
CREATE POLICY products_update_policy
ON storage.objects
FOR UPDATE
USING (bucket_id = 'products')
WITH CHECK (bucket_id = 'products');

-- Política para DELETE (eliminar archivos)
CREATE POLICY products_delete_policy
ON storage.objects
FOR DELETE
USING (bucket_id = 'products');

DO $$
BEGIN
  RAISE NOTICE '✅ Políticas RLS creadas para el bucket "products" (sin restricción de roles)';
END $$;

-- PASO 6: Verificación final
DO $$
DECLARE
  bucket_exists BOOLEAN;
  bucket_public BOOLEAN;
  total_policies INTEGER;
  total_objects INTEGER;
BEGIN
  -- Verificar bucket
  SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'products') INTO bucket_exists;
  
  IF bucket_exists THEN
    SELECT public INTO bucket_public FROM storage.buckets WHERE id = 'products';
    SELECT COUNT(*) INTO total_objects FROM storage.objects WHERE bucket_id = 'products';
  END IF;
  
  -- Contar políticas
  SELECT COUNT(*) INTO total_policies
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE 'products_%';
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICACIÓN FINAL';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Bucket "products" existe: %', CASE WHEN bucket_exists THEN '✅ SÍ' ELSE '❌ NO' END;
  
  IF bucket_exists THEN
    RAISE NOTICE 'Bucket es público: %', CASE WHEN bucket_public THEN '✅ SÍ' ELSE '❌ NO' END;
    RAISE NOTICE 'Objetos en el bucket: %', total_objects;
  END IF;
  
  RAISE NOTICE 'Total de políticas creadas: %', total_policies;
  RAISE NOTICE '';
  
  IF bucket_exists AND bucket_public AND total_policies >= 4 THEN
    RAISE NOTICE '✅ CONFIGURACIÓN COMPLETA Y CORRECTA';
    RAISE NOTICE '';
    RAISE NOTICE 'PRÓXIMOS PASOS:';
    RAISE NOTICE '1. Ve al Dashboard de Supabase → Storage → Buckets';
    RAISE NOTICE '2. Verifica que el bucket "products" aparece en la lista';
    RAISE NOTICE '3. Haz clic en el bucket y verifica que esté marcado como "Public"';
    RAISE NOTICE '4. Reinicia el backend';
    RAISE NOTICE '5. Intenta subir una imagen';
  ELSE
    RAISE WARNING '⚠️  HAY PROBLEMAS CON LA CONFIGURACIÓN';
    IF NOT bucket_exists THEN
      RAISE WARNING '   - El bucket no existe. Crea el bucket desde el Dashboard de Supabase.';
    END IF;
    IF bucket_exists AND NOT bucket_public THEN
      RAISE WARNING '   - El bucket no es público. Actualízalo desde el Dashboard.';
    END IF;
    IF total_policies < 4 THEN
      RAISE WARNING '   - Faltan políticas. Ejecuta este script nuevamente.';
    END IF;
  END IF;
  RAISE NOTICE '========================================';
END $$;

-- Mostrar información del bucket
SELECT 
  'INFORMACIÓN DEL BUCKET' as tipo,
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
WHERE id = 'products';

-- Mostrar políticas creadas
SELECT 
  'POLÍTICAS CREADAS' as tipo,
  policyname,
  cmd as operacion,
  roles::text as roles_permitidos
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE 'products_%'
ORDER BY cmd;

