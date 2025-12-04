-- ============================================================================
-- AGORA ECOSYSTEM - Migración: Disponibilidad de Productos por Sucursal
-- ============================================================================
-- Descripción: Crea la estructura para gestionar la disponibilidad, precio y
--              stock de productos globales por sucursal (branch).
-- 
-- Uso: Ejecutar después de schema.sql
-- Nota: Este script es idempotente, puede ejecutarse múltiples veces sin errores
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2025-12-02
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- TABLA: Disponibilidad de Productos por Sucursal
-- ============================================================================
-- Esta tabla permite que cada producto global pueda tener diferentes
-- configuraciones (precio, stock, disponibilidad) por sucursal.

CREATE TABLE IF NOT EXISTS catalog.product_branch_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relaciones
    product_id UUID NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
    
    -- Configuración de disponibilidad
    is_enabled BOOLEAN DEFAULT FALSE, -- Si el producto está habilitado en esta sucursal
    
    -- Precio específico para esta sucursal (NULL = usar precio global del producto)
    price DECIMAL(10,2) CHECK (price IS NULL OR price >= 0),
    
    -- Stock específico para esta sucursal (NULL = sin límite o stock global)
    stock INTEGER CHECK (stock IS NULL OR stock >= 0),
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Constraint: Un producto solo puede tener una configuración por sucursal
    UNIQUE(product_id, branch_id)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_product_branch_availability_product_id 
    ON catalog.product_branch_availability(product_id);
CREATE INDEX IF NOT EXISTS idx_product_branch_availability_branch_id 
    ON catalog.product_branch_availability(branch_id);
CREATE INDEX IF NOT EXISTS idx_product_branch_availability_is_enabled 
    ON catalog.product_branch_availability(branch_id, is_enabled) 
    WHERE is_enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_product_branch_availability_is_active 
    ON catalog.product_branch_availability(is_active) 
    WHERE is_active = TRUE;

-- Comentarios
COMMENT ON TABLE catalog.product_branch_availability IS 
    'Gestiona la disponibilidad, precio y stock de productos globales por sucursal';
COMMENT ON COLUMN catalog.product_branch_availability.product_id IS 
    'ID del producto global';
COMMENT ON COLUMN catalog.product_branch_availability.branch_id IS 
    'ID de la sucursal (business)';
COMMENT ON COLUMN catalog.product_branch_availability.is_enabled IS 
    'Si el producto está habilitado para venta en esta sucursal';
COMMENT ON COLUMN catalog.product_branch_availability.price IS 
    'Precio específico para esta sucursal (NULL = usar precio global del producto)';
COMMENT ON COLUMN catalog.product_branch_availability.stock IS 
    'Stock disponible en esta sucursal (NULL = sin límite o stock global)';

-- ============================================================================
-- TRIGGER: Actualizar updated_at automáticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION update_product_branch_availability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_product_branch_availability_updated_at 
    ON catalog.product_branch_availability;
CREATE TRIGGER trigger_update_product_branch_availability_updated_at
    BEFORE UPDATE ON catalog.product_branch_availability
    FOR EACH ROW
    EXECUTE FUNCTION update_product_branch_availability_updated_at();

-- ============================================================================
-- VISTA: Productos con Disponibilidad por Sucursal
-- ============================================================================
-- Vista útil para consultar productos con su disponibilidad en cada sucursal

CREATE OR REPLACE VIEW catalog.products_with_branch_availability AS
SELECT 
    p.id AS product_id,
    p.name AS product_name,
    p.sku AS product_sku,
    p.price AS global_price,
    p.is_available AS global_is_available,
    b.id AS branch_id,
    b.name AS branch_name,
    COALESCE(pba.is_enabled, FALSE) AS is_enabled_in_branch,
    COALESCE(pba.price, p.price) AS branch_price,
    pba.stock AS branch_stock,
    pba.is_active AS availability_is_active,
    pba.created_at AS availability_created_at,
    pba.updated_at AS availability_updated_at
FROM catalog.products p
CROSS JOIN core.businesses b
LEFT JOIN catalog.product_branch_availability pba 
    ON p.id = pba.product_id 
    AND b.id = pba.branch_id
    AND pba.is_active = TRUE
WHERE b.is_active = TRUE
ORDER BY p.name, b.name;

COMMENT ON VIEW catalog.products_with_branch_availability IS 
    'Vista que muestra todos los productos con su disponibilidad en cada sucursal activa';

-- ============================================================================
-- FUNCIÓN: Obtener disponibilidad de un producto en todas las sucursales
-- ============================================================================

CREATE OR REPLACE FUNCTION catalog.get_product_branch_availability(
    p_product_id UUID
)
RETURNS TABLE (
    branch_id UUID,
    branch_name VARCHAR(255),
    is_enabled BOOLEAN,
    price DECIMAL(10,2),
    stock INTEGER,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id AS branch_id,
        b.name AS branch_name,
        COALESCE(pba.is_enabled, FALSE) AS is_enabled,
        COALESCE(pba.price, NULL) AS price,
        pba.stock,
        COALESCE(pba.is_active, TRUE) AS is_active
    FROM core.businesses b
    LEFT JOIN catalog.product_branch_availability pba 
        ON b.id = pba.branch_id 
        AND pba.product_id = p_product_id
        AND pba.is_active = TRUE
    WHERE b.is_active = TRUE
    ORDER BY b.name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION catalog.get_product_branch_availability IS 
    'Obtiene la disponibilidad de un producto en todas las sucursales activas';

-- ============================================================================
-- FUNCIÓN: Obtener productos disponibles en una sucursal específica
-- ============================================================================

CREATE OR REPLACE FUNCTION catalog.get_branch_available_products(
    p_branch_id UUID
)
RETURNS TABLE (
    product_id UUID,
    product_name VARCHAR(255),
    product_sku VARCHAR(100),
    global_price DECIMAL(10,2),
    branch_price DECIMAL(10,2),
    stock INTEGER,
    is_enabled BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id AS product_id,
        p.name AS product_name,
        p.sku AS product_sku,
        p.price AS global_price,
        COALESCE(pba.price, p.price) AS branch_price,
        pba.stock,
        COALESCE(pba.is_enabled, FALSE) AS is_enabled
    FROM catalog.products p
    LEFT JOIN catalog.product_branch_availability pba 
        ON p.id = pba.product_id 
        AND pba.branch_id = p_branch_id
        AND pba.is_active = TRUE
    WHERE p.is_available = TRUE
        AND (pba.is_enabled = TRUE OR pba.id IS NULL)
    ORDER BY p.name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION catalog.get_branch_available_products IS 
    'Obtiene todos los productos disponibles (habilitados) en una sucursal específica';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar que la tabla se creó correctamente
SELECT 
    'Tabla creada' AS status,
    COUNT(*) AS total_columns
FROM information_schema.columns
WHERE table_schema = 'catalog'
    AND table_name = 'product_branch_availability';

-- Mostrar estructura de la tabla
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'catalog'
    AND table_name = 'product_branch_availability'
ORDER BY ordinal_position;

