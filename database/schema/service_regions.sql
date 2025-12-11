-- ============================================================================
-- GESTIÓN DE REGIONES/ZONAS DE COBERTURA
-- ============================================================================
-- Descripción: Sistema para gestionar las zonas geográficas donde el servicio
--              está disponible. Permite definir polígonos de cobertura y
--              validar si una ubicación está dentro de la zona activa.
-- 
-- Uso: Ejecutar después de schema.sql para crear el sistema de regiones
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2024-11-18
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- CREAR TABLA DE REGIONES DE SERVICIO
-- ============================================================================

CREATE TABLE IF NOT EXISTS core.service_regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Información de la región
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) DEFAULT 'México',
    
    -- Polígono de cobertura (usando PostGIS)
    -- ST_Polygon o ST_MultiPolygon para definir el área de cobertura
    coverage_area GEOMETRY(POLYGON, 4326) NOT NULL, -- SRID 4326 = WGS84
    
    -- Centro de la región (para centrar mapas)
    center_point POINT NOT NULL, -- (longitude, latitude)
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE, -- Solo una región puede ser default
    
    -- Configuración operativa
    max_delivery_radius_meters INTEGER DEFAULT 3000, -- Radio máximo de entrega en metros
    min_order_amount DECIMAL(10,2) DEFAULT 0.00, -- Monto mínimo de pedido para esta región
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices espaciales para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_service_regions_coverage_area ON core.service_regions USING GIST(coverage_area);
CREATE INDEX IF NOT EXISTS idx_service_regions_center_point ON core.service_regions USING GIST(center_point);
CREATE INDEX IF NOT EXISTS idx_service_regions_is_active ON core.service_regions(is_active);
CREATE INDEX IF NOT EXISTS idx_service_regions_is_default ON core.service_regions(is_default);

-- Constraint: Solo una región puede ser default
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_regions_single_default 
ON core.service_regions(is_default) 
WHERE is_default = TRUE;

-- ============================================================================
-- FUNCIÓN PARA VALIDAR SI UN PUNTO ESTÁ DENTRO DE UNA REGIÓN
-- ============================================================================

CREATE OR REPLACE FUNCTION core.is_location_in_region(
    p_longitude DOUBLE PRECISION,
    p_latitude DOUBLE PRECISION,
    p_region_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_region_id UUID;
    v_point GEOMETRY;
    v_result BOOLEAN;
BEGIN
    -- Convertir coordenadas a punto geográfico (SRID 4326)
    v_point := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326);
    
    -- Si no se especifica región, usar la región activa por defecto
    IF p_region_id IS NULL THEN
        SELECT id INTO v_region_id
        FROM core.service_regions
        WHERE is_default = TRUE AND is_active = TRUE
        LIMIT 1;
    ELSE
        v_region_id := p_region_id;
    END IF;
    
    -- Si no hay región activa, retornar false
    IF v_region_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar si el punto está dentro del polígono de cobertura
    SELECT ST_Within(v_point, coverage_area) INTO v_result
    FROM core.service_regions
    WHERE id = v_region_id AND is_active = TRUE;
    
    RETURN COALESCE(v_result, FALSE);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCIÓN PARA OBTENER LA REGIÓN ACTIVA POR DEFECTO
-- ============================================================================

CREATE OR REPLACE FUNCTION core.get_active_region()
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
    coverage_area_geojson TEXT
) AS $$
BEGIN
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
        ST_AsGeoJSON(sr.coverage_area)::TEXT as coverage_area_geojson
    FROM core.service_regions sr
    WHERE sr.is_default = TRUE AND sr.is_active = TRUE
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INSERTAR REGIÓN DE LA ROMA CDMX
-- ============================================================================

-- Coordenadas aproximadas de La Roma (Roma Norte y Roma Sur)
-- Centro: Avenida Álvaro Obregón y Calle Orizaba
-- Polígono aproximado que cubre La Roma
-- NOTA: Estos son valores aproximados, deberías ajustarlos con coordenadas exactas

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
) VALUES (
    'La Roma',
    'Zona de cobertura inicial: Colonia Roma Norte y Roma Sur, CDMX',
    'Ciudad de México',
    'CDMX',
    'México',
    -- Polígono aproximado de La Roma (ajustar con coordenadas exactas)
    -- Formato: POLYGON((lon1 lat1, lon2 lat2, lon3 lat3, lon4 lat4, lon1 lat1))
    -- Coordenadas aproximadas (deberías usar un servicio de geocodificación para obtener el polígono exacto)
    -- Esquina suroeste: -99.1700 19.4150
    -- Esquina sureste: -99.1500 19.4150
    -- Esquina noreste: -99.1500 19.4300
    -- Esquina noroeste: -99.1700 19.4300
    ST_SetSRID(
        ST_GeomFromText(
            'POLYGON((
                -99.1700 19.4150,
                -99.1500 19.4150,
                -99.1500 19.4300,
                -99.1700 19.4300,
                -99.1700 19.4150
            ))'
        ),
        4326
    ),
    ST_MakePoint(-99.1600, 19.4220)::point, -- Centro: Avenida Álvaro Obregón
    TRUE,
    TRUE,
    3000, -- 3 km de radio máximo
    0.00  -- Sin monto mínimo
)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    coverage_area = EXCLUDED.coverage_area,
    center_point = EXCLUDED.center_point,
    is_active = EXCLUDED.is_active,
    is_default = EXCLUDED.is_default,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- ACTUALIZAR TABLA BUSINESSES PARA AGREGAR VALIDACIÓN DE REGIÓN
-- ============================================================================

-- Agregar columna para almacenar la región del negocio
ALTER TABLE core.businesses 
ADD COLUMN IF NOT EXISTS service_region_id UUID REFERENCES core.service_regions(id) ON DELETE SET NULL;

-- Crear índice
CREATE INDEX IF NOT EXISTS idx_businesses_service_region_id ON core.businesses(service_region_id);

-- Función para validar y asignar región al crear/actualizar un negocio
CREATE OR REPLACE FUNCTION core.validate_business_location()
RETURNS TRIGGER AS $$
DECLARE
    v_region_id UUID;
    v_is_in_region BOOLEAN;
BEGIN
    -- Obtener la región activa por defecto
    SELECT id INTO v_region_id
    FROM core.service_regions
    WHERE is_default = TRUE AND is_active = TRUE
    LIMIT 1;
    
    -- Si no hay región activa, permitir el negocio pero marcar como fuera de zona
    IF v_region_id IS NULL THEN
        NEW.service_region_id := NULL;
        RETURN NEW;
    END IF;
    
    -- Validar si la ubicación está dentro de la región
    SELECT core.is_location_in_region(
        (NEW.location)[0]::DOUBLE PRECISION,
        (NEW.location)[1]::DOUBLE PRECISION,
        v_region_id
    ) INTO v_is_in_region;
    
    -- Si está dentro de la región, asignar la región
    IF v_is_in_region THEN
        NEW.service_region_id := v_region_id;
    ELSE
        -- Si no está en la región, no asignar región (el negocio quedará fuera de zona)
        NEW.service_region_id := NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para validar automáticamente la ubicación
DROP TRIGGER IF EXISTS trigger_validate_business_location ON core.businesses;
CREATE TRIGGER trigger_validate_business_location
    BEFORE INSERT OR UPDATE OF location ON core.businesses
    FOR EACH ROW
    EXECUTE FUNCTION core.validate_business_location();

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================

-- 1. El polígono de La Roma es aproximado. Para obtener coordenadas exactas:
--    - Usa Google Maps API para obtener el polígono de la colonia
--    - O usa herramientas como geojson.io para dibujar el área exacta
--    - Las coordenadas deben estar en formato WGS84 (SRID 4326)

-- 2. Para actualizar el polígono de La Roma con coordenadas exactas:
--    UPDATE core.service_regions
--    SET coverage_area = ST_SetSRID(ST_GeomFromText('POLYGON((...))'), 4326)
--    WHERE name = 'La Roma';

-- 3. Para agregar más regiones en el futuro:
--    INSERT INTO core.service_regions (name, coverage_area, center_point, ...)
--    VALUES (...);

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

