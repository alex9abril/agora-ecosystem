-- ============================================================================
-- AGORA ECOSYSTEM - Query: Sucursales activas con usuarios administradores
-- ============================================================================
-- Descripción: Lista las sucursales activas y el usuario con el que se debe
--              entrar para administrarlas (ej. Toyota Satélite → alejandro.grijalva@coal.com.mx).
--              Usa core.businesses, core.business_users y auth.users.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2025-02-20
-- ============================================================================

SET search_path TO core, auth, public;

-- ============================================================================
-- OPCIÓN 1: Una fila por sucursal con el usuario principal de acceso
-- (prioridad: superadmin, luego admin)
-- ============================================================================

SELECT DISTINCT ON (b.id)
  b.id                    AS sucursal_id,
  b.name                  AS sucursal_nombre,
  au.email                AS usuario_administrador_email,
  COALESCE(
    NULLIF(TRIM(up.first_name || ' ' || up.last_name), ''),
    au.email
  )                       AS usuario_administrador_nombre,
  bu.role::text           AS rol
FROM core.businesses b
INNER JOIN core.business_users bu
  ON bu.business_id = b.id
  AND bu.is_active = TRUE
  AND bu.role IN ('superadmin', 'admin')
INNER JOIN auth.users au
  ON au.id = bu.user_id
LEFT JOIN core.user_profiles up
  ON up.id = bu.user_id
WHERE b.is_active = TRUE
ORDER BY
  b.id,
  CASE bu.role WHEN 'superadmin' THEN 1 WHEN 'admin' THEN 2 END,
  bu.created_at;

-- ============================================================================
-- OPCIÓN 2: Todas las sucursales activas con TODOS sus usuarios y roles
-- (varios renglones por sucursal si hay varios usuarios)
-- ============================================================================

SELECT
  b.id                    AS sucursal_id,
  b.name                  AS sucursal_nombre,
  au.email                AS usuario_email,
  COALESCE(
    NULLIF(TRIM(up.first_name || ' ' || up.last_name), ''),
    au.email
  )                       AS usuario_nombre,
  bu.role::text           AS rol,
  bu.is_active             AS usuario_activo_en_sucursal
FROM core.businesses b
INNER JOIN core.business_users bu
  ON bu.business_id = b.id
  AND bu.is_active = TRUE
INNER JOIN auth.users au
  ON au.id = bu.user_id
LEFT JOIN core.user_profiles up
  ON up.id = bu.user_id
WHERE b.is_active = TRUE
ORDER BY b.name, CASE bu.role WHEN 'superadmin' THEN 1 WHEN 'admin' THEN 2 WHEN 'operations_staff' THEN 3 WHEN 'kitchen_staff' THEN 4 END, au.email;

-- ============================================================================
-- OPCIÓN 3: Solo buscar una sucursal por nombre (ej. Toyota Satélite)
-- ============================================================================
/*
SELECT
  b.name                  AS sucursal_nombre,
  au.email                AS usuario_administrador_email,
  bu.role::text           AS rol
FROM core.businesses b
INNER JOIN core.business_users bu ON bu.business_id = b.id AND bu.is_active = TRUE
INNER JOIN auth.users au ON au.id = bu.user_id
WHERE b.is_active = TRUE
  AND b.name ILIKE '%Toyota%Satélite%'
ORDER BY CASE bu.role WHEN 'superadmin' THEN 1 WHEN 'admin' THEN 2 END;
*/

-- ============================================================================
-- NOTAS
-- ============================================================================
-- 1. Ejecución: no ejecutar desde el agente; el usuario ejecuta en su cliente SQL.
-- 2. auth.users: en Supabase el schema auth puede no estar en search_path por defecto;
--    si falla, usar auth.users explícitamente o añadir auth al search_path.
-- 3. Para "con qué usuario entro a administrar X sucursal": usar OPCIÓN 1.
-- 4. Para ver todo el equipo por sucursal: usar OPCIÓN 2.
-- ============================================================================
