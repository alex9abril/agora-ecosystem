-- ============================================================================
-- DIAGNÓSTICO ESPECÍFICO: Verificar relación de negocio con dirección
-- ============================================================================
-- Basado en los resultados, hay direcciones pero no se muestran en la función
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- QUERY 1: Verificar negocio específico del superadmin
-- ============================================================================
-- Reemplaza el UUID con el user_id del superadmin: a7877018-6a38-4166-8f11-335fae96b45d

SELECT 
    b.id AS business_id,
    b.name AS business_name,
    b.owner_id,
    b.address_id,
    a.id AS address_id_encontrado,
    a.street,
    a.street_number,
    a.neighborhood,
    a.city,
    a.state,
    CONCAT_WS(', ',
        NULLIF(TRIM(CONCAT_WS(' ', a.street, a.street_number)), ''),
        NULLIF(a.neighborhood, ''),
        NULLIF(a.city, ''),
        NULLIF(a.state, '')
    ) AS direccion_completa,
    CASE 
        WHEN b.address_id IS NULL THEN '❌ Negocio sin address_id'
        WHEN a.id IS NULL THEN '❌ address_id no existe en addresses'
        WHEN a.user_id != b.owner_id THEN '⚠️ Dirección pertenece a otro usuario'
        ELSE '✅ Dirección correcta'
    END AS estado
FROM core.businesses b
LEFT JOIN core.addresses a ON b.address_id = a.id
WHERE b.owner_id = 'a7877018-6a38-4166-8f11-335fae96b45d'
ORDER BY b.created_at DESC;

-- ============================================================================
-- QUERY 2: Verificar qué devuelve la función get_superadmin_businesses
-- ============================================================================
-- Ejecuta esto con el user_id del superadmin

SELECT * FROM core.get_superadmin_businesses('a7877018-6a38-4166-8f11-335fae96b45d');

-- ============================================================================
-- QUERY 3: Simular la función paso a paso
-- ============================================================================
-- Para ver exactamente qué está pasando en el JOIN

SELECT 
    b.id AS business_id,
    b.name AS business_name,
    b.owner_id,
    b.address_id AS business_address_id,
    bu.user_id AS superadmin_user_id,
    bu.role,
    bu.is_active AS bu_is_active,
    a.id AS address_id_from_join,
    a.street,
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
    ) AS business_address
FROM core.businesses b
INNER JOIN core.business_users bu ON b.id = bu.business_id
LEFT JOIN core.addresses a ON b.address_id = a.id
WHERE bu.user_id = 'a7877018-6a38-4166-8f11-335fae96b45d'
AND bu.role = 'superadmin'
AND bu.is_active = TRUE
ORDER BY b.created_at DESC;

-- ============================================================================
-- QUERY 4: Verificar si el address_id del negocio coincide con la dirección
-- ============================================================================

SELECT 
    b.id AS business_id,
    b.name AS business_name,
    b.address_id AS business_address_id,
    a.id AS address_id_encontrado,
    a.user_id AS address_user_id,
    b.owner_id AS business_owner_id,
    CASE 
        WHEN b.address_id = '6c3dbd15-73a8-45b0-a30c-424b816af992' THEN '✅ Coincide con dirección conocida'
        WHEN b.address_id IS NULL THEN '❌ address_id es NULL'
        WHEN a.id IS NULL THEN '❌ address_id no existe'
        ELSE '⚠️ address_id diferente'
    END AS verificacion
FROM core.businesses b
LEFT JOIN core.addresses a ON b.address_id = a.id
WHERE b.owner_id = 'a7877018-6a38-4166-8f11-335fae96b45d';

-- ============================================================================
-- QUERY 5: Verificar la dirección específica que sabemos que existe
-- ============================================================================

SELECT 
    a.id AS address_id,
    a.user_id,
    a.label,
    a.street,
    a.street_number,
    a.neighborhood,
    a.city,
    a.state,
    (SELECT COUNT(*) FROM core.businesses WHERE address_id = a.id) AS negocios_que_la_usen,
    (SELECT id FROM core.businesses WHERE address_id = a.id LIMIT 1) AS business_id_que_la_usa
FROM core.addresses a
WHERE a.id = '6c3dbd15-73a8-45b0-a30c-424b816af992';

-- ============================================================================
-- QUERY 6: Verificar si hay algún problema con el GROUP BY en la función
-- ============================================================================
-- Esta query simula exactamente la función pero sin GROUP BY para ver los datos crudos

SELECT 
    b.id,
    b.name,
    b.email,
    b.phone,
    b.address_id,
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
    bu.id AS business_user_id,
    bu.is_active AS bu_is_active,
    b.created_at
FROM core.businesses b
INNER JOIN core.business_users bu ON b.id = bu.business_id
LEFT JOIN core.addresses a ON b.address_id = a.id
WHERE bu.user_id = 'a7877018-6a38-4166-8f11-335fae96b45d'
AND bu.role = 'superadmin'
AND bu.is_active = TRUE;

-- ============================================================================
-- QUERY 7: Verificar si el problema es con el GROUP BY
-- ============================================================================
-- Comparar con y sin GROUP BY

-- Sin GROUP BY (datos crudos)
SELECT 
    b.id,
    b.name,
    b.address_id,
    a.street,
    a.neighborhood,
    a.city,
    a.state
FROM core.businesses b
INNER JOIN core.business_users bu ON b.id = bu.business_id
LEFT JOIN core.addresses a ON b.address_id = a.id
WHERE bu.user_id = 'a7877018-6a38-4166-8f11-335fae96b45d'
AND bu.role = 'superadmin'
AND bu.is_active = TRUE;

-- Con GROUP BY (como en la función)
SELECT 
    b.id,
    b.name,
    b.address_id,
    a.street,
    a.neighborhood,
    a.city,
    a.state,
    COUNT(bu.id) FILTER (WHERE bu.is_active = TRUE)::INTEGER AS total_users
FROM core.businesses b
INNER JOIN core.business_users bu ON b.id = bu.business_id
LEFT JOIN core.addresses a ON b.address_id = a.id
WHERE bu.user_id = 'a7877018-6a38-4166-8f11-335fae96b45d'
AND bu.role = 'superadmin'
AND bu.is_active = TRUE
GROUP BY b.id, b.name, b.email, b.phone, b.is_active, b.created_at, 
         b.address_id, a.street, a.street_number, a.neighborhood, a.city, a.state;

-- ============================================================================
-- FIN DEL SCRIPT DE DIAGNÓSTICO ESPECÍFICO
-- ============================================================================

