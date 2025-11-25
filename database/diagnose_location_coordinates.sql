-- ============================================================================
-- DIAGNÓSTICO: Verificar coordenadas de geolocalización
-- ============================================================================
-- Este script ayuda a diagnosticar problemas con las coordenadas de geolocalización
-- Verifica cómo se están guardando y recuperando las coordenadas
-- ============================================================================

SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- 1. Verificar cómo se almacenan las coordenadas en core.businesses
SELECT 
    'Negocios - Formato de location' AS info,
    id,
    name,
    location,
    location::text AS location_text,
    (location)[0] AS extracted_longitude,
    (location)[1] AS extracted_latitude,
    location[0] AS direct_longitude,
    location[1] AS direct_latitude
FROM core.businesses
LIMIT 5;

-- 2. Verificar cómo se almacenan las coordenadas en core.addresses
SELECT 
    'Direcciones - Formato de location' AS info,
    id,
    label,
    street,
    location,
    location::text AS location_text,
    (location)[0] AS extracted_longitude,
    (location)[1] AS extracted_latitude
FROM core.addresses
WHERE location IS NOT NULL
LIMIT 5;

-- 3. Comparar coordenadas entre businesses y addresses relacionadas
SELECT 
    'Comparación businesses vs addresses' AS info,
    b.id AS business_id,
    b.name AS business_name,
    (b.location)[0] AS business_longitude,
    (b.location)[1] AS business_latitude,
    a.id AS address_id,
    (a.location)[0] AS address_longitude,
    (a.location)[1] AS address_latitude,
    CASE 
        WHEN (b.location)[0] = (a.location)[0] AND (b.location)[1] = (a.location)[1] 
        THEN '✅ Coinciden'
        ELSE '❌ NO coinciden'
    END AS match_status
FROM core.businesses b
LEFT JOIN core.addresses a ON b.address_id = a.id
WHERE b.location IS NOT NULL
LIMIT 10;

-- 4. Verificar el orden de coordenadas usando ST_MakePoint
-- En PostgreSQL POINT, el orden es (x, y) donde x=longitude, y=latitude
SELECT 
    'Prueba ST_MakePoint' AS info,
    ST_MakePoint(-99.1600, 19.4220)::point AS test_point,
    ST_MakePoint(-99.1600, 19.4220)::text AS test_point_text,
    (ST_MakePoint(-99.1600, 19.4220)::point)[0] AS extracted_x_longitude,
    (ST_MakePoint(-99.1600, 19.4220)::point)[1] AS extracted_y_latitude;

-- 5. Verificar si hay negocios con coordenadas invertidas
-- (Si la latitud es mayor que 90 o menor que -90, o si la longitud está fuera de rango)
SELECT 
    'Negocios con coordenadas potencialmente incorrectas' AS info,
    id,
    name,
    (location)[0] AS longitude,
    (location)[1] AS latitude,
    CASE 
        WHEN (location)[0] < -180 OR (location)[0] > 180 THEN '❌ Longitud fuera de rango'
        WHEN (location)[1] < -90 OR (location)[1] > 90 THEN '❌ Latitud fuera de rango'
        WHEN ABS((location)[0]) > 90 THEN '⚠️  Posible inversión (longitud > 90)'
        WHEN ABS((location)[1]) > 180 THEN '⚠️  Posible inversión (latitud > 180)'
        ELSE '✅ Coordenadas válidas'
    END AS validation_status
FROM core.businesses
WHERE (location)[0] < -180 OR (location)[0] > 180 
   OR (location)[1] < -90 OR (location)[1] > 90
   OR ABS((location)[0]) > 90
   OR ABS((location)[1]) > 180;

-- 6. Mostrar un ejemplo completo de un negocio con su dirección
SELECT 
    'Ejemplo completo de negocio' AS info,
    b.id,
    b.name,
    b.location AS business_location,
    (b.location)[0] AS business_longitude,
    (b.location)[1] AS business_latitude,
    a.id AS address_id,
    a.location AS address_location,
    (a.location)[0] AS address_longitude,
    (a.location)[1] AS address_latitude,
    CONCAT_WS(', ',
        NULLIF(CONCAT_WS(' ', a.street, a.street_number), ''),
        NULLIF(a.neighborhood, ''),
        NULLIF(a.city, ''),
        NULLIF(a.state, '')
    ) AS full_address
FROM core.businesses b
LEFT JOIN core.addresses a ON b.address_id = a.id
ORDER BY b.created_at DESC
LIMIT 3;

