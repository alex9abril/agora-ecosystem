-- ============================================================================
-- Script para configurar políticas RLS de Supabase Storage
-- Permite que el backend suba imágenes de productos usando service_role key
-- ============================================================================

-- Nombre del bucket (ajusta según tu configuración)
-- Por defecto es 'products', pero verifica en tu código
DO $$
DECLARE
  bucket_name TEXT := 'products'; -- Cambia esto si usas otro nombre
BEGIN
  -- Verificar si el bucket existe
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = bucket_name
  ) THEN
    -- Crear el bucket si no existe
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      bucket_name,
      bucket_name,
      true, -- Bucket público para que las imágenes sean accesibles
      10485760, -- 10MB límite de tamaño
      ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    )
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Bucket "%" creado', bucket_name;
  ELSE
    RAISE NOTICE 'Bucket "%" ya existe', bucket_name;
  END IF;
END $$;

-- ============================================================================
-- Políticas RLS para Storage
-- ============================================================================

-- 1. Política para INSERT (subir imágenes)
-- Permite que el backend suba imágenes usando service_role key
-- Esta política permite INSERT sin restricciones de autenticación
-- ya que el backend usa service_role que bypass RLS por defecto
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
-- Permite acceso público de lectura a las imágenes
DROP POLICY IF EXISTS "Allow public read access to product images" ON storage.objects;

CREATE POLICY "Allow public read access to product images"
ON storage.objects
FOR SELECT
TO public, authenticated, anon, service_role
USING (
  bucket_id = 'products'
);

-- 3. Política para UPDATE (actualizar imágenes)
-- Permite que el backend actualice imágenes existentes
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

-- 4. Política para DELETE (eliminar imágenes)
-- Permite que el backend elimine imágenes
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

-- Verificar que las políticas se crearon correctamente
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
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%product%'
ORDER BY policyname;

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

-- ============================================================================
-- Notas importantes:
-- ============================================================================
-- 1. El service_role key en Supabase bypass RLS por defecto, pero Storage
--    tiene sus propias políticas que deben configurarse explícitamente.
--
-- 2. Si el bucket no es público (public = false), necesitarás generar
--    URLs firmadas en lugar de URLs públicas.
--
-- 3. Ajusta el nombre del bucket si usas uno diferente a 'products'.
--
-- 4. Las políticas permiten operaciones a authenticated, anon y service_role
--    para máxima flexibilidad. Si quieres más seguridad, puedes restringir
--    solo a service_role.
--
-- 5. Para verificar que funciona, intenta subir una imagen desde el backend
--    y revisa los logs de Supabase Storage en el dashboard.
-- ============================================================================

