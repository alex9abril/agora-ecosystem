-- ============================================================================
-- AGORA ECOSYSTEM - Add email templates policies to personalizacion bucket
-- ============================================================================
-- Descripción: Agrega políticas RLS al bucket 'personalizacion' para permitir
--              subir logos de templates de email en la ruta email-templates/
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2025-01-15
-- Hora: 16:00:00
-- ============================================================================

SET search_path TO storage, public;

-- ============================================================================
-- POLÍTICAS RLS PARA EMAIL TEMPLATES EN BUCKET PERSONALIZACION
-- ============================================================================

-- Verificar que el bucket existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'personalizacion'
    ) THEN
        RAISE EXCEPTION 'El bucket "personalizacion" no existe. Debe crearse primero.';
    END IF;
    
    RAISE NOTICE 'Bucket "personalizacion" encontrado';
END $$;

-- ============================================================================
-- 1. Política INSERT para email-templates
-- ============================================================================
-- Permite subir logos de templates de email
DROP POLICY IF EXISTS "Allow service role to upload email template logos" ON storage.objects;

CREATE POLICY "Allow service role to upload email template logos"
ON storage.objects
FOR INSERT
TO authenticated, anon, service_role
WITH CHECK (
  bucket_id = 'personalizacion' AND
  (storage.foldername(name))[1] = 'email-templates'
);

-- ============================================================================
-- 2. Política SELECT para email-templates
-- ============================================================================
-- Permite leer/obtener URLs públicas de logos de templates
DROP POLICY IF EXISTS "Allow public read access to email template logos" ON storage.objects;

CREATE POLICY "Allow public read access to email template logos"
ON storage.objects
FOR SELECT
TO public, authenticated, anon, service_role
USING (
  bucket_id = 'personalizacion' AND
  (storage.foldername(name))[1] = 'email-templates'
);

-- ============================================================================
-- 3. Política UPDATE para email-templates
-- ============================================================================
-- Permite actualizar logos de templates existentes
DROP POLICY IF EXISTS "Allow service role to update email template logos" ON storage.objects;

CREATE POLICY "Allow service role to update email template logos"
ON storage.objects
FOR UPDATE
TO authenticated, anon, service_role
USING (
  bucket_id = 'personalizacion' AND
  (storage.foldername(name))[1] = 'email-templates'
)
WITH CHECK (
  bucket_id = 'personalizacion' AND
  (storage.foldername(name))[1] = 'email-templates'
);

-- ============================================================================
-- 4. Política DELETE para email-templates
-- ============================================================================
-- Permite eliminar logos de templates
DROP POLICY IF EXISTS "Allow service role to delete email template logos" ON storage.objects;

CREATE POLICY "Allow service role to delete email template logos"
ON storage.objects
FOR DELETE
TO authenticated, anon, service_role
USING (
  bucket_id = 'personalizacion' AND
  (storage.foldername(name))[1] = 'email-templates'
);

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar que las políticas se crearon correctamente
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname LIKE '%email template%';
    
    IF policy_count < 4 THEN
        RAISE EXCEPTION 'No se crearon todas las políticas. Esperadas: 4, Encontradas: %', policy_count;
    END IF;
    
    RAISE NOTICE '✅ Políticas creadas exitosamente: % políticas para email-templates', policy_count;
END $$;

-- Listar todas las políticas relacionadas con email-templates
SELECT 
    'POLÍTICAS DE EMAIL TEMPLATES' as info,
    policyname,
    cmd as operacion,
    permissive as tipo,
    roles::text as roles_permitidos,
    qual::text as condicion_using,
    with_check::text as condicion_with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%email template%'
ORDER BY cmd;

-- ============================================================================
-- NOTAS:
-- ============================================================================
-- 1. Estas políticas permiten operaciones en la ruta email-templates/ dentro
--    del bucket 'personalizacion'
-- 2. Las políticas permiten operaciones a authenticated, anon y service_role
--    para máxima flexibilidad
-- 3. La estructura de rutas es: email-templates/{level}/{templateId}/logo-{timestamp}-{random}.{ext}
--    donde level puede ser: 'global', 'group', o 'business'
-- 4. El service_role key en Supabase bypass RLS por defecto, pero Storage
--    tiene sus propias políticas que deben configurarse explícitamente
-- 5. Si necesitas más seguridad, puedes restringir solo a service_role
-- ============================================================================

