-- ============================================================================
-- SOLUCIÓN ALTERNATIVA: Deshabilitar RLS para Storage (SOLO DESARROLLO)
-- ============================================================================
-- Si las políticas RLS no funcionan con service_role, esta es una solución
-- temporal que deshabilita RLS completamente para storage.objects
-- 
-- ⚠️ ADVERTENCIA: Esto deshabilita RLS completamente. Úsalo SOLO para desarrollo.
-- Para producción, deberías usar políticas RLS apropiadas.
-- ============================================================================

-- Verificar estado actual de RLS
SELECT 
  'Estado actual de RLS' as seccion,
  schemaname,
  tablename,
  rowsecurity as "RLS Habilitado"
FROM pg_tables
WHERE schemaname = 'storage' 
  AND tablename = 'objects';

-- ============================================================================
-- Deshabilitar RLS para storage.objects
-- ============================================================================
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Verificar que RLS se deshabilitó
SELECT 
  'Estado después de deshabilitar RLS' as seccion,
  schemaname,
  tablename,
  rowsecurity as "RLS Habilitado",
  CASE 
    WHEN rowsecurity THEN '❌ RLS aún está habilitado'
    ELSE '✅ RLS deshabilitado correctamente'
  END as estado
FROM pg_tables
WHERE schemaname = 'storage' 
  AND tablename = 'objects';

-- ============================================================================
-- NOTAS IMPORTANTES:
-- ============================================================================
-- 1. Con RLS deshabilitado, TODOS los roles pueden acceder a storage.objects
--    sin restricciones, incluyendo service_role.
--
-- 2. Esto es una solución temporal para desarrollo. Para producción:
--    - Debes habilitar RLS nuevamente: ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
--    - Crear políticas RLS apropiadas que permitan service_role
--
-- 3. Después de ejecutar este script:
--    - Reinicia el backend
--    - Intenta subir una imagen
--    - Debería funcionar sin problemas
--
-- 4. Para volver a habilitar RLS en el futuro:
--    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
--    Luego crea las políticas apropiadas.
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS DESHABILITADO PARA STORAGE.OBJECTS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'PRÓXIMOS PASOS:';
  RAISE NOTICE '1. Reinicia el backend';
  RAISE NOTICE '2. Intenta subir una imagen';
  RAISE NOTICE '3. Debería funcionar ahora';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  RECUERDA: Esto es solo para desarrollo.';
  RAISE NOTICE 'Para producción, habilita RLS y crea políticas apropiadas.';
  RAISE NOTICE '========================================';
END $$;

