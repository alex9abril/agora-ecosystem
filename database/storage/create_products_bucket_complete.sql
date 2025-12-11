-- ============================================================================
-- SCRIPT COMPLETO: Crear y configurar el bucket 'products' en Supabase Storage
-- ============================================================================
-- Este script:
-- 1. Verifica si el bucket existe
-- 2. Crea el bucket si no existe
-- 3. Configura las políticas RLS para permitir acceso con service_role
-- ============================================================================

-- Paso 1: Verificar si el bucket existe
DO $$
DECLARE
  bucket_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'products') INTO bucket_exists;
  
  IF bucket_exists THEN
    RAISE NOTICE '✅ El bucket "products" ya existe';
  ELSE
    RAISE NOTICE '⚠️  El bucket "products" NO existe. Creándolo...';
    
    -- Crear el bucket
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'products',
      'products',
      true, -- Público
      10485760, -- 10MB
      ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    )
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE '✅ Bucket "products" creado exitosamente';
  END IF;
END $$;

-- Paso 2: Eliminar políticas existentes (si las hay)
DO $$
BEGIN
  -- Eliminar políticas existentes para el bucket 'products'
  DROP POLICY IF EXISTS products_insert_policy ON storage.objects;
  DROP POLICY IF EXISTS products_select_policy ON storage.objects;
  DROP POLICY IF EXISTS products_update_policy ON storage.objects;
  DROP POLICY IF EXISTS products_delete_policy ON storage.objects;
  
  RAISE NOTICE '✅ Políticas antiguas eliminadas (si existían)';
END $$;

-- Paso 3: Crear políticas RLS para el bucket 'products'
-- IMPORTANTE: Estas políticas permiten acceso a todos los roles, incluyendo service_role

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

-- Confirmar que las políticas se crearon
DO $$
BEGIN
  RAISE NOTICE '✅ Políticas RLS creadas para el bucket "products"';
END $$;

-- Paso 4: Verificación final
DO $$
DECLARE
  bucket_exists BOOLEAN;
  bucket_public BOOLEAN;
  total_policies INTEGER;
BEGIN
  -- Verificar bucket
  SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'products') INTO bucket_exists;
  
  IF bucket_exists THEN
    SELECT public INTO bucket_public FROM storage.buckets WHERE id = 'products';
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
  END IF;
  
  RAISE NOTICE 'Total de políticas creadas: %', total_policies;
  RAISE NOTICE '';
  
  IF bucket_exists AND bucket_public AND total_policies >= 4 THEN
    RAISE NOTICE '✅ CONFIGURACIÓN COMPLETA Y CORRECTA';
    RAISE NOTICE '';
    RAISE NOTICE 'PRÓXIMOS PASOS:';
    RAISE NOTICE '1. Reinicia el backend';
    RAISE NOTICE '2. Intenta subir una imagen';
    RAISE NOTICE '3. Debería funcionar ahora';
  ELSE
    RAISE WARNING '⚠️  HAY PROBLEMAS CON LA CONFIGURACIÓN';
    IF NOT bucket_exists THEN
      RAISE WARNING '   - El bucket no existe. Ejecuta este script nuevamente.';
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

