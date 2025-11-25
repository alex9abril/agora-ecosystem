-- ============================================================================
-- Script para actualizar el polígono de la zona "La Roma" con un polígono más preciso
-- ============================================================================
-- 
-- Para instrucciones detalladas, consulta: docs/GUIA_ACTUALIZAR_POLIGONO.md
--
-- Este script actualiza el polígono de La Roma con el GeoJSON proporcionado
-- que fue dibujado en geojson.io
--
-- ============================================================================

-- MÉTODO 1: Usar ST_GeomFromGeoJSON (Más fácil - Recomendado)
-- El GeoJSON original era un LineString, lo convertimos a Polygon cerrado
-- Nota: El último punto se cierra automáticamente con el primero

UPDATE core.service_regions
SET coverage_area = ST_SetSRID(
    ST_GeomFromGeoJSON('{
      "type": "Polygon",
      "coordinates": [[
        [-99.17179372691365, 19.415879472016798],
        [-99.17499908835218, 19.418047223063738],
        [-99.17671903839204, 19.420465632290544],
        [-99.16866654502292, 19.422294161715683],
        [-99.15370296809482, 19.425818440999365],
        [-99.15486003554737, 19.411779825714788],
        [-99.15856574608803, 19.41167659614993],
        [-99.1592849979231, 19.41197153758894],
        [-99.16710295264993, 19.41049682504284],
        [-99.16539596156056, 19.415565417052548],
        [-99.16758368983572, 19.416797086540655],
        [-99.16947005172065, 19.41650230650258],
        [-99.17000582191038, 19.41587068114451],
        [-99.17040764955246, 19.416344400393513],
        [-99.17175823690602, 19.41586015403449],
        [-99.17179372691365, 19.415879472016798]
      ]]
    }'),
    4326
),
updated_at = CURRENT_TIMESTAMP
WHERE name = 'La Roma';

-- ============================================================================
-- Verificar el polígono actualizado
-- ============================================================================

SELECT 
    sr.name,
    ST_AsGeoJSON(sr.coverage_area)::TEXT as polygon_geojson,
    ST_AsText(sr.coverage_area) as polygon_text,
    ST_Area(sr.coverage_area::geography) / 1000000 as area_km2,
    (sr.center_point)[0]::DOUBLE PRECISION as center_longitude,
    (sr.center_point)[1]::DOUBLE PRECISION as center_latitude
FROM core.service_regions sr
WHERE sr.name = 'La Roma';

-- ============================================================================
-- Notas:
-- - El polígono se ha cerrado automáticamente (último punto = primer punto)
-- - El área se calcula en km²
-- - Las coordenadas están en formato WGS84 (SRID 4326)
-- ============================================================================
