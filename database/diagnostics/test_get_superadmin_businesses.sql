-- ============================================================================
-- SCRIPT DE PRUEBA: Verificar función get_superadmin_businesses
-- ============================================================================
-- Este script verifica qué está devolviendo la función get_superadmin_businesses
-- 
-- IMPORTANTE: Reemplaza el UUID del superadmin con el tuyo antes de ejecutar
-- ============================================================================

SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- UUID del superadmin (reemplaza con el tuyo)
-- Ejemplo: 'a7877018-6a38-4166-8f11-335fae96b45d'
\set superadmin_id 'a7877018-6a38-4166-8f11-335fae96b45d'

-- 1. Verificar que la función existe
SELECT 
    p.proname AS function_name,
    pg_get_function_result(p.oid) AS return_type,
    pg_get_function_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'core' 
AND p.proname = 'get_superadmin_businesses';

-- 2. Verificar la estructura de retorno de la función
SELECT 
    a.attname AS column_name,
    pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type
FROM pg_attribute a
JOIN pg_class c ON a.attrelid = c.oid
JOIN pg_type t ON c.reltype = t.oid
JOIN pg_proc p ON t.oid = p.prorettype
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'core' 
AND p.proname = 'get_superadmin_businesses'
AND a.attnum > 0
AND NOT a.attisdropped
ORDER BY a.attnum;

-- 3. Ejecutar la función y ver qué devuelve
SELECT * FROM core.get_superadmin_businesses(:'superadmin_id'::UUID);

-- 4. Verificar la relación entre businesses y addresses
SELECT 
    b.id AS business_id,
    b.name AS business_name,
    b.address_id,
    a.id AS address_id_from_table,
    a.street,
    a.street_number,
    a.neighborhood,
    a.city,
    a.state,
    a.is_active AS address_is_active
FROM core.businesses b
LEFT JOIN core.addresses a ON b.address_id = a.id
WHERE b.id IN (
    SELECT bu.business_id
    FROM core.business_users bu
    WHERE bu.user_id = :'superadmin_id'::UUID
    AND bu.role = 'superadmin'
    AND bu.is_active = TRUE
);

-- 5. Verificar la construcción de la dirección manualmente
SELECT 
    b.id AS business_id,
    b.name AS business_name,
    COALESCE(
        TRIM(
            CONCAT_WS(', ',
                NULLIF(TRIM(CONCAT_WS(' ', 
                    NULLIF(a.street, ''), 
                    NULLIF(a.street_number, '')
                )), ''),
                NULLIF(TRIM(a.neighborhood), ''),
                NULLIF(TRIM(a.city), ''),
                NULLIF(TRIM(a.state), '')
            )
        ),
        'Sin dirección'
    ) AS business_address_manual
FROM core.businesses b
INNER JOIN core.business_users bu ON b.id = bu.business_id
LEFT JOIN core.addresses a ON b.address_id = a.id AND a.is_active = TRUE
WHERE bu.user_id = :'superadmin_id'::UUID
AND bu.role = 'superadmin'
AND bu.is_active = TRUE
GROUP BY b.id, b.name, a.street, a.street_number, a.neighborhood, a.city, a.state;

