-- ============================================================================
-- Script para crear el bucket 'products' en Supabase Storage
-- ============================================================================
-- Este script crea el bucket y configura las políticas necesarias
-- para que el backend pueda subir imágenes de productos
-- ============================================================================

-- Crear el bucket 'products' si no existe
DO $$
DECLARE
  bucket_name TEXT := 'products';
BEGIN
  -- Verificar si el bucket existe
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = bucket_name
  ) THEN
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
    RAISE NOTICE 'ℹ️  Bucket "%" ya existe', bucket_name;
  END IF;
END $$;

-- ============================================================================
-- Políticas RLS para Storage - Productos
-- ============================================================================

-- 1. Política para INSERT (subir imágenes de productos)
DROP POLICY IF EXISTS "Allow service role to upload product images" ON storage.objects;

CREATE POLICY "Allow service role to upload product images"
ON storage.objects
FOR INSERT
TO authenticated, anon, service_role
WITH CHECK (
  bucket_id = 'products' AND
  (storage.foldername(name))[1] IS NOT NULL -- Verifica que tenga al menos una carpeta (product_id)
);

-- 2. Política para SELECT (leer/obtener URLs públicas)
DROP POLICY IF EXISTS "Allow public read access to product images" ON storage.objects;

CREATE POLICY "Allow public read access to product images"
ON storage.objects
FOR SELECT
TO public, authenticated, anon, service_role
USING (
  bucket_id = 'products'
);

-- 3. Política para UPDATE (actualizar imágenes de productos)
DROP POLICY IF EXISTS "Allow service role to update product images" ON storage.objects;

CREATE POLICY "Allow service role to update product images"
ON storage.objects
FOR UPDATE
TO authenticated, anon, service_role
USING (
  bucket_id = 'products'
)
WITH CHECK (
  bucket_id = 'products'
);

-- 4. Política para DELETE (eliminar imágenes de productos)
DROP POLICY IF EXISTS "Allow service role to delete product images" ON storage.objects;

CREATE POLICY "Allow service role to delete product images"
ON storage.objects
FOR DELETE
TO authenticated, anon, service_role
USING (
  bucket_id = 'products'
);

-- ============================================================================
-- Verificación
-- ============================================================================

-- Verificar que el bucket existe y está configurado correctamente
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at,
  updated_at
FROM storage.buckets
WHERE id = 'products';

-- Mostrar las políticas creadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%product%'
ORDER BY policyname;

-- ============================================================================
-- Notas importantes:
-- ============================================================================
-- 1. El bucket 'products' debe ser público (public = true) para que las
--    URLs públicas funcionen correctamente.
--
-- 2. El límite de tamaño es de 10MB por imagen.
--
-- 3. Los tipos de archivo permitidos son: JPEG, JPG, PNG, WebP, GIF.
--
-- 4. La estructura de carpetas esperada es: {product_id}/{image_id}.{ext}
--
-- 5. El service_role key en Supabase bypass RLS por defecto, pero Storage
--    tiene sus propias políticas que deben configurarse explícitamente.
--
-- 6. Si después de ejecutar este script sigues teniendo problemas:
--    - Verifica que SUPABASE_SERVICE_ROLE_KEY esté configurado correctamente
--    - Verifica que SUPABASE_STORAGE_BUCKET_PRODUCTS=products en tu .env
--    - Revisa los logs del backend para más detalles
-- ============================================================================

