-- ============================================================================
-- DIAGNÓSTICO: Relación entre Negocios y Direcciones
-- ============================================================================
-- Este script contiene queries para diagnosticar por qué las tiendas
-- muestran "Sin dirección" en el gestor de usuarios.
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- QUERY 1: Verificar estructura de la relación
-- ============================================================================
-- Muestra cómo se relacionan businesses con addresses

SELECT 
    'Estructura de relación' AS consulta,
    'businesses.address_id → addresses.id' AS relacion,
    'addresses.user_id → auth.users.id (del owner)' AS nota;

-- ============================================================================
-- QUERY 2: Ver todos los negocios y su address_id
-- ============================================================================
-- Muestra qué negocios tienen address_id y cuáles no

SELECT 
    b.id AS business_id,
    b.name AS business_name,
    b.owner_id,
    b.address_id,
    CASE 
        WHEN b.address_id IS NULL THEN '❌ Sin address_id'
        ELSE '✅ Tiene address_id'
    END AS estado_address_id,
    (location)[0] AS longitude,
    (location)[1] AS latitude
FROM core.businesses b
ORDER BY b.created_at DESC;

-- ============================================================================
-- QUERY 3: Ver negocios con sus direcciones (si existen)
-- ============================================================================
-- Muestra los negocios y sus direcciones relacionadas

SELECT 
    b.id AS business_id,
    b.name AS business_name,
    b.owner_id,
    b.address_id,
    a.id AS address_id_encontrado,
    a.user_id AS address_user_id,
    a.street,
    a.street_number,
    a.neighborhood,
    a.city,
    a.state,
    a.postal_code,
    CASE 
        WHEN b.address_id IS NULL THEN '❌ Negocio sin address_id'
        WHEN a.id IS NULL THEN '❌ address_id no existe en addresses'
        WHEN a.user_id != b.owner_id THEN '⚠️ Dirección pertenece a otro usuario'
        ELSE '✅ Dirección correcta'
    END AS estado
FROM core.businesses b
LEFT JOIN core.addresses a ON b.address_id = a.id
ORDER BY b.created_at DESC;

-- ============================================================================
-- QUERY 4: Ver direcciones del owner que podrían estar disponibles
-- ============================================================================
-- Muestra direcciones que pertenecen al owner pero que no están asignadas al negocio

SELECT 
    b.id AS business_id,
    b.name AS business_name,
    b.owner_id,
    b.address_id AS address_id_asignado,
    a.id AS address_id_disponible,
    a.label,
    CONCAT_WS(', ',
        NULLIF(TRIM(CONCAT_WS(' ', a.street, a.street_number)), ''),
        NULLIF(a.neighborhood, ''),
        NULLIF(a.city, ''),
        NULLIF(a.state, '')
    ) AS direccion_completa,
    CASE 
        WHEN b.address_id IS NULL AND a.user_id = b.owner_id THEN '💡 Dirección disponible para asignar'
        ELSE 'N/A'
    END AS sugerencia
FROM core.businesses b
LEFT JOIN core.addresses a ON a.user_id = b.owner_id AND a.label = 'Local'
WHERE b.address_id IS NULL
ORDER BY b.created_at DESC;

-- ============================================================================
-- QUERY 5: Contar direcciones por owner
-- ============================================================================
-- Muestra cuántas direcciones tiene cada owner

SELECT 
    b.owner_id,
    au.email AS owner_email,
    COUNT(DISTINCT b.id) AS total_negocios,
    COUNT(DISTINCT b.address_id) FILTER (WHERE b.address_id IS NOT NULL) AS negocios_con_address,
    COUNT(DISTINCT a.id) FILTER (WHERE a.user_id = b.owner_id) AS direcciones_del_owner,
    COUNT(DISTINCT a.id) FILTER (WHERE a.user_id = b.owner_id AND a.label = 'Local') AS direcciones_tipo_local
FROM core.businesses b
INNER JOIN auth.users au ON b.owner_id = au.id
LEFT JOIN core.addresses a ON a.user_id = b.owner_id
GROUP BY b.owner_id, au.email
ORDER BY total_negocios DESC;

-- ============================================================================
-- QUERY 6: Verificar función get_superadmin_businesses
-- ============================================================================
-- Prueba la función que se usa en el backend

-- Primero, obtener un superadmin_id de ejemplo
SELECT 
    'Ejemplo de superadmin_id' AS info,
    bu.user_id AS superadmin_id,
    au.email AS superadmin_email,
    b.id AS business_id,
    b.name AS business_name
FROM core.business_users bu
INNER JOIN auth.users au ON bu.user_id = au.id
INNER JOIN core.businesses b ON bu.business_id = b.id
WHERE bu.role = 'superadmin'
AND bu.is_active = TRUE
LIMIT 1;

-- Luego, ejecutar la función con ese ID (reemplaza el UUID)
-- SELECT * FROM core.get_superadmin_businesses('UUID-DEL-SUPERADMIN-AQUI');

-- ============================================================================
-- QUERY 7: Verificar datos que devuelve la función
-- ============================================================================
-- Simula lo que hace la función get_superadmin_businesses

SELECT 
    b.id AS business_id,
    b.name AS business_name,
    b.email AS business_email,
    b.phone AS business_phone,
    b.address_id,
    a.id AS address_id_encontrado,
    a.street,
    a.street_number,
    a.neighborhood,
    a.city,
    a.state,
    COALESCE(
        CONCAT_WS(', ',
            NULLIF(TRIM(CONCAT_WS(' ', a.street, a.street_number)), ''),
            NULLIF(a.neighborhood, ''),
            NULLIF(a.city, ''),
            NULLIF(a.state, '')
        ),
        'Sin dirección'
    ) AS business_address,
    b.is_active,
    COUNT(bu.id) FILTER (WHERE bu.is_active = TRUE)::INTEGER AS total_users,
    b.created_at
FROM core.businesses b
INNER JOIN core.business_users bu ON b.id = bu.business_id
LEFT JOIN core.addresses a ON b.address_id = a.id
WHERE bu.user_id IN (
    SELECT user_id 
    FROM core.business_users 
    WHERE role = 'superadmin' 
    AND is_active = TRUE 
    LIMIT 1
)
AND bu.role = 'superadmin'
AND bu.is_active = TRUE
GROUP BY b.id, b.name, b.email, b.phone, b.is_active, b.created_at, 
         b.address_id, a.id, a.street, a.street_number, a.neighborhood, a.city, a.state
ORDER BY b.created_at DESC;

-- ============================================================================
-- QUERY 8: Ver todas las direcciones disponibles
-- ============================================================================
-- Muestra todas las direcciones en la base de datos

SELECT 
    a.id AS address_id,
    a.user_id,
    au.email AS user_email,
    a.label,
    CONCAT_WS(', ',
        NULLIF(TRIM(CONCAT_WS(' ', a.street, a.street_number)), ''),
        NULLIF(a.neighborhood, ''),
        NULLIF(a.city, ''),
        NULLIF(a.state, '')
    ) AS direccion_completa,
    a.is_active,
    a.is_default,
    a.created_at,
    -- Verificar si está asignada a algún negocio
    (SELECT COUNT(*) FROM core.businesses WHERE address_id = a.id) AS negocios_que_la_usen
FROM core.addresses a
INNER JOIN auth.users au ON a.user_id = au.id
ORDER BY a.created_at DESC;

-- ============================================================================
-- FIN DEL SCRIPT DE DIAGNÓSTICO
-- ============================================================================
-- Ejecuta estas queries en orden para diagnosticar el problema.
-- Las queries 2, 3 y 7 son las más importantes para identificar el problema.
-- ============================================================================

