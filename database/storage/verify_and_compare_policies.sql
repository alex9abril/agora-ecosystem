-- ============================================================================
-- Script de Diagnóstico: Comparar políticas de personalizacion vs products
-- ============================================================================
-- Este script te ayudará a ver EXACTAMENTE qué diferencias hay
-- ============================================================================

-- 1. Ver TODAS las políticas de personalizacion (la que funciona)
SELECT 
  '=== PERSONALIZACION (FUNCIONA) ===' as bucket,
  policyname,
  cmd as operacion,
  permissive as tipo,
  roles::text as roles_permitidos,
  qual::text as condicion_using,
  with_check::text as condicion_with_check,
  CASE 
    WHEN roles IS NULL THEN 'Sin restricción (aplica a TODOS)'
    ELSE 'Roles específicos: ' || roles::text
  END as detalle_roles
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND (
    qual::text LIKE '%personalizacion%' 
    OR with_check::text LIKE '%personalizacion%'
    OR policyname LIKE '%branding%'
  )
ORDER BY cmd, policyname;

-- 2. Ver TODAS las políticas de products (la que NO funciona)
SELECT 
  '=== PRODUCTS (NO FUNCIONA) ===' as bucket,
  policyname,
  cmd as operacion,
  permissive as tipo,
  roles::text as roles_permitidos,
  qual::text as condicion_using,
  with_check::text as condicion_with_check,
  CASE 
    WHEN roles IS NULL THEN 'Sin restricción (aplica a TODOS)'
    ELSE 'Roles específicos: ' || roles::text
  END as detalle_roles
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND (
    qual::text LIKE '%products%' 
    OR with_check::text LIKE '%products%'
    OR policyname LIKE '%product%'
  )
ORDER BY cmd, policyname;

-- 3. Comparación lado a lado
SELECT 
  CASE 
    WHEN qual::text LIKE '%personalizacion%' OR policyname LIKE '%branding%' THEN 'personalizacion'
    WHEN qual::text LIKE '%products%' OR policyname LIKE '%product%' THEN 'products'
    ELSE 'otro'
  END as bucket,
  cmd as operacion,
  policyname,
  roles::text as roles_permitidos,
  CASE 
    WHEN qual::text LIKE '%personalizacion%' OR policyname LIKE '%branding%' THEN '✅ FUNCIONA'
    WHEN qual::text LIKE '%products%' OR policyname LIKE '%product%' THEN '❌ NO FUNCIONA'
    ELSE ''
  END as estado
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND (
    qual::text LIKE '%personalizacion%' 
    OR with_check::text LIKE '%personalizacion%'
    OR policyname LIKE '%branding%'
    OR qual::text LIKE '%products%' 
    OR with_check::text LIKE '%products%'
    OR policyname LIKE '%product%'
  )
ORDER BY cmd, bucket, policyname;

-- 4. Verificar si hay diferencias en la estructura de las políticas
SELECT 
  'DIFERENCIAS ESTRUCTURALES' as analisis,
  cmd as operacion,
  COUNT(DISTINCT CASE WHEN qual::text LIKE '%personalizacion%' OR policyname LIKE '%branding%' THEN policyname END) as politicas_personalizacion,
  COUNT(DISTINCT CASE WHEN qual::text LIKE '%products%' OR policyname LIKE '%product%' THEN policyname END) as politicas_products,
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN qual::text LIKE '%personalizacion%' OR policyname LIKE '%branding%' THEN policyname END) = 
         COUNT(DISTINCT CASE WHEN qual::text LIKE '%products%' OR policyname LIKE '%product%' THEN policyname END)
    THEN '✅ Mismo número de políticas'
    ELSE '⚠️ Diferente número de políticas'
  END as estado
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND (
    qual::text LIKE '%personalizacion%' 
    OR with_check::text LIKE '%personalizacion%'
    OR policyname LIKE '%branding%'
    OR qual::text LIKE '%products%' 
    OR with_check::text LIKE '%products%'
    OR policyname LIKE '%product%'
  )
GROUP BY cmd
ORDER BY cmd;

