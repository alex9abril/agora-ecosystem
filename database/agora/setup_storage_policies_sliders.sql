-- ============================================================================
-- Script para configurar políticas RLS de Supabase Storage para Sliders
-- Permite que el backend suba imágenes de sliders usando service_role key
-- ============================================================================
-- 
-- IMPORTANTE: Este script agrega políticas para la carpeta 'sliders/' dentro
-- del bucket 'personalizacion', que ya tiene políticas para 'branding/'
-- ============================================================================

-- ============================================================================
-- Políticas RLS para Storage - Sliders
-- ============================================================================

-- 1. Política para INSERT (subir imágenes de sliders)
-- Permite que el backend suba imágenes de sliders usando service_role key
DROP POLICY IF EXISTS "Allow service role to upload slider images" ON storage.objects;

CREATE POLICY "Allow service role to upload slider images"
ON storage.objects
FOR INSERT
TO authenticated, anon, service_role
WITH CHECK (
  bucket_id = 'personalizacion' AND
  (name LIKE 'sliders/%' OR (storage.foldername(name))[1] = 'sliders')
);

-- 2. Política para SELECT (leer/obtener URLs públicas)
-- Permite acceso público de lectura a las imágenes de sliders
DROP POLICY IF EXISTS "Allow public read access to slider images" ON storage.objects;

CREATE POLICY "Allow public read access to slider images"
ON storage.objects
FOR SELECT
TO public, authenticated, anon, service_role
USING (
  bucket_id = 'personalizacion' AND
  (name LIKE 'sliders/%' OR (storage.foldername(name))[1] = 'sliders')
);

-- 3. Política para UPDATE (actualizar imágenes de sliders)
-- Permite que el backend actualice imágenes existentes
DROP POLICY IF EXISTS "Allow service role to update slider images" ON storage.objects;

CREATE POLICY "Allow service role to update slider images"
ON storage.objects
FOR UPDATE
TO authenticated, anon, service_role
USING (
  bucket_id = 'personalizacion' AND
  (name LIKE 'sliders/%' OR (storage.foldername(name))[1] = 'sliders')
)
WITH CHECK (
  bucket_id = 'personalizacion' AND
  (name LIKE 'sliders/%' OR (storage.foldername(name))[1] = 'sliders')
);

-- 4. Política para DELETE (eliminar imágenes de sliders)
-- Permite que el backend elimine imágenes
DROP POLICY IF EXISTS "Allow service role to delete slider images" ON storage.objects;

CREATE POLICY "Allow service role to delete slider images"
ON storage.objects
FOR DELETE
TO authenticated, anon, service_role
USING (
  bucket_id = 'personalizacion' AND
  (name LIKE 'sliders/%' OR (storage.foldername(name))[1] = 'sliders')
);

-- ============================================================================
-- Verificación
-- ============================================================================

-- Verificar que las políticas se crearon correctamente
SELECT 
  'POLÍTICAS DE SLIDERS' as info,
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
  AND policyname LIKE '%slider%'
ORDER BY cmd, policyname;

-- Verificar todas las políticas del bucket personalizacion
SELECT 
  'TODAS LAS POLÍTICAS DE personalizacion' as info,
  policyname,
  cmd as operacion,
  roles::text as roles_permitidos,
  CASE 
    WHEN qual::text LIKE '%branding%' OR with_check::text LIKE '%branding%' THEN 'branding'
    WHEN qual::text LIKE '%sliders%' OR with_check::text LIKE '%sliders%' THEN 'sliders'
    ELSE 'otro'
  END as carpeta,
  qual::text as condicion_using,
  with_check::text as condicion_with_check
FROM pg_policies
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND (
    qual::text LIKE '%personalizacion%' 
    OR with_check::text LIKE '%personalizacion%'
    OR policyname LIKE '%personalizacion%'
    OR policyname LIKE '%branding%'
    OR policyname LIKE '%slider%'
  )
ORDER BY carpeta, cmd;

-- ============================================================================
-- Notas importantes:
-- ============================================================================
-- 1. Las políticas permiten operaciones a authenticated, anon y service_role
--    para máxima flexibilidad. El backend usa service_role que bypass RLS,
--    pero Storage tiene sus propias políticas que deben configurarse.
--
-- 2. Las imágenes de sliders se almacenan en la estructura:
--    sliders/{type}/{id}/slider-{timestamp}-{random}.{ext}
--    donde:
--    - type: 'group' o 'branch'
--    - id: UUID del grupo o sucursal
--
-- 3. El bucket 'personalizacion' ya existe y tiene políticas para 'branding/',
--    estas políticas agregan soporte para 'sliders/' en el mismo bucket.
--
-- 4. Para verificar que funciona, intenta subir una imagen desde el backend
--    y revisa los logs de Supabase Storage en el dashboard.
-- ============================================================================

