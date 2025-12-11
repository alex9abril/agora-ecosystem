-- ============================================================================
-- Script DEFINITIVO para crear y configurar el bucket 'products'
-- ============================================================================
-- Este script crea el bucket si no existe y configura TODAS las políticas
-- necesarias para que service_role pueda subir imágenes sin problemas
-- ============================================================================

-- ============================================================================
-- PASO 1: Crear el bucket 'products' si no existe
-- ============================================================================
DO $$
DECLARE
  bucket_name TEXT := 'products';
  bucket_exists BOOLEAN;
BEGIN
  -- Verificar si el bucket existe
  SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = bucket_name) INTO bucket_exists;
  
  IF NOT bucket_exists THEN
    -- Crear el bucket
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      bucket_name,
      bucket_name,
      true, -- Bucket público para que las imágenes sean accesibles
      10485760, -- 10MB límite de tamaño
      ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    );
    
    RAISE NOTICE '✅ Bucket "%" creado exitosamente', bucket_name;
  ELSE
    -- Actualizar el bucket existente para asegurar que sea público
    UPDATE storage.buckets
    SET 
      public = true,
      file_size_limit = 10485760,
      allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    WHERE id = bucket_name;
    
    RAISE NOTICE '✅ Bucket "%" actualizado exitosamente', bucket_name;
  END IF;
END $$;

-- ============================================================================
-- PASO 2: Eliminar TODAS las políticas existentes relacionadas con 'products'
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
-- PASO 3: Crear políticas PERMISIVAS para todas las operaciones
-- ============================================================================

-- Política para INSERT (subir imágenes)
CREATE POLICY "products_insert_policy"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'products'
);

-- Política para SELECT (leer/obtener URLs públicas)
CREATE POLICY "products_select_policy"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'products'
);

-- Política para UPDATE (actualizar imágenes)
CREATE POLICY "products_update_policy"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'products'
)
WITH CHECK (
  bucket_id = 'products'
);

-- Política para DELETE (eliminar imágenes)
CREATE POLICY "products_delete_policy"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'products'
);

-- Confirmar creación de políticas
DO $$
BEGIN
  RAISE NOTICE '✅ 4 políticas creadas para el bucket "products"';
END $$;

-- ============================================================================
-- PASO 4: Verificación final
-- ============================================================================

-- Verificar que el bucket existe y está configurado correctamente
SELECT 
  'VERIFICACIÓN DEL BUCKET' as seccion,
  id as bucket_id,
  name as nombre,
  public as es_publico,
  file_size_limit as limite_tamaño_bytes,
  allowed_mime_types as tipos_permitidos,
  created_at as creado_en
FROM storage.buckets
WHERE id = 'products';

-- Verificar las políticas creadas
SELECT 
  'VERIFICACIÓN DE POLÍTICAS' as seccion,
  policyname as nombre_politica,
  cmd as operacion,
  permissive as tipo,
  roles::text as roles_permitidos
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
  bucket_exists BOOLEAN;
  bucket_public BOOLEAN;
BEGIN
  -- Contar políticas
  SELECT COUNT(*) INTO total_policies
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE '%products%';
  
  -- Verificar bucket
  SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'products') INTO bucket_exists;
  
  IF bucket_exists THEN
    SELECT public INTO bucket_public FROM storage.buckets WHERE id = 'products';
  ELSE
    bucket_public := false;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESUMEN EJECUTIVO';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Bucket "products" existe: %', CASE WHEN bucket_exists THEN '✅ SÍ' ELSE '❌ NO' END;
  RAISE NOTICE 'Bucket es público: %', CASE WHEN bucket_public THEN '✅ SÍ' ELSE '❌ NO' END;
  RAISE NOTICE 'Total de políticas: %', total_policies;
  RAISE NOTICE '';
  
  IF total_policies = 4 AND bucket_exists AND bucket_public THEN
    RAISE NOTICE '✅ CONFIGURACIÓN COMPLETA Y CORRECTA';
    RAISE NOTICE 'El bucket está listo para recibir archivos.';
    RAISE NOTICE '';
    RAISE NOTICE 'PRÓXIMOS PASOS:';
    RAISE NOTICE '1. Verifica que en tu .env tengas: SUPABASE_STORAGE_BUCKET_PRODUCTS=products';
    RAISE NOTICE '2. Reinicia el backend';
    RAISE NOTICE '3. Intenta subir una imagen nuevamente';
  ELSE
    RAISE WARNING '⚠️  CONFIGURACIÓN INCOMPLETA';
    IF NOT bucket_exists THEN
      RAISE WARNING 'El bucket "products" no existe. Revisa los logs anteriores.';
    END IF;
    IF total_policies < 4 THEN
      RAISE WARNING 'Faltan políticas. Se esperaban 4, se encontraron %.', total_policies;
    END IF;
    IF NOT bucket_public THEN
      RAISE WARNING 'El bucket no es público. Las URLs públicas pueden no funcionar.';
    END IF;
  END IF;
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- NOTAS IMPORTANTES:
-- ============================================================================
-- 1. Este script crea políticas SIN especificar roles (TO clause), lo que
--    significa que aplican a TODOS los roles, incluyendo service_role.
--
-- 2. El bucket debe ser público (public = true) para que las URLs públicas
--    funcionen correctamente.
--
-- 3. El límite de tamaño es de 10MB por imagen.
--
-- 4. Los tipos de archivo permitidos son: JPEG, JPG, PNG, WebP, GIF.
--
-- 5. IMPORTANTE: Asegúrate de que en tu archivo .env tengas:
--    SUPABASE_STORAGE_BUCKET_PRODUCTS=products
--    (NO debe ser una URL completa, solo el nombre del bucket)
--
-- 6. Después de ejecutar este script, reinicia el backend para que cargue
--    la nueva configuración.
-- ============================================================================

