-- Script para diagnosticar qué tiendas están dentro de la zona "La Roma"
-- y por qué algunas no aparecen

-- 1. Ver todas las tiendas con sus coordenadas
SELECT 
    b.id,
    b.name,
    (b.location)[0]::DOUBLE PRECISION as longitude,
    (b.location)[1]::DOUBLE PRECISION as latitude,
    b.service_region_id,
    b.is_active
FROM core.businesses b
WHERE b.location IS NOT NULL
ORDER BY b.name;

-- 2. Ver el polígono de la zona "La Roma"
SELECT 
    sr.id,
    sr.name,
    ST_AsText(sr.coverage_area) as polygon_text,
    ST_AsGeoJSON(sr.coverage_area)::TEXT as polygon_geojson,
    (sr.center_point)[0]::DOUBLE PRECISION as center_longitude,
    (sr.center_point)[1]::DOUBLE PRECISION as center_latitude
FROM core.service_regions sr
WHERE sr.name = 'La Roma';

-- 3. Verificar si cada tienda está dentro del polígono de "La Roma"
SELECT 
    b.id,
    b.name,
    (b.location)[0]::DOUBLE PRECISION as longitude,
    (b.location)[1]::DOUBLE PRECISION as latitude,
    sr.name as zone_name,
    ST_Within(
        ST_SetSRID(ST_MakePoint((b.location)[0], (b.location)[1]), 4326),
        sr.coverage_area
    ) as is_within_zone,
    b.service_region_id,
    CASE 
        WHEN b.service_region_id = sr.id THEN 'Asignada correctamente'
        WHEN b.service_region_id IS NULL THEN 'Sin región asignada'
        ELSE 'Asignada a otra región'
    END as region_status
FROM core.businesses b
CROSS JOIN core.service_regions sr
WHERE sr.name = 'La Roma'
  AND sr.is_active = TRUE
  AND b.location IS NOT NULL
ORDER BY b.name;

-- 4. Verificar con la función is_location_in_region
SELECT 
    b.id,
    b.name,
    (b.location)[0]::DOUBLE PRECISION as longitude,
    (b.location)[1]::DOUBLE PRECISION as latitude,
    core.is_location_in_region(
        (b.location)[0]::DOUBLE PRECISION,
        (b.location)[1]::DOUBLE PRECISION,
        (SELECT id FROM core.service_regions WHERE name = 'La Roma' AND is_active = TRUE LIMIT 1)
    ) as is_in_region_function
FROM core.businesses b
WHERE b.location IS NOT NULL
ORDER BY b.name;

-- 5. Verificar el área del polígono (para debugging)
SELECT 
    sr.name,
    ST_Area(sr.coverage_area::geography) / 1000000 as area_km2,
    ST_Perimeter(sr.coverage_area::geography) / 1000 as perimeter_km
FROM core.service_regions sr
WHERE sr.name = 'La Roma';

