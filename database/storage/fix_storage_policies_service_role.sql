-- ============================================================================
-- Fix: Políticas de Storage para permitir service_role explícitamente
-- ============================================================================
-- IMPORTANTE: Supabase Storage NO bypass RLS automáticamente con service_role
-- Necesitamos políticas explícitas que permitan a service_role hacer operaciones
-- ============================================================================

-- Primero, eliminar todas las políticas existentes para el bucket 'products'
-- para empezar desde cero
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects'
      AND (qual::text LIKE '%products%' OR with_check::text LIKE '%products%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
    RAISE NOTICE 'Política eliminada: %', policy_record.policyname;
  END LOOP;
END $$;

-- ============================================================================
-- Políticas RLS para Storage - Productos (con service_role explícito)
-- ============================================================================

-- 1. Política para INSERT (subir imágenes de productos)
-- PERMISIVA: Permite a todos los roles, incluyendo service_role
CREATE POLICY "products_insert_policy"
ON storage.objects
FOR INSERT
TO public, authenticated, anon, service_role
WITH CHECK (
  bucket_id = 'products'
);

-- 2. Política para SELECT (leer/obtener URLs públicas)
-- PERMISIVA: Permite acceso público completo
CREATE POLICY "products_select_policy"
ON storage.objects
FOR SELECT
TO public, authenticated, anon, service_role
USING (
  bucket_id = 'products'
);

-- 3. Política para UPDATE (actualizar imágenes de productos)
-- PERMISIVA: Permite a todos los roles
CREATE POLICY "products_update_policy"
ON storage.objects
FOR UPDATE
TO public, authenticated, anon, service_role
USING (
  bucket_id = 'products'
)
WITH CHECK (
  bucket_id = 'products'
);

-- 4. Política para DELETE (eliminar imágenes de productos)
-- PERMISIVA: Permite a todos los roles
CREATE POLICY "products_delete_policy"
ON storage.objects
FOR DELETE
TO public, authenticated, anon, service_role
USING (
  bucket_id = 'products'
);

-- ============================================================================
-- Verificación
-- ============================================================================

-- Verificar que el bucket existe
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
WHERE id = 'products';

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
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%products%'
ORDER BY policyname;

-- Verificar que service_role está en los roles permitidos
SELECT 
  policyname,
  roles::text as allowed_roles,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%products%'
  AND 'service_role' = ANY(roles::text[]);

-- ============================================================================
-- Notas importantes:
-- ============================================================================
-- 1. Las políticas son PERMISIVAS (permissive = 'PERMISSIVE') por defecto
-- 2. Incluimos 'public' en los roles para máxima permisividad
-- 3. service_role debe estar explícitamente en la lista de roles
-- 4. Si esto no funciona, puede ser un problema de configuración del cliente
--    de Supabase en el backend (verificar SUPABASE_SERVICE_ROLE_KEY)
-- ============================================================================

