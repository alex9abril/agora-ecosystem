-- ============================================================================
-- INSERTAR/ACTUALIZAR ZONA DE COBERTURA: NUEVA ZONA
-- ============================================================================
-- Descripción: Script para insertar o actualizar una zona de cobertura
--              usando un polígono GeoJSON o POLYGON
-- 
-- Uso: Ejecutar después de service_regions.sql
-- Nota: Reemplaza las coordenadas del polígono con las de tu nueva zona
-- ============================================================================

SET search_path TO core, public;

-- ============================================================================
-- INSERTAR/ACTUALIZAR ZONA DE COBERTURA
-- ============================================================================
-- Convertir el polígono a geometría PostGIS y calcular el centro
-- Nota: El polígono debe estar cerrado (primer punto = último punto)

WITH new_zone_polygon AS (
    SELECT ST_SetSRID(
        ST_GeomFromText(
            'POLYGON((
                -99.2600 19.3800,
                -99.2400 19.3800,
                -99.2400 19.4000,
                -99.2600 19.4000,
                -99.2600 19.3800
            ))'
        ),
        4326
    ) AS geom
)
INSERT INTO core.service_regions (
    name,
    description,
    city,
    state,
    country,
    coverage_area,
    center_point,
    is_active,
    is_default,
    max_delivery_radius_meters,
    min_order_amount
)
SELECT 
    'Nueva Zona',  -- Cambiar el nombre según corresponda
    'Zona de cobertura: Descripción de la nueva zona de cobertura',
    'Ciudad de México',  -- Ajustar según la ubicación
    'CDMX',  -- Ajustar según la ubicación
    'México',
    geom AS coverage_area,
    ST_Centroid(geom)::point AS center_point,
    TRUE,  -- is_active
    FALSE,  -- is_default (cambiar a TRUE solo si quieres que sea la zona por defecto)
    3000,  -- max_delivery_radius_meters (3 km - ajustar según necesidades)
    0.00   -- min_order_amount
FROM new_zone_polygon
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    coverage_area = EXCLUDED.coverage_area,
    center_point = EXCLUDED.center_point,
    is_active = EXCLUDED.is_active,
    is_default = EXCLUDED.is_default,
    max_delivery_radius_meters = EXCLUDED.max_delivery_radius_meters,
    min_order_amount = EXCLUDED.min_order_amount,
    updated_at = CURRENT_TIMESTAMP;

-- Verificar que se insertó correctamente
SELECT 
    id,
    name,
    city,
    state,
    country,
    ST_AsGeoJSON(coverage_area)::jsonb as coverage_area_geojson,
    ST_AsText(center_point) as center_point,
    (center_point)[0] as center_longitude,
    (center_point)[1] as center_latitude,
    is_active,
    is_default,
    max_delivery_radius_meters,
    min_order_amount,
    created_at,
    updated_at
FROM core.service_regions
WHERE name = 'Nueva Zona';

-- Comentario: Para verificar si un punto está dentro de la zona, puedes usar:
-- SELECT core.is_location_in_region(-99.2500, 19.3900, (SELECT id FROM core.service_regions WHERE name = 'Nueva Zona'));


