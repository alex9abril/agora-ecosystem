-- ============================================================================
-- SOLUCIÓN ALTERNATIVA: Deshabilitar RLS temporalmente para Storage
-- ============================================================================
-- Si las políticas no funcionan, podemos deshabilitar RLS completamente
-- para el bucket 'products' (SOLO PARA DESARROLLO/PRUEBAS)
-- ============================================================================

-- IMPORTANTE: Esto deshabilita RLS completamente para storage.objects
-- Úsalo SOLO si las políticas no funcionan y necesitas una solución rápida
-- Para producción, deberías usar políticas RLS apropiadas

-- Verificar si RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS Habilitado"
FROM pg_tables
WHERE schemaname = 'storage' 
  AND tablename = 'objects';

-- ============================================================================
-- OPCIÓN 1: Deshabilitar RLS completamente (NO RECOMENDADO PARA PRODUCCIÓN)
-- ============================================================================
-- Descomenta las siguientes líneas SOLO si necesitas una solución rápida:
-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- OPCIÓN 2: Crear políticas que permitan TODO (RECOMENDADO)
-- ============================================================================

-- Eliminar TODAS las políticas existentes
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
        qual::text LIKE '%products%' 
        OR with_check::text LIKE '%products%'
        OR policyname LIKE '%product%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
    RAISE NOTICE 'Política eliminada: %', policy_record.policyname;
  END LOOP;
END $$;

-- Crear políticas que permitan TODO sin restricciones
-- Estas políticas NO especifican roles, lo que las hace aplicables a TODOS

CREATE POLICY "products_allow_all_insert"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'products');

CREATE POLICY "products_allow_all_select"
ON storage.objects
FOR SELECT
USING (bucket_id = 'products');

CREATE POLICY "products_allow_all_update"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'products')
WITH CHECK (bucket_id = 'products');

CREATE POLICY "products_allow_all_delete"
ON storage.objects
FOR DELETE
USING (bucket_id = 'products');

-- ============================================================================
-- Verificación final
-- ============================================================================
SELECT 
  'Políticas creadas' as estado,
  COUNT(*) as total_politicas
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%products%';

SELECT 
  policyname,
  cmd as operacion,
  qual::text as condicion_using,
  with_check::text as condicion_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%products%'
ORDER BY cmd;

-- ============================================================================
-- NOTA IMPORTANTE:
-- ============================================================================
-- Si después de ejecutar este script el problema persiste, el problema
-- NO es de políticas RLS, sino de configuración del cliente de Supabase.
-- En ese caso, verifica:
-- 1. Que SUPABASE_URL esté correcto
-- 2. Que SUPABASE_SERVICE_ROLE_KEY sea válido
-- 3. Que el cliente de Supabase se esté inicializando correctamente
-- ============================================================================

