-- ============================================================================
-- AGORA ECOSYSTEM - Fix: Restaurar políticas de Storage para productos
-- ============================================================================
-- Descripción: Restaura las políticas de Storage para el bucket 'products'
--              que pueden haberse roto al aplicar políticas de branding
-- 
-- Uso: Ejecutar si las imágenes de productos dejaron de funcionar
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- POLÍTICAS RLS PARA STORAGE - PRODUCTOS
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
-- VERIFICACIÓN
-- ============================================================================

-- Verificar que las políticas de productos se crearon correctamente
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

-- Verificar que las políticas de branding también existen
SELECT 
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%branding%'
ORDER BY policyname;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

