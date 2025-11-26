-- SISTEMA DE IMPUESTOS CONFIGURABLE
-- ============================================================================
-- Descripción: Implementación de sistema de impuestos configurable
-- 
-- Este script crea:
-- 1. Tabla catalog.tax_types: Catálogo global de tipos de impuestos
-- 2. Tabla catalog.product_taxes: Relación muchos-a-muchos entre productos e impuestos
-- 3. Modificación de orders.order_items: Agregar campo tax_breakdown
--
-- Uso: Ejecutar después de schema.sql y migration_advanced_catalog_system.sql
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2024-11-18
-- Documentación: docs/21-sistema-impuestos-configurable.md
-- ============================================================================

-- Configurar search_path
SET search_path TO catalog, orders, core, public;

-- ============================================================================
-- 1. CREAR TABLA DE TIPOS DE IMPUESTOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS catalog.tax_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Información del impuesto
    name VARCHAR(100) NOT NULL UNIQUE, -- "IVA", "Impuesto Local CDMX", etc.
    description TEXT,
    code VARCHAR(50), -- Código fiscal (ej: "IVA", "ISR", "IEPS")
    
    -- Configuración del impuesto
    rate DECIMAL(5,4) NOT NULL CHECK (rate >= 0 AND rate <= 1), -- 0.16 = 16%
    rate_type VARCHAR(20) NOT NULL DEFAULT 'percentage', -- 'percentage' o 'fixed'
    fixed_amount DECIMAL(10,2), -- Si rate_type = 'fixed'
    
    -- Aplicación
    applies_to_subtotal BOOLEAN DEFAULT TRUE, -- Se aplica al subtotal
    applies_to_delivery BOOLEAN DEFAULT FALSE, -- Se aplica al costo de envío
    applies_to_tip BOOLEAN DEFAULT FALSE, -- Se aplica a la propina
    
    -- Reglas de exención (opcional, para futuras expansiones)
    exemption_rules JSONB, -- Reglas complejas de exención
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE, -- Impuesto por defecto para nuevos productos
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_tax_types_is_active ON catalog.tax_types(is_active);
CREATE INDEX IF NOT EXISTS idx_tax_types_code ON catalog.tax_types(code);
CREATE INDEX IF NOT EXISTS idx_tax_types_is_default ON catalog.tax_types(is_default);

-- Comentarios
COMMENT ON TABLE catalog.tax_types IS 'Catálogo global de tipos de impuestos configurados por administradores';
COMMENT ON COLUMN catalog.tax_types.rate IS 'Porcentaje del impuesto (0.16 = 16%) o monto fijo si rate_type = fixed';
COMMENT ON COLUMN catalog.tax_types.rate_type IS 'Tipo de cálculo: percentage (porcentaje) o fixed (monto fijo)';
COMMENT ON COLUMN catalog.tax_types.applies_to_subtotal IS 'Si el impuesto se aplica al subtotal de productos';
COMMENT ON COLUMN catalog.tax_types.applies_to_delivery IS 'Si el impuesto se aplica al costo de envío';
COMMENT ON COLUMN catalog.tax_types.applies_to_tip IS 'Si el impuesto se aplica a la propina';
COMMENT ON COLUMN catalog.tax_types.is_default IS 'Si este impuesto se asigna automáticamente a nuevos productos';

-- ============================================================================
-- 2. CREAR TABLA DE RELACIÓN PRODUCTOS-IMPUESTOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS catalog.product_taxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
    tax_type_id UUID NOT NULL REFERENCES catalog.tax_types(id) ON DELETE CASCADE,
    
    -- Override opcional del porcentaje para este producto específico
    override_rate DECIMAL(5,4) CHECK (override_rate >= 0 AND override_rate <= 1), -- Si NULL, usa el rate del tax_type
    override_fixed_amount DECIMAL(10,2), -- Si rate_type = 'fixed'
    
    -- Orden de aplicación (para cuando hay múltiples impuestos)
    display_order INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: un producto no puede tener el mismo impuesto dos veces
    UNIQUE(product_id, tax_type_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_product_taxes_product_id ON catalog.product_taxes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_taxes_tax_type_id ON catalog.product_taxes(tax_type_id);

-- Comentarios
COMMENT ON TABLE catalog.product_taxes IS 'Relación muchos-a-muchos entre productos e impuestos';
COMMENT ON COLUMN catalog.product_taxes.override_rate IS 'Override opcional del porcentaje para este producto específico';
COMMENT ON COLUMN catalog.product_taxes.display_order IS 'Orden de visualización cuando hay múltiples impuestos';

-- ============================================================================
-- 3. MODIFICAR orders.order_items PARA AGREGAR tax_breakdown
-- ============================================================================

-- Agregar columna tax_breakdown si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'orders' 
        AND table_name = 'order_items' 
        AND column_name = 'tax_breakdown'
    ) THEN
        ALTER TABLE orders.order_items
        ADD COLUMN tax_breakdown JSONB;
        
        COMMENT ON COLUMN orders.order_items.tax_breakdown IS 'Desglose de impuestos aplicados al item. Estructura: {"taxes": [{"tax_type_id": "uuid", "tax_name": "IVA", "rate": 0.16, "amount": 16.00, "applied_to": "subtotal"}], "total_tax": 16.00}';
    END IF;
END $$;

-- ============================================================================
-- 4. INSERTAR IMPUESTOS PREDEFINIDOS
-- ============================================================================

-- IVA estándar en México (16%)
INSERT INTO catalog.tax_types (
    name,
    description,
    code,
    rate,
    rate_type,
    applies_to_subtotal,
    applies_to_delivery,
    applies_to_tip,
    is_active,
    is_default
) VALUES (
    'IVA',
    'Impuesto al Valor Agregado estándar en México',
    'IVA',
    0.16,
    'percentage',
    TRUE,
    FALSE,
    FALSE,
    TRUE,
    TRUE
) ON CONFLICT (name) DO NOTHING;

-- Impuesto local CDMX (2% sobre plataformas de delivery)
-- Nota: Este impuesto puede variar según la jurisdicción
INSERT INTO catalog.tax_types (
    name,
    description,
    code,
    rate,
    rate_type,
    applies_to_subtotal,
    applies_to_delivery,
    applies_to_tip,
    is_active,
    is_default
) VALUES (
    'Impuesto Local CDMX',
    'Impuesto local aplicado a plataformas de delivery en la Ciudad de México',
    'TAX_CDMX',
    0.02,
    'percentage',
    TRUE,
    FALSE,
    FALSE,
    TRUE,
    FALSE
) ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 5. FUNCIÓN HELPER PARA CALCULAR IMPUESTOS
-- ============================================================================

-- Función para obtener impuestos de un producto
CREATE OR REPLACE FUNCTION catalog.get_product_taxes(p_product_id UUID)
RETURNS TABLE (
    tax_type_id UUID,
    tax_name VARCHAR(100),
    tax_code VARCHAR(50),
    rate DECIMAL(5,4),
    rate_type VARCHAR(20),
    fixed_amount DECIMAL(10,2),
    override_rate DECIMAL(5,4),
    override_fixed_amount DECIMAL(10,2),
    display_order INTEGER,
    applies_to_subtotal BOOLEAN,
    applies_to_delivery BOOLEAN,
    applies_to_tip BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tt.id as tax_type_id,
        tt.name as tax_name,
        tt.code as tax_code,
        tt.rate,
        tt.rate_type,
        tt.fixed_amount,
        pt.override_rate,
        pt.override_fixed_amount,
        pt.display_order,
        tt.applies_to_subtotal,
        tt.applies_to_delivery,
        tt.applies_to_tip
    FROM catalog.product_taxes pt
    INNER JOIN catalog.tax_types tt ON pt.tax_type_id = tt.id
    WHERE pt.product_id = p_product_id
    AND tt.is_active = TRUE
    ORDER BY pt.display_order, tt.name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION catalog.get_product_taxes IS 'Obtiene todos los impuestos activos asignados a un producto';

-- ============================================================================
-- 6. TRIGGER PARA ACTUALIZAR updated_at EN tax_types
-- ============================================================================

CREATE OR REPLACE FUNCTION catalog.update_tax_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tax_types_updated_at
    BEFORE UPDATE ON catalog.tax_types
    FOR EACH ROW
    EXECUTE FUNCTION catalog.update_tax_types_updated_at();

-- ============================================================================
-- 7. VERIFICACIÓN
-- ============================================================================

-- Verificar que las tablas se crearon correctamente
DO $$
BEGIN
    -- Verificar tax_types
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'catalog' AND table_name = 'tax_types') THEN
        RAISE EXCEPTION 'Error: La tabla catalog.tax_types no se creó correctamente';
    END IF;
    
    -- Verificar product_taxes
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'catalog' AND table_name = 'product_taxes') THEN
        RAISE EXCEPTION 'Error: La tabla catalog.product_taxes no se creó correctamente';
    END IF;
    
    -- Verificar columna tax_breakdown
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'orders' 
        AND table_name = 'order_items' 
        AND column_name = 'tax_breakdown'
    ) THEN
        RAISE EXCEPTION 'Error: La columna orders.order_items.tax_breakdown no se creó correctamente';
    END IF;
    
    RAISE NOTICE '✅ Migración de sistema de impuestos completada exitosamente';
END $$;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

-- ============================================================================
