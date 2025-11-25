-- ============================================================================
-- MIGRACIÓN: Configuración de Campos por Tipo de Producto
-- ============================================================================
-- Descripción: Define qué campos del formulario de productos deben mostrarse
--              según el tipo de producto seleccionado.
--              Esto permite personalizar el formulario y evitar campos
--              irrelevantes (ej: alérgenos para medicamentos).
-- 
-- Uso: Ejecutar después de migration_advanced_catalog_system.sql
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2025-01-XX
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- VERIFICAR/CREAR DEPENDENCIAS
-- ============================================================================

-- Verificar que el schema catalog existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'catalog') THEN
        RAISE EXCEPTION 'El schema "catalog" no existe. Ejecuta schema.sql primero.';
    END IF;
END $$;

-- Crear el tipo product_type si no existe (dependencia de migration_advanced_catalog_system.sql)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'catalog' AND t.typname = 'product_type'
    ) THEN
        CREATE TYPE catalog.product_type AS ENUM (
            'food',           -- Alimento
            'beverage',      -- Bebida
            'medicine',       -- Medicamento (farmacia)
            'grocery',       -- Abarrotes
            'non_food'       -- No alimenticio
        );
        RAISE NOTICE 'Tipo catalog.product_type creado (normalmente se crea en migration_advanced_catalog_system.sql)';
    END IF;
END $$;

-- ============================================================================
-- TABLA: Configuración de Campos por Tipo de Producto
-- ============================================================================

CREATE TABLE IF NOT EXISTS catalog.product_type_field_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_type catalog.product_type NOT NULL,
    
    -- Nombre del campo (ej: 'allergens', 'nutritional_info', 'requires_prescription')
    field_name VARCHAR(100) NOT NULL,
    
    -- ¿Es visible este campo para este tipo de producto?
    is_visible BOOLEAN DEFAULT TRUE,
    
    -- ¿Es requerido este campo?
    is_required BOOLEAN DEFAULT FALSE,
    
    -- Orden de visualización
    display_order INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: campo único por tipo de producto
    UNIQUE(product_type, field_name)
);

CREATE INDEX IF NOT EXISTS idx_product_type_field_config_type ON catalog.product_type_field_config(product_type);
CREATE INDEX IF NOT EXISTS idx_product_type_field_config_visible ON catalog.product_type_field_config(product_type, is_visible) WHERE is_visible = TRUE;

COMMENT ON TABLE catalog.product_type_field_config IS 'Configuración de qué campos mostrar en el formulario según el tipo de producto';

-- ============================================================================
-- DATOS INICIALES: Configuración de Campos por Tipo
-- ============================================================================

-- Alimentos (food)
INSERT INTO catalog.product_type_field_config (product_type, field_name, is_visible, is_required, display_order)
VALUES
    ('food', 'name', TRUE, TRUE, 1),
    ('food', 'description', TRUE, FALSE, 2),
    ('food', 'image_url', TRUE, FALSE, 3),
    ('food', 'price', TRUE, TRUE, 4),
    ('food', 'category_id', TRUE, TRUE, 5),
    ('food', 'product_type', TRUE, TRUE, 6),
    ('food', 'is_available', TRUE, FALSE, 7),
    ('food', 'is_featured', TRUE, FALSE, 8),
    ('food', 'display_order', TRUE, FALSE, 9),
    ('food', 'variant_groups', TRUE, FALSE, 10),
    ('food', 'allergens', TRUE, FALSE, 11),
    ('food', 'nutritional_info', TRUE, FALSE, 12),
    ('food', 'requires_prescription', FALSE, FALSE, 13),
    ('food', 'age_restriction', FALSE, FALSE, 14),
    ('food', 'max_quantity_per_order', FALSE, FALSE, 15),
    ('food', 'requires_pharmacist_validation', FALSE, FALSE, 16)
ON CONFLICT (product_type, field_name) DO UPDATE SET
    is_visible = EXCLUDED.is_visible,
    is_required = EXCLUDED.is_required,
    display_order = EXCLUDED.display_order,
    updated_at = CURRENT_TIMESTAMP;

-- Bebidas (beverage)
INSERT INTO catalog.product_type_field_config (product_type, field_name, is_visible, is_required, display_order)
VALUES
    ('beverage', 'name', TRUE, TRUE, 1),
    ('beverage', 'description', TRUE, FALSE, 2),
    ('beverage', 'image_url', TRUE, FALSE, 3),
    ('beverage', 'price', TRUE, TRUE, 4),
    ('beverage', 'category_id', TRUE, TRUE, 5),
    ('beverage', 'product_type', TRUE, TRUE, 6),
    ('beverage', 'is_available', TRUE, FALSE, 7),
    ('beverage', 'is_featured', TRUE, FALSE, 8),
    ('beverage', 'display_order', TRUE, FALSE, 9),
    ('beverage', 'variant_groups', TRUE, FALSE, 10),
    ('beverage', 'allergens', TRUE, FALSE, 11),
    ('beverage', 'nutritional_info', TRUE, FALSE, 12),
    ('beverage', 'requires_prescription', FALSE, FALSE, 13),
    ('beverage', 'age_restriction', FALSE, FALSE, 14),
    ('beverage', 'max_quantity_per_order', FALSE, FALSE, 15),
    ('beverage', 'requires_pharmacist_validation', FALSE, FALSE, 16)
ON CONFLICT (product_type, field_name) DO UPDATE SET
    is_visible = EXCLUDED.is_visible,
    is_required = EXCLUDED.is_required,
    display_order = EXCLUDED.display_order,
    updated_at = CURRENT_TIMESTAMP;

-- Medicamentos (medicine)
INSERT INTO catalog.product_type_field_config (product_type, field_name, is_visible, is_required, display_order)
VALUES
    ('medicine', 'name', TRUE, TRUE, 1),
    ('medicine', 'description', TRUE, FALSE, 2),
    ('medicine', 'image_url', TRUE, FALSE, 3),
    ('medicine', 'price', TRUE, TRUE, 4),
    ('medicine', 'category_id', TRUE, TRUE, 5),
    ('medicine', 'product_type', TRUE, TRUE, 6),
    ('medicine', 'is_available', TRUE, FALSE, 7),
    ('medicine', 'is_featured', TRUE, FALSE, 8),
    ('medicine', 'display_order', TRUE, FALSE, 9),
    ('medicine', 'variant_groups', TRUE, FALSE, 10),
    ('medicine', 'allergens', FALSE, FALSE, 11), -- NO visible para medicamentos
    ('medicine', 'nutritional_info', FALSE, FALSE, 12), -- NO visible para medicamentos
    ('medicine', 'requires_prescription', TRUE, FALSE, 13),
    ('medicine', 'age_restriction', TRUE, FALSE, 14),
    ('medicine', 'max_quantity_per_order', TRUE, FALSE, 15),
    ('medicine', 'requires_pharmacist_validation', TRUE, FALSE, 16)
ON CONFLICT (product_type, field_name) DO UPDATE SET
    is_visible = EXCLUDED.is_visible,
    is_required = EXCLUDED.is_required,
    display_order = EXCLUDED.display_order,
    updated_at = CURRENT_TIMESTAMP;

-- Abarrotes (grocery)
INSERT INTO catalog.product_type_field_config (product_type, field_name, is_visible, is_required, display_order)
VALUES
    ('grocery', 'name', TRUE, TRUE, 1),
    ('grocery', 'description', TRUE, FALSE, 2),
    ('grocery', 'image_url', TRUE, FALSE, 3),
    ('grocery', 'price', TRUE, TRUE, 4),
    ('grocery', 'category_id', TRUE, TRUE, 5),
    ('grocery', 'product_type', TRUE, TRUE, 6),
    ('grocery', 'is_available', TRUE, FALSE, 7),
    ('grocery', 'is_featured', TRUE, FALSE, 8),
    ('grocery', 'display_order', TRUE, FALSE, 9),
    ('grocery', 'variant_groups', TRUE, FALSE, 10),
    ('grocery', 'allergens', TRUE, FALSE, 11),
    ('grocery', 'nutritional_info', TRUE, FALSE, 12),
    ('grocery', 'requires_prescription', FALSE, FALSE, 13),
    ('grocery', 'age_restriction', FALSE, FALSE, 14),
    ('grocery', 'max_quantity_per_order', FALSE, FALSE, 15),
    ('grocery', 'requires_pharmacist_validation', FALSE, FALSE, 16)
ON CONFLICT (product_type, field_name) DO UPDATE SET
    is_visible = EXCLUDED.is_visible,
    is_required = EXCLUDED.is_required,
    display_order = EXCLUDED.display_order,
    updated_at = CURRENT_TIMESTAMP;

-- No alimenticio (non_food)
INSERT INTO catalog.product_type_field_config (product_type, field_name, is_visible, is_required, display_order)
VALUES
    ('non_food', 'name', TRUE, TRUE, 1),
    ('non_food', 'description', TRUE, FALSE, 2),
    ('non_food', 'image_url', TRUE, FALSE, 3),
    ('non_food', 'price', TRUE, TRUE, 4),
    ('non_food', 'category_id', TRUE, TRUE, 5),
    ('non_food', 'product_type', TRUE, TRUE, 6),
    ('non_food', 'is_available', TRUE, FALSE, 7),
    ('non_food', 'is_featured', TRUE, FALSE, 8),
    ('non_food', 'display_order', TRUE, FALSE, 9),
    ('non_food', 'variant_groups', TRUE, FALSE, 10),
    ('non_food', 'allergens', FALSE, FALSE, 11), -- NO visible para no alimenticios
    ('non_food', 'nutritional_info', FALSE, FALSE, 12), -- NO visible para no alimenticios
    ('non_food', 'requires_prescription', FALSE, FALSE, 13),
    ('non_food', 'age_restriction', FALSE, FALSE, 14),
    ('non_food', 'max_quantity_per_order', FALSE, FALSE, 15),
    ('non_food', 'requires_pharmacist_validation', FALSE, FALSE, 16)
ON CONFLICT (product_type, field_name) DO UPDATE SET
    is_visible = EXCLUDED.is_visible,
    is_required = EXCLUDED.is_required,
    display_order = EXCLUDED.display_order,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- FUNCIÓN: Obtener configuración de campos por tipo de producto
-- ============================================================================

CREATE OR REPLACE FUNCTION catalog.get_product_type_field_config(
    p_product_type catalog.product_type
)
RETURNS TABLE (
    field_name VARCHAR(100),
    is_visible BOOLEAN,
    is_required BOOLEAN,
    display_order INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ptfc.field_name,
        ptfc.is_visible,
        ptfc.is_required,
        ptfc.display_order
    FROM catalog.product_type_field_config ptfc
    WHERE ptfc.product_type = p_product_type
    ORDER BY ptfc.display_order;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION catalog.get_product_type_field_config IS 'Obtiene la configuración completa de campos (visibles e invisibles) para un tipo de producto';

