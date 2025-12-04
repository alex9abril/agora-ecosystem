-- ============================================================================
-- AGORA ECOSYSTEM - Migración: Relación Sucursales y Marcas de Vehículos
-- ============================================================================
-- Descripción: Crea la relación muchos-a-muchos entre sucursales (businesses)
--              y marcas de vehículos (vehicle_brands). Permite que cada
--              sucursal seleccione qué marcas comercializará.
-- 
-- Casos de uso:
-- - Una sucursal multimarca puede seleccionar múltiples marcas (Toyota, Honda, Nissan)
-- - Una sucursal especializada puede seleccionar una sola marca (solo Toyota)
-- - Una sucursal puede no tener marcas asignadas (ninguna)
-- 
-- Restricción: Cuando una sucursal crea un producto, solo puede asignar marcas
--              que estén en su lista de marcas comercializadas.
-- 
-- Uso: Ejecutar después de migration_vehicle_compatibility.sql
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2025-01-XX
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- TABLA: RELACIÓN SUCURSALES Y MARCAS DE VEHÍCULOS
-- ============================================================================
-- Relación muchos-a-muchos entre businesses (sucursales) y vehicle_brands
-- Permite que cada sucursal seleccione qué marcas comercializará

CREATE TABLE IF NOT EXISTS catalog.business_vehicle_brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relaciones
    business_id UUID NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
    vehicle_brand_id UUID NOT NULL REFERENCES catalog.vehicle_brands(id) ON DELETE CASCADE,
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Usuario que asignó la marca
    
    -- Constraint: una sucursal no puede tener la misma marca duplicada
    UNIQUE(business_id, vehicle_brand_id)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_business_vehicle_brands_business_id 
    ON catalog.business_vehicle_brands(business_id);

CREATE INDEX IF NOT EXISTS idx_business_vehicle_brands_vehicle_brand_id 
    ON catalog.business_vehicle_brands(vehicle_brand_id);

CREATE INDEX IF NOT EXISTS idx_business_vehicle_brands_is_active 
    ON catalog.business_vehicle_brands(business_id, is_active) 
    WHERE is_active = TRUE;

-- Índice compuesto para consultas frecuentes: "¿Qué marcas tiene esta sucursal?"
CREATE INDEX IF NOT EXISTS idx_business_vehicle_brands_business_active 
    ON catalog.business_vehicle_brands(business_id, vehicle_brand_id) 
    WHERE is_active = TRUE;

-- Índice compuesto para consultas frecuentes: "¿Qué sucursales comercializan esta marca?"
CREATE INDEX IF NOT EXISTS idx_business_vehicle_brands_brand_active 
    ON catalog.business_vehicle_brands(vehicle_brand_id, business_id) 
    WHERE is_active = TRUE;

-- Comentarios
COMMENT ON TABLE catalog.business_vehicle_brands IS 
    'Relación muchos-a-muchos entre sucursales y marcas de vehículos. Permite que cada sucursal seleccione qué marcas comercializará.';

COMMENT ON COLUMN catalog.business_vehicle_brands.business_id IS 
    'ID de la sucursal (negocio) que comercializa esta marca';

COMMENT ON COLUMN catalog.business_vehicle_brands.vehicle_brand_id IS 
    'ID de la marca de vehículo que la sucursal comercializa';

COMMENT ON COLUMN catalog.business_vehicle_brands.is_active IS 
    'Indica si la relación está activa. Permite desactivar temporalmente sin eliminar el registro.';

COMMENT ON COLUMN catalog.business_vehicle_brands.created_by IS 
    'Usuario que asignó esta marca a la sucursal';

-- ============================================================================
-- TRIGGER: Actualizar updated_at automáticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION catalog.update_business_vehicle_brands_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_business_vehicle_brands_updated_at
    BEFORE UPDATE ON catalog.business_vehicle_brands
    FOR EACH ROW
    EXECUTE FUNCTION catalog.update_business_vehicle_brands_updated_at();

COMMENT ON FUNCTION catalog.update_business_vehicle_brands_updated_at IS 
    'Actualiza automáticamente el campo updated_at cuando se modifica un registro';

-- ============================================================================
-- FUNCIÓN: Obtener marcas de una sucursal
-- ============================================================================
-- Retorna todas las marcas activas que comercializa una sucursal

CREATE OR REPLACE FUNCTION catalog.get_business_vehicle_brands(
    p_business_id UUID
)
RETURNS TABLE (
    brand_id UUID,
    brand_name VARCHAR(100),
    brand_code VARCHAR(50),
    display_order INTEGER,
    assigned_at TIMESTAMP,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vb.id as brand_id,
        vb.name as brand_name,
        vb.code as brand_code,
        vb.display_order,
        bvb.created_at as assigned_at,
        bvb.is_active
    FROM catalog.business_vehicle_brands bvb
    INNER JOIN catalog.vehicle_brands vb ON bvb.vehicle_brand_id = vb.id
    WHERE bvb.business_id = p_business_id
      AND bvb.is_active = TRUE
      AND vb.is_active = TRUE
    ORDER BY vb.display_order ASC, vb.name ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION catalog.get_business_vehicle_brands IS 
    'Obtiene todas las marcas de vehículos que comercializa una sucursal';

-- ============================================================================
-- FUNCIÓN: Verificar si una sucursal comercializa una marca
-- ============================================================================
-- Retorna TRUE si la sucursal tiene la marca asignada y activa

CREATE OR REPLACE FUNCTION catalog.business_commercializes_brand(
    p_business_id UUID,
    p_vehicle_brand_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1
        FROM catalog.business_vehicle_brands
        WHERE business_id = p_business_id
          AND vehicle_brand_id = p_vehicle_brand_id
          AND is_active = TRUE
    ) INTO v_exists;
    
    RETURN COALESCE(v_exists, FALSE);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION catalog.business_commercializes_brand IS 
    'Verifica si una sucursal comercializa una marca específica. Útil para validar al crear productos.';

-- ============================================================================
-- FUNCIÓN: Obtener sucursales que comercializan una marca
-- ============================================================================
-- Retorna todas las sucursales activas que comercializan una marca específica

CREATE OR REPLACE FUNCTION catalog.get_businesses_by_vehicle_brand(
    p_vehicle_brand_id UUID
)
RETURNS TABLE (
    business_id UUID,
    business_name VARCHAR(255),
    business_category VARCHAR(100),
    business_address TEXT,
    assigned_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id as business_id,
        b.name as business_name,
        b.category as business_category,
        CONCAT_WS(', ',
            NULLIF(CONCAT_WS(' ', a.street, a.street_number), ''),
            NULLIF(a.neighborhood, ''),
            NULLIF(a.city, ''),
            NULLIF(a.state, ''),
            NULLIF(a.postal_code, '')
        ) as business_address,
        bvb.created_at as assigned_at
    FROM catalog.business_vehicle_brands bvb
    INNER JOIN core.businesses b ON bvb.business_id = b.id
    LEFT JOIN core.addresses a ON b.address_id = a.id
    WHERE bvb.vehicle_brand_id = p_vehicle_brand_id
      AND bvb.is_active = TRUE
      AND b.is_active = TRUE
    ORDER BY b.name ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION catalog.get_businesses_by_vehicle_brand IS 
    'Obtiene todas las sucursales que comercializan una marca específica';

-- ============================================================================
-- VISTA: Sucursales con sus marcas comercializadas
-- ============================================================================
-- Vista que facilita consultar sucursales y sus marcas en una sola query

CREATE OR REPLACE VIEW catalog.businesses_with_vehicle_brands AS
SELECT 
    b.id as business_id,
    b.name as business_name,
    b.category as business_category,
    b.is_active as business_is_active,
    COALESCE(
        json_agg(
            json_build_object(
                'brand_id', vb.id,
                'brand_name', vb.name,
                'brand_code', vb.code,
                'display_order', vb.display_order,
                'assigned_at', bvb.created_at,
                'is_active', bvb.is_active
            ) ORDER BY vb.display_order, vb.name
        ) FILTER (WHERE vb.id IS NOT NULL),
        '[]'::json
    ) as vehicle_brands
FROM core.businesses b
LEFT JOIN catalog.business_vehicle_brands bvb 
    ON b.id = bvb.business_id 
    AND bvb.is_active = TRUE
LEFT JOIN catalog.vehicle_brands vb 
    ON bvb.vehicle_brand_id = vb.id 
    AND vb.is_active = TRUE
GROUP BY b.id, b.name, b.category, b.is_active;

COMMENT ON VIEW catalog.businesses_with_vehicle_brands IS 
    'Vista que muestra cada sucursal con un array JSON de las marcas que comercializa';

-- ============================================================================
-- NOTAS DE USO
-- ============================================================================
-- 
-- 1. ASIGNAR MARCAS A UNA SUCURSAL:
--    INSERT INTO catalog.business_vehicle_brands (business_id, vehicle_brand_id, created_by)
--    VALUES ('business-uuid', 'brand-uuid', 'user-uuid');
--
-- 2. OBTENER MARCAS DE UNA SUCURSAL:
--    SELECT * FROM catalog.get_business_vehicle_brands('business-uuid');
--
-- 3. VERIFICAR SI UNA SUCURSAL COMERCIALIZA UNA MARCA:
--    SELECT catalog.business_commercializes_brand('business-uuid', 'brand-uuid');
--
-- 4. OBTENER SUCURSALES POR MARCA:
--    SELECT * FROM catalog.get_businesses_by_vehicle_brand('brand-uuid');
--
-- 5. DESACTIVAR UNA MARCA (sin eliminar):
--    UPDATE catalog.business_vehicle_brands 
--    SET is_active = FALSE 
--    WHERE business_id = 'business-uuid' AND vehicle_brand_id = 'brand-uuid';
--
-- 6. ELIMINAR UNA MARCA DE UNA SUCURSAL:
--    DELETE FROM catalog.business_vehicle_brands 
--    WHERE business_id = 'business-uuid' AND vehicle_brand_id = 'brand-uuid';
--
-- 7. CONSULTAR SUCURSALES CON SUS MARCAS:
--    SELECT * FROM catalog.businesses_with_vehicle_brands 
--    WHERE business_id = 'business-uuid';
--
-- ============================================================================

