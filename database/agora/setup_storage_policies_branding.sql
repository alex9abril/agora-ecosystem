-- ============================================================================
-- Script para configurar políticas RLS de Supabase Storage para Branding
-- Permite que el backend suba imágenes de branding (logos, favicons) usando service_role key
-- ============================================================================

-- Nombre del bucket (ajusta según tu configuración)
-- Por defecto es 'personalizacion', pero verifica en tu código
DO $$
DECLARE
  bucket_name TEXT := 'personalizacion'; -- Cambia esto si usas otro nombre
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
      5242880, -- 5MB límite de tamaño (para branding)
      ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
    )
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Bucket "%" creado', bucket_name;
  ELSE
    RAISE NOTICE 'Bucket "%" ya existe', bucket_name;
  END IF;
END $$;

-- ============================================================================
-- Políticas RLS para Storage - Branding
-- ============================================================================

-- 1. Política para INSERT (subir imágenes de branding)
-- Permite que el backend suba imágenes de branding usando service_role key
-- Esta política permite INSERT sin restricciones de autenticación
-- ya que el backend usa service_role que bypass RLS por defecto
DROP POLICY IF EXISTS "Allow service role to upload branding images" ON storage.objects;

CREATE POLICY "Allow service role to upload branding images"
ON storage.objects
FOR INSERT
TO authenticated, anon, service_role
WITH CHECK (
  bucket_id = 'personalizacion' AND
  (storage.foldername(name))[1] = 'branding' -- Verifica que esté en la carpeta branding
);

-- 2. Política para SELECT (leer/obtener URLs públicas)
-- Permite acceso público de lectura a las imágenes de branding
DROP POLICY IF EXISTS "Allow public read access to branding images" ON storage.objects;

CREATE POLICY "Allow public read access to branding images"
ON storage.objects
FOR SELECT
TO public, authenticated, anon, service_role
USING (
  bucket_id = 'personalizacion' AND
  (storage.foldername(name))[1] = 'branding'
);

-- 3. Política para UPDATE (actualizar imágenes de branding)
-- Permite que el backend actualice imágenes existentes
DROP POLICY IF EXISTS "Allow service role to update branding images" ON storage.objects;

CREATE POLICY "Allow service role to update branding images"
ON storage.objects
FOR UPDATE
TO authenticated, anon, service_role
USING (
  bucket_id = 'personalizacion' AND
  (storage.foldername(name))[1] = 'branding'
)
WITH CHECK (
  bucket_id = 'personalizacion' AND
  (storage.foldername(name))[1] = 'branding'
);

-- 4. Política para DELETE (eliminar imágenes de branding)
-- Permite que el backend elimine imágenes
DROP POLICY IF EXISTS "Allow service role to delete branding images" ON storage.objects;

CREATE POLICY "Allow service role to delete branding images"
ON storage.objects
FOR DELETE
TO authenticated, anon, service_role
USING (
  bucket_id = 'personalizacion' AND
  (storage.foldername(name))[1] = 'branding'
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
  AND policyname LIKE '%branding%'
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
WHERE id = 'personalizacion';

-- ============================================================================
-- Notas importantes:
-- ============================================================================
-- 1. El service_role key en Supabase bypass RLS por defecto, pero Storage
--    tiene sus propias políticas que deben configurarse explícitamente.
--
-- 2. Si el bucket no es público (public = false), necesitarás generar
--    URLs firmadas en lugar de URLs públicas.
--
-- 3. Ajusta el nombre del bucket si usas uno diferente a 'personalizacion'.
--    El bucket se configura en la variable de entorno SUPABASE_STORAGE_BUCKET.
--
-- 4. Las políticas permiten operaciones a authenticated, anon y service_role
--    para máxima flexibilidad. Si quieres más seguridad, puedes restringir
--    solo a service_role.
--
-- 5. Las imágenes de branding se almacenan en la estructura:
--    branding/{type}/{id}/{imageType}-{timestamp}-{random}.{ext}
--    donde:
--    - type: 'group' o 'business'
--    - id: UUID del grupo o sucursal
--    - imageType: 'logo', 'logo_light', 'logo_dark', 'favicon'
--
-- 6. Para verificar que funciona, intenta subir una imagen desde el backend
--    y revisa los logs de Supabase Storage en el dashboard.
-- ============================================================================

