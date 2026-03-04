-- ============================================================================
-- AGORA ECOSYSTEM - Descubrir esquemas y tablas en Supabase
-- ============================================================================
-- Ejecutar en Supabase → SQL Editor para ver qué esquemas y tablas existen.
-- Con el resultado podrás usar el schema y tabla correctos en otras queries.
-- ============================================================================

-- 1) Listar todos los esquemas (excepto los del sistema)
SELECT schema_name AS schema
FROM information_schema.schemata
WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
ORDER BY schema_name;

-- 2) Listar todas las tablas (schema + nombre)
SELECT table_schema AS schema, table_name AS table_name
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
  AND table_type = 'BASE TABLE'
ORDER BY table_schema, table_name;

-- 3) Solo tablas que podrían ser de sucursales/negocios
SELECT table_schema AS schema, table_name AS table_name
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
  AND table_type = 'BASE TABLE'
  AND (
    table_name ILIKE '%business%'
    OR table_name ILIKE '%store%'
    OR table_name ILIKE '%branch%'
    OR table_name ILIKE '%sucursal%'
    OR table_name ILIKE '%negocio%'
  )
ORDER BY table_schema, table_name;
