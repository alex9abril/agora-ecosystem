-- ============================================================================
-- AGORA ECOSYSTEM - Migration: Branch Product Backorder Settings
-- ============================================================================
-- Descripción: Agrega configuración por sucursal para permitir ventas sin stock
--              (backorder) y definir tiempos de surtido estimados.
--              Extiende vistas y funciones de disponibilidad por sucursal.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-01-19
-- Hora: 12:00:00
-- ============================================================================

-- Configuración inicial
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- TABLA: catalog.product_branch_availability (backorder por sucursal)
-- ============================================================================

ALTER TABLE catalog.product_branch_availability
ADD COLUMN IF NOT EXISTS allow_backorder BOOLEAN DEFAULT FALSE;

ALTER TABLE catalog.product_branch_availability
ADD COLUMN IF NOT EXISTS backorder_lead_time_days INTEGER
    CHECK (backorder_lead_time_days IS NULL OR backorder_lead_time_days >= 0);

ALTER TABLE catalog.product_branch_availability
ADD COLUMN IF NOT EXISTS backorder_notes TEXT;

COMMENT ON COLUMN catalog.product_branch_availability.allow_backorder IS
    'Permite vender sin stock (backorder) en esta sucursal';
COMMENT ON COLUMN catalog.product_branch_availability.backorder_lead_time_days IS
    'Días estimados adicionales para surtir cuando no hay stock';
COMMENT ON COLUMN catalog.product_branch_availability.backorder_notes IS
    'Notas para el cliente sobre el backorder (ej: se pide a proveedor)';

-- ============================================================================
-- VISTA: catalog.products_with_branch_availability (extender columnas)
-- ============================================================================

DROP VIEW IF EXISTS catalog.products_with_branch_availability;

CREATE VIEW catalog.products_with_branch_availability AS
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
    COALESCE(pba.allow_backorder, FALSE) AS allow_backorder,
    pba.backorder_lead_time_days AS backorder_lead_time_days,
    pba.backorder_notes AS backorder_notes,
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
    'Vista que muestra todos los productos con su disponibilidad y backorder por sucursal activa';

-- ============================================================================
-- FUNCIÓN: catalog.get_product_branch_availability (extender retorno)
-- ============================================================================

DROP FUNCTION IF EXISTS catalog.get_product_branch_availability(UUID);

CREATE OR REPLACE FUNCTION catalog.get_product_branch_availability(
    p_product_id UUID
)
RETURNS TABLE (
    branch_id UUID,
    branch_name VARCHAR(255),
    is_enabled BOOLEAN,
    price DECIMAL(10,2),
    stock INTEGER,
    allow_backorder BOOLEAN,
    backorder_lead_time_days INTEGER,
    backorder_notes TEXT,
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
        COALESCE(pba.allow_backorder, FALSE) AS allow_backorder,
        pba.backorder_lead_time_days,
        pba.backorder_notes,
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
    'Obtiene la disponibilidad y backorder de un producto en todas las sucursales activas';

-- ============================================================================
-- FUNCIÓN: catalog.get_branch_available_products (considerar backorder)
-- ============================================================================

DROP FUNCTION IF EXISTS catalog.get_branch_available_products(UUID);

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
    is_enabled BOOLEAN,
    allow_backorder BOOLEAN,
    backorder_lead_time_days INTEGER,
    backorder_notes TEXT
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
        COALESCE(pba.is_enabled, FALSE) AS is_enabled,
        COALESCE(pba.allow_backorder, FALSE) AS allow_backorder,
        pba.backorder_lead_time_days,
        pba.backorder_notes
    FROM catalog.products p
    LEFT JOIN catalog.product_branch_availability pba 
        ON p.id = pba.product_id 
        AND pba.branch_id = p_branch_id
        AND pba.is_active = TRUE
    WHERE p.is_available = TRUE
        AND (pba.is_enabled = TRUE OR pba.id IS NULL)
        AND (
            pba.id IS NULL
            OR pba.stock IS NULL
            OR pba.stock > 0
            OR pba.allow_backorder = TRUE
        )
    ORDER BY p.name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION catalog.get_branch_available_products IS 
    'Obtiene productos habilitados en una sucursal considerando stock y backorder';

-- ============================================================================
-- VERIFICACIONES
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'catalog'
          AND table_name = 'product_branch_availability'
          AND column_name = 'allow_backorder'
    ) THEN
        RAISE EXCEPTION 'Falta columna allow_backorder en catalog.product_branch_availability';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'catalog'
          AND table_name = 'product_branch_availability'
          AND column_name = 'backorder_lead_time_days'
    ) THEN
        RAISE EXCEPTION 'Falta columna backorder_lead_time_days en catalog.product_branch_availability';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'catalog'
          AND table_name = 'product_branch_availability'
          AND column_name = 'backorder_notes'
    ) THEN
        RAISE EXCEPTION 'Falta columna backorder_notes en catalog.product_branch_availability';
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'catalog'
          AND table_name = 'products_with_branch_availability'
          AND column_name = 'allow_backorder'
    ) THEN
        RAISE EXCEPTION 'Vista products_with_branch_availability no incluye allow_backorder';
    END IF;
END;
$$;

-- ============================================================================
-- NOTAS:
-- ============================================================================
-- 1. stock IS NULL conserva el significado actual: stock sin límite.
-- 2. Para permitir ventas sin stock, usar allow_backorder = TRUE.
-- 3. backorder_lead_time_days es informativo para tiempos de surtido.
-- ============================================================================
