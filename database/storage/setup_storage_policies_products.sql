-- ============================================================================
-- Script para configurar políticas RLS de Supabase Storage para Products
-- Permite que el backend suba imágenes de productos usando service_role key
-- ============================================================================
-- Este script replica EXACTAMENTE la estructura de setup_storage_policies_branding.sql
-- pero adaptado para el bucket 'products'
-- ============================================================================

-- Nombre del bucket
DO $$
DECLARE
  bucket_name TEXT := 'products';
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
      10485760, -- 10MB límite de tamaño (para productos)
      ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    )
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Bucket "%" creado', bucket_name;
  ELSE
    RAISE NOTICE 'Bucket "%" ya existe', bucket_name;
  END IF;
END $$;

-- ============================================================================
-- Políticas RLS para Storage - Products
-- ============================================================================
-- IMPORTANTE: Replicamos EXACTAMENTE la estructura de personalizacion
-- pero sin la restricción de carpeta (products puede tener cualquier estructura)

-- 1. Política para INSERT (subir imágenes de productos)
-- Permite que el backend suba imágenes de productos usando service_role key
DROP POLICY IF EXISTS "Allow service role to upload product images" ON storage.objects;

CREATE POLICY "Allow service role to upload product images"
ON storage.objects
FOR INSERT
TO authenticated, anon, service_role
WITH CHECK (bucket_id = 'products');

-- 2. Política para SELECT (leer/obtener URLs públicas)
-- Permite acceso público de lectura a las imágenes de productos
DROP POLICY IF EXISTS "Allow public read access to product images" ON storage.objects;

CREATE POLICY "Allow public read access to product images"
ON storage.objects
FOR SELECT
TO public, authenticated, anon, service_role
USING (bucket_id = 'products');

-- 3. Política para UPDATE (actualizar imágenes de productos)
-- Permite que el backend actualice imágenes existentes
DROP POLICY IF EXISTS "Allow service role to update product images" ON storage.objects;

CREATE POLICY "Allow service role to update product images"
ON storage.objects
FOR UPDATE
TO authenticated, anon, service_role
USING (bucket_id = 'products')
WITH CHECK (bucket_id = 'products');

-- 4. Política para DELETE (eliminar imágenes de productos)
-- Permite que el backend elimine imágenes
DROP POLICY IF EXISTS "Allow service role to delete product images" ON storage.objects;

CREATE POLICY "Allow service role to delete product images"
ON storage.objects
FOR DELETE
TO authenticated, anon, service_role
USING (bucket_id = 'products');

-- ============================================================================
-- Verificación
-- ============================================================================

-- Verificar que las políticas se crearon correctamente
SELECT 
  'VERIFICACIÓN: Políticas creadas' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles::text as roles_permitidos,
  cmd as operacion,
  qual::text as condicion_using,
  with_check::text as condicion_with_check
FROM pg_policies
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%product%'
ORDER BY cmd, policyname;

-- Verificar que el bucket existe y está configurado correctamente
SELECT 
  'VERIFICACIÓN: Bucket' as info,
  id,
  name,
  public as es_publico,
  file_size_limit,
  allowed_mime_types,
  created_at,
  updated_at
FROM storage.buckets
WHERE id = 'products';

-- ============================================================================
-- Comparación con personalizacion
-- ============================================================================
SELECT 
  'COMPARACIÓN: personalizacion vs products' as info,
  CASE 
    WHEN policyname LIKE '%branding%' OR qual::text LIKE '%personalizacion%' THEN 'personalizacion'
    WHEN policyname LIKE '%product%' OR qual::text LIKE '%products%' THEN 'products'
    ELSE 'otro'
  END as bucket,
  cmd as operacion,
  policyname,
  roles::text as roles_permitidos
FROM pg_policies
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND (
    policyname LIKE '%branding%'
    OR qual::text LIKE '%personalizacion%'
    OR policyname LIKE '%product%'
    OR qual::text LIKE '%products%'
  )
ORDER BY bucket, cmd, policyname;

-- ============================================================================
-- Notas importantes:
-- ============================================================================
-- 1. Este script replica EXACTAMENTE la estructura de setup_storage_policies_branding.sql
-- 2. Las políticas permiten operaciones a authenticated, anon y service_role
--    para INSERT, UPDATE, DELETE (igual que personalizacion)
-- 3. SELECT permite public, authenticated, anon y service_role (igual que personalizacion)
-- 4. La única diferencia es que NO hay restricción de carpeta (products puede tener cualquier estructura)
-- 5. Si esto no funciona, puede ser un problema de cómo Supabase Storage interpreta las políticas
--    o puede requerir reiniciar el servicio de Storage
-- ============================================================================

