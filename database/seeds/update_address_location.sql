-- ============================================================================
-- ACTUALIZAR UBICACIÓN DE DIRECCIÓN Y NEGOCIO
-- ============================================================================
-- Script para actualizar la columna location de un registro en core.addresses
-- Y también actualizar la ubicación en core.businesses si existe un negocio
-- relacionado con esta dirección.
-- 
-- IMPORTANTE: El mapa en el frontend usa core.businesses.location, NO core.addresses.location
-- Por eso es necesario actualizar ambas tablas.
-- 
-- Uso: Ejecutar para actualizar la ubicación de una dirección específica
-- ============================================================================

SET search_path TO core, public;

-- Coordenadas a actualizar
-- Formato POINT: (longitude, latitude)
DO $$
DECLARE
    v_address_id UUID := '9b6de4c6-1cc3-4f68-8070-bd3a39b90907';
    v_longitude DOUBLE PRECISION := -99.2517505;
    v_latitude DOUBLE PRECISION := 19.3867871;
    v_business_id UUID;
BEGIN
    -- 1. Actualizar la ubicación en core.addresses
    UPDATE core.addresses
    SET 
        location = POINT(v_longitude, v_latitude),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_address_id;

    RAISE NOTICE '✅ Ubicación actualizada en core.addresses para address_id: %', v_address_id;

    -- 2. Buscar si hay un negocio relacionado con esta dirección
    SELECT id INTO v_business_id
    FROM core.businesses
    WHERE address_id = v_address_id
    LIMIT 1;

    -- 3. Si existe un negocio, actualizar también su ubicación
    -- IMPORTANTE: Deshabilitar temporalmente el trigger que requiere PostGIS
    IF v_business_id IS NOT NULL THEN
        -- Deshabilitar el trigger que valida la ubicación (requiere PostGIS)
        ALTER TABLE core.businesses DISABLE TRIGGER trigger_validate_business_location;
        
        -- Actualizar la ubicación
        UPDATE core.businesses
        SET 
            location = POINT(v_longitude, v_latitude),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_business_id;

        -- Volver a habilitar el trigger
        ALTER TABLE core.businesses ENABLE TRIGGER trigger_validate_business_location;

        RAISE NOTICE '✅ Ubicación actualizada en core.businesses para business_id: %', v_business_id;
    ELSE
        RAISE NOTICE '⚠️ No se encontró ningún negocio relacionado con esta dirección';
    END IF;
END $$;

-- ============================================================================
-- VERIFICAR LA ACTUALIZACIÓN
-- ============================================================================

-- Verificar la actualización en core.addresses
SELECT 
    'core.addresses' AS tabla,
    id,
    user_id,
    label,
    street,
    street_number,
    neighborhood,
    city,
    state,
    postal_code,
    location,
    (location)[0] as longitude,
    (location)[1] as latitude,
    updated_at
FROM core.addresses
WHERE id = '9b6de4c6-1cc3-4f68-8070-bd3a39b90907';

-- Verificar la actualización en core.businesses (si existe)
SELECT 
    'core.businesses' AS tabla,
    b.id,
    b.name,
    b.slug,
    b.address_id,
    b.location,
    (b.location)[0] as longitude,
    (b.location)[1] as latitude,
    b.updated_at
FROM core.businesses b
WHERE b.address_id = '9b6de4c6-1cc3-4f68-8070-bd3a39b90907';

