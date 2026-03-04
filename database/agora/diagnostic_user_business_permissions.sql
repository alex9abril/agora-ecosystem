-- ============================================================================
-- AGORA ECOSYSTEM - Diagnóstico: Permisos de usuario sobre un negocio
-- ============================================================================
-- Descripción: Consultas para verificar si un usuario tiene acceso a un negocio
--              y por qué GET /api/businesses/my-business?businessId=... podría
--              devolver 404 "Tienda no encontrada o no tienes acceso".
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-03-04
-- ============================================================================
-- Uso: Reemplaza los UUIDs abajo por tu user_id y business_id, luego ejecuta
--      en el SQL Editor de Supabase (o psql).
-- ============================================================================

SET search_path TO core, auth, public;

-- UUIDs a diagnosticar (cámbialos si necesitas otro usuario/negocio):
-- User:  96849ad1-8b32-4615-a8c8-d250e71108ea  (alejandro.grijalva@agoramp.mx)
-- Business: 8c0a92dd-4742-4860-aad1-eba147e49931  (el que devuelve 404 en my-business)

-- ============================================================================
-- 1) ¿Existe el usuario en auth.users?
-- ============================================================================
SELECT 
  id,
  email,
  raw_user_meta_data->>'first_name' AS first_name,
  raw_user_meta_data->>'last_name' AS last_name,
  last_sign_in_at
FROM auth.users
WHERE id = '96849ad1-8b32-4615-a8c8-d250e71108ea';

-- ============================================================================
-- 2) ¿Existe el negocio en core.businesses? (el businessId del API es core.businesses.id)
-- ============================================================================
SELECT 
  id,
  name,
  business_group_id,
  is_active,
  created_at
FROM core.businesses
WHERE id = '8c0a92dd-4742-4860-aad1-eba147e49931';

-- ============================================================================
-- 3) ¿El UUID es en realidad un core.stores.id? (por si el front enviara store id)
-- ============================================================================
SELECT 
  id AS store_id,
  type,
  business_id,
  business_group_id,
  name,
  is_active
FROM core.stores
WHERE id = '8c0a92dd-4742-4860-aad1-eba147e49931'
   OR (type = 'branch' AND business_id = '8c0a92dd-4742-4860-aad1-eba147e49931');

-- ============================================================================
-- 4) Todas las asignaciones del usuario en core.business_users (sus permisos)
-- ============================================================================
SELECT 
  bu.id,
  bu.business_id,
  b.name AS business_name,
  bu.role,
  bu.permissions,
  bu.is_active,
  bu.created_at
FROM core.business_users bu
JOIN core.businesses b ON b.id = bu.business_id
WHERE bu.user_id = '96849ad1-8b32-4615-a8c8-d250e71108ea'
ORDER BY bu.is_active DESC, bu.created_at DESC;

-- ============================================================================
-- 5) Comprobación directa: ¿hay fila en business_users para este user + business?
--    (Es lo que usa el backend para GET my-business?businessId=...)
-- ============================================================================
SELECT 
  bu.id,
  bu.business_id,
  bu.user_id,
  bu.role,
  bu.is_active,
  bu.permissions
FROM core.business_users bu
WHERE bu.user_id = '96849ad1-8b32-4615-a8c8-d250e71108ea'
  AND bu.business_id = '8c0a92dd-4742-4860-aad1-eba147e49931';

-- Si esta consulta devuelve 0 filas → el backend devolverá 404.
-- Si devuelve 1 fila con is_active = false → el backend también devuelve 404 (solo is_active = TRUE).

-- ============================================================================
-- 6) Lo que devuelve la función que usa el listado del frontend (resumen del usuario)
-- ============================================================================
SELECT * FROM core.get_user_businesses_summary('96849ad1-8b32-4615-a8c8-d250e71108ea'::uuid);

-- Aquí debe aparecer el negocio 8c0a92dd-4742-4860-aad1-eba147e49931 si el usuario
-- tiene acceso. Si no aparece, el dropdown en web-local no lo mostrará y/o el
-- my-business con ese businessId fallará.

-- ============================================================================
-- 7) Si el businessId que envías es un store.id (sucursal en core.stores),
--    obtener el business_id real de esa tienda para comparar con business_users
-- ============================================================================
SELECT 
  s.id AS store_id,
  s.type,
  s.business_id AS business_id_de_la_tienda,
  b.name AS business_name,
  EXISTS (
    SELECT 1 FROM core.business_users bu
    WHERE bu.user_id = '96849ad1-8b32-4615-a8c8-d250e71108ea'
      AND bu.business_id = s.business_id
      AND bu.is_active = TRUE
  ) AS usuario_tiene_permiso_en_este_negocio
FROM core.stores s
LEFT JOIN core.businesses b ON b.id = s.business_id
WHERE s.id = '8c0a92dd-4742-4860-aad1-eba147e49931'
   OR (s.type = 'branch' AND s.business_id = '8c0a92dd-4742-4860-aad1-eba147e49931');

-- ============================================================================
-- 8) RESUMEN TODO EN UNO (una sola consulta para ver el estado)
-- ============================================================================
SELECT 
  'Usuario en auth' AS check_type,
  (SELECT COUNT(*)::int FROM auth.users WHERE id = '96849ad1-8b32-4615-a8c8-d250e71108ea') AS existe,
  (SELECT email FROM auth.users WHERE id = '96849ad1-8b32-4615-a8c8-d250e71108ea') AS detalle
UNION ALL
SELECT 
  'Negocio en core.businesses',
  (SELECT COUNT(*)::int FROM core.businesses WHERE id = '8c0a92dd-4742-4860-aad1-eba147e49931'),
  (SELECT name FROM core.businesses WHERE id = '8c0a92dd-4742-4860-aad1-eba147e49931')
UNION ALL
SELECT 
  'Asignación user→business (business_users)',
  (SELECT COUNT(*)::int FROM core.business_users 
   WHERE user_id = '96849ad1-8b32-4615-a8c8-d250e71108ea' 
     AND business_id = '8c0a92dd-4742-4860-aad1-eba147e49931' 
     AND is_active = TRUE),
  (SELECT role::text || ', is_active=' || is_active::text 
   FROM core.business_users 
   WHERE user_id = '96849ad1-8b32-4615-a8c8-d250e71108ea' 
     AND business_id = '8c0a92dd-4742-4860-aad1-eba147e49931' 
   LIMIT 1)
UNION ALL
SELECT 
  'UUID como store.id en core.stores',
  (SELECT COUNT(*)::int FROM core.stores WHERE id = '8c0a92dd-4742-4860-aad1-eba147e49931'),
  (SELECT type || ' ' || COALESCE(name, '') FROM core.stores WHERE id = '8c0a92dd-4742-4860-aad1-eba147e49931' LIMIT 1);

-- Si "Asignación user→business" tiene existe=0 → ese es el motivo del 404: falta la fila
-- en core.business_users o está is_active = false. Si "Negocio en core.businesses" tiene
-- existe=0 pero "UUID como store.id" existe=1 → estás enviando store.id en vez de business.id.

-- ============================================================================
-- NOTAS
-- ============================================================================
-- - El endpoint GET /api/businesses/my-business?businessId=X espera X = core.businesses.id.
-- - Si en el frontend se envía core.stores.id (por error), el backend no encontrará
--   coincidencia en business_users (porque ahí solo está business_id = core.businesses.id).
-- - Solución: asegurar que el frontend envíe siempre core.businesses.id. El resumen
--   get_user_businesses_summary ya devuelve business_id = core.businesses.id; si en
--   algún flujo se usa store.id, hay que reemplazarlo por el business_id de esa store.
-- ============================================================================
