-- ============================================================================
-- Script COMPLETO para configurar permisos de Storage para productos
-- ============================================================================
-- Este script configura TODAS las políticas necesarias para que service_role
-- pueda acceder al bucket 'products' sin restricciones
-- ============================================================================

-- Verificar que el bucket existe
DO $$
DECLARE
  bucket_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'products') INTO bucket_exists;
  
  IF NOT bucket_exists THEN
    RAISE EXCEPTION 'El bucket "products" no existe. Por favor créalo primero desde el Dashboard de Supabase o ejecuta create_products_bucket.sql';
  ELSE
    RAISE NOTICE '✅ Bucket "products" encontrado';
  END IF;
END $$;

-- ============================================================================
-- PASO 1: Eliminar TODAS las políticas existentes para el bucket 'products'
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
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
    policies_deleted := policies_deleted + 1;
    RAISE NOTICE 'Política eliminada: %', policy_record.policyname;
  END LOOP;
  
  RAISE NOTICE 'Total de políticas eliminadas: %', policies_deleted;
END $$;

-- ============================================================================
-- PASO 2: Crear políticas PERMISIVAS para todas las operaciones
-- ============================================================================

-- Política para INSERT (subir archivos)
-- PERMISIVA: Permite a TODOS los roles incluyendo service_role
CREATE POLICY "products_insert_all"
ON storage.objects
FOR INSERT
TO public, authenticated, anon, service_role
WITH CHECK (
  bucket_id = 'products'
);

-- Política para SELECT (leer/obtener URLs)
-- PERMISIVA: Permite acceso público completo
CREATE POLICY "products_select_all"
ON storage.objects
FOR SELECT
TO public, authenticated, anon, service_role
USING (
  bucket_id = 'products'
);

-- Política para UPDATE (actualizar archivos)
-- PERMISIVA: Permite a todos los roles
CREATE POLICY "products_update_all"
ON storage.objects
FOR UPDATE
TO public, authenticated, anon, service_role
USING (
  bucket_id = 'products'
)
WITH CHECK (
  bucket_id = 'products'
);

-- Política para DELETE (eliminar archivos)
-- PERMISIVA: Permite a todos los roles
CREATE POLICY "products_delete_all"
ON storage.objects
FOR DELETE
TO public, authenticated, anon, service_role
USING (
  bucket_id = 'products'
);

-- ============================================================================
-- PASO 3: Verificar que las políticas se crearon correctamente
-- ============================================================================

-- Mostrar todas las políticas creadas
SELECT 
  policyname as "Política",
  cmd as "Operación",
  permissive as "Tipo",
  roles::text as "Roles Permitidos"
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%products%'
ORDER BY cmd, policyname;

-- Verificar que service_role está en los roles permitidos
SELECT 
  policyname as "Política",
  cmd as "Operación",
  CASE 
    WHEN 'service_role' = ANY(roles::text[]) THEN '✅ SÍ'
    ELSE '❌ NO'
  END as "Service Role Permitido"
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%products%'
ORDER BY cmd, policyname;

-- ============================================================================
-- PASO 4: Verificar configuración del bucket
-- ============================================================================

SELECT 
  id as "ID del Bucket",
  name as "Nombre",
  public as "¿Público?",
  file_size_limit as "Límite de Tamaño (bytes)",
  allowed_mime_types as "Tipos MIME Permitidos",
  created_at as "Creado"
FROM storage.buckets
WHERE id = 'products';

-- ============================================================================
-- RESUMEN FINAL
-- ============================================================================

DO $$
DECLARE
  total_policies INTEGER;
  bucket_public BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO total_policies
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE '%products%';
  
  SELECT public INTO bucket_public
  FROM storage.buckets
  WHERE id = 'products';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESUMEN DE CONFIGURACIÓN:';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Bucket "products": %', CASE WHEN bucket_public THEN '✅ Público' ELSE '❌ Privado' END;
  RAISE NOTICE 'Políticas creadas: %', total_policies;
  RAISE NOTICE 'Operaciones configuradas: INSERT, SELECT, UPDATE, DELETE';
  RAISE NOTICE 'Roles permitidos: public, authenticated, anon, service_role';
  RAISE NOTICE '========================================';
  
  IF total_policies < 4 THEN
    RAISE WARNING '⚠️  Se esperaban 4 políticas pero solo se encontraron %. Verifica la configuración.', total_policies;
  END IF;
  
  IF NOT bucket_public THEN
    RAISE WARNING '⚠️  El bucket no es público. Las URLs públicas pueden no funcionar correctamente.';
  END IF;
END $$;

-- ============================================================================
-- NOTAS IMPORTANTES:
-- ============================================================================
-- 1. Este script crea políticas PERMISIVAS que permiten acceso completo
-- 2. Las políticas incluyen explícitamente a 'service_role'
-- 3. Si el bucket no es público, las URLs públicas pueden requerir autenticación
-- 4. Para máxima seguridad en producción, considera restringir solo a service_role
-- 5. Después de ejecutar este script, reinicia el backend
-- ============================================================================

