-- ============================================================================
-- Fix: Políticas de Storage para Sliders - Versión más permisiva
-- ============================================================================
-- Este script recrea las políticas de sliders de forma más permisiva
-- para asegurar que funcionen con service_role
-- ============================================================================

-- Eliminar políticas existentes de sliders
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects'
      AND (
        qual::text LIKE '%sliders%' 
        OR with_check::text LIKE '%sliders%'
        OR policyname LIKE '%slider%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
    RAISE NOTICE 'Política eliminada: %', policy_record.policyname;
  END LOOP;
END $$;

-- ============================================================================
-- Políticas RLS para Storage - Sliders (Versión Permisiva)
-- ============================================================================

-- 1. Política para INSERT (subir imágenes de sliders)
-- Versión más permisiva: permite cualquier archivo que empiece con 'sliders/'
CREATE POLICY "Allow service role to upload slider images"
ON storage.objects
FOR INSERT
TO authenticated, anon, service_role
WITH CHECK (
  bucket_id = 'personalizacion' AND
  name LIKE 'sliders/%'
);

-- 2. Política para SELECT (leer/obtener URLs públicas)
-- Permite acceso público de lectura
CREATE POLICY "Allow public read access to slider images"
ON storage.objects
FOR SELECT
TO public, authenticated, anon, service_role
USING (
  bucket_id = 'personalizacion' AND
  name LIKE 'sliders/%'
);

-- 3. Política para UPDATE (actualizar imágenes de sliders)
CREATE POLICY "Allow service role to update slider images"
ON storage.objects
FOR UPDATE
TO authenticated, anon, service_role
USING (
  bucket_id = 'personalizacion' AND
  name LIKE 'sliders/%'
)
WITH CHECK (
  bucket_id = 'personalizacion' AND
  name LIKE 'sliders/%'
);

-- 4. Política para DELETE (eliminar imágenes de sliders)
CREATE POLICY "Allow service role to delete slider images"
ON storage.objects
FOR DELETE
TO authenticated, anon, service_role
USING (
  bucket_id = 'personalizacion' AND
  name LIKE 'sliders/%'
);

-- ============================================================================
-- Verificación
-- ============================================================================

-- Verificar que las políticas se crearon correctamente
SELECT 
  'POLÍTICAS DE SLIDERS (FIX)' as info,
  policyname,
  cmd as operacion,
  roles::text as roles_permitidos,
  with_check::text as condicion_with_check,
  qual::text as condicion_using
FROM pg_policies
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%slider%'
ORDER BY cmd, policyname;

-- ============================================================================
-- Notas:
-- ============================================================================
-- 1. Usamos 'name LIKE sliders/%' en lugar de storage.foldername() para
--    mayor compatibilidad y simplicidad
-- 2. Las políticas incluyen service_role explícitamente
-- 3. SELECT es público para acceso a las imágenes
-- 4. Si esto no funciona, verifica que SUPABASE_SERVICE_ROLE_KEY esté
--    correctamente configurado en el backend
-- ============================================================================

