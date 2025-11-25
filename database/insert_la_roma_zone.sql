-- ============================================================================
-- INSERTAR/ACTUALIZAR ZONA DE COBERTURA: LA ROMA
-- ============================================================================
-- Descripción: Script para insertar o actualizar la zona de cobertura de La Roma
--              usando el GeoJSON proporcionado
-- 
-- Uso: Ejecutar después de service_regions.sql
-- ============================================================================

SET search_path TO core, public;

-- ============================================================================
-- INSERTAR/ACTUALIZAR ZONA DE COBERTURA: LA ROMA
-- ============================================================================
-- Convertir el LineString del GeoJSON a POLYGON y calcular el centro
-- El GeoJSON tiene un LineString que necesitamos convertir a POLYGON cerrado
-- Nota: El polígono debe estar cerrado (primer punto = último punto)

WITH la_roma_polygon AS (
    SELECT ST_SetSRID(
        ST_GeomFromText(
            'POLYGON((
                -99.17394158100626 19.42121338154186,
                -99.15366649723644 19.42585389470402,
                -99.15476324884375 19.411750237783224,
                -99.15891311979067 19.4116803454547,
                -99.1593577488211 19.41187604389806,
                -99.15990612462457 19.411834108537036,
                -99.16707947297596 19.410478192708695,
                -99.16493043266418 19.41725765877179,
                -99.16949529070561 19.416349086942233,
                -99.1700881294123 19.41592974438514,
                -99.17034008586283 19.41633510887435,
                -99.17173325682349 19.415817919520677,
                -99.17502351164585 19.418068380116182,
                -99.17672792292761 19.420556430717355,
                -99.17395640197401 19.42118542624233,
                -99.17394158100626 19.42121338154186
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
    'La Roma',
    'Zona de cobertura: Colonia Roma Norte y Roma Sur, CDMX. Área de entrega para restaurantes y negocios locales.',
    'Ciudad de México',
    'CDMX',
    'México',
    geom AS coverage_area,
    ST_Centroid(geom)::point AS center_point,
    TRUE,  -- is_active
    TRUE,  -- is_default (puedes cambiar a FALSE si ya tienes otra región por defecto)
    3000,  -- max_delivery_radius_meters (3 km)
    0.00   -- min_order_amount
FROM la_roma_polygon
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
    ST_AsGeoJSON(coverage_area)::jsonb as coverage_area_geojson,
    ST_AsText(center_point) as center_point,
    ST_X(center_point::geometry) as center_longitude,
    ST_Y(center_point::geometry) as center_latitude,
    is_active,
    is_default,
    max_delivery_radius_meters,
    min_order_amount
FROM core.service_regions
WHERE name = 'La Roma';

-- Comentario: Para verificar si un punto está dentro de la zona, puedes usar:
-- SELECT core.is_location_in_region(-99.1650, 19.4200, (SELECT id FROM core.service_regions WHERE name = 'La Roma'));

