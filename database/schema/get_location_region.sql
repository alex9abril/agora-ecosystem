-- ============================================================================
-- FUNCIÓN: Obtener la región en la que está un punto
-- ============================================================================
-- Esta función retorna la región (zona) en la que está ubicado un punto.
-- Si el punto está en múltiples regiones (solapadas), retorna la primera encontrada.
-- Si no está en ninguna región, retorna NULL.
-- ============================================================================

SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- Función para obtener la región en la que está un punto
CREATE OR REPLACE FUNCTION core.get_location_region(
    p_longitude DOUBLE PRECISION,
    p_latitude DOUBLE PRECISION
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    description TEXT,
    city VARCHAR,
    state VARCHAR,
    country VARCHAR,
    center_longitude DOUBLE PRECISION,
    center_latitude DOUBLE PRECISION,
    max_delivery_radius_meters INTEGER,
    min_order_amount DECIMAL,
    coverage_area_geojson TEXT,
    is_valid BOOLEAN
) AS $$
DECLARE
    v_point GEOMETRY;
BEGIN
    -- Convertir coordenadas a punto geográfico (SRID 4326)
    v_point := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326);
    
    -- Buscar todas las regiones activas donde el punto está dentro del polígono
    RETURN QUERY
    SELECT 
        sr.id,
        sr.name,
        sr.description,
        sr.city,
        sr.state,
        sr.country,
        (sr.center_point)[0]::DOUBLE PRECISION as center_longitude,
        (sr.center_point)[1]::DOUBLE PRECISION as center_latitude,
        sr.max_delivery_radius_meters,
        sr.min_order_amount,
        ST_AsGeoJSON(sr.coverage_area)::TEXT as coverage_area_geojson,
        TRUE as is_valid
    FROM core.service_regions sr
    WHERE sr.is_active = TRUE
      AND ST_Within(v_point, sr.coverage_area)
    ORDER BY 
        -- Priorizar región por defecto
        CASE WHEN sr.is_default = TRUE THEN 0 ELSE 1 END,
        sr.name
    LIMIT 1;
    
    -- Si no se encontró ninguna región, retornar NULL con is_valid = FALSE
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            NULL::UUID as id,
            NULL::VARCHAR as name,
            NULL::TEXT as description,
            NULL::VARCHAR as city,
            NULL::VARCHAR as state,
            NULL::VARCHAR as country,
            NULL::DOUBLE PRECISION as center_longitude,
            NULL::DOUBLE PRECISION as center_latitude,
            NULL::INTEGER as max_delivery_radius_meters,
            NULL::DECIMAL as min_order_amount,
            NULL::TEXT as coverage_area_geojson,
            FALSE as is_valid;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Comentario de la función
COMMENT ON FUNCTION core.get_location_region(DOUBLE PRECISION, DOUBLE PRECISION) IS 
'Retorna la región (zona) en la que está ubicado un punto. Si el punto está en múltiples regiones, retorna la primera (priorizando la región por defecto). Si no está en ninguna región, retorna NULL con is_valid = FALSE.';

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

