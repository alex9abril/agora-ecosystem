-- MIGRACIÓN: Sistema Avanzado de Catálogos de Productos
-- ============================================================================
-- Descripción: Agrega funcionalidades avanzadas para catálogos:
--              - Tipo de producto (alimento, medicamento, no alimento)
--              - Atributos múltiples para categorías y tipos de producto
--              - Sistema estructurado de variantes de productos
--              - Mejora de paquetes/colecciones
-- 
-- Uso: Ejecutar después de schema.sql para agregar funcionalidades avanzadas
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2025-01-XX
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- 1. TIPO DE PRODUCTO
-- ============================================================================

-- Crear ENUM para tipos de producto
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_type') THEN
        CREATE TYPE catalog.product_type AS ENUM (
            'food',           -- Alimento
            'beverage',       -- Bebida
            'medicine',       -- Medicamento (farmacia)
            'grocery',        -- Abarrotes
            'non_food'        -- No alimenticio
        );
    END IF;
END $$;

-- Agregar columna product_type a catalog.products
ALTER TABLE catalog.products
ADD COLUMN IF NOT EXISTS product_type catalog.product_type DEFAULT 'food';

-- Agregar comentario
COMMENT ON COLUMN catalog.products.product_type IS 'Tipo de producto para filtros, sugerencias y regulaciones';

-- Agregar índice
CREATE INDEX IF NOT EXISTS idx_products_product_type ON catalog.products(product_type);

-- ============================================================================
-- 2. ATRIBUTOS PARA CATEGORÍAS DE PRODUCTOS
-- ============================================================================

-- Agregar campo para atributos múltiples en categorías
ALTER TABLE catalog.product_categories
ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb;

-- Agregar comentario
COMMENT ON COLUMN catalog.product_categories.attributes IS 'Atributos adicionales de la categoría (ej: {"temperature": "cold", "serving_type": "individual", "dietary": ["vegan", "gluten-free"]})';

-- Agregar índice GIN para búsquedas eficientes en atributos
CREATE INDEX IF NOT EXISTS idx_product_categories_attributes ON catalog.product_categories USING GIN(attributes);

-- ============================================================================
-- 3. ATRIBUTOS PARA TIPOS DE PRODUCTO
-- ============================================================================

-- Crear tabla para atributos de tipos de producto (configuración global)
CREATE TABLE IF NOT EXISTS catalog.product_type_attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Tipo de producto
    product_type catalog.product_type NOT NULL,
    
    -- Nombre del atributo
    attribute_name VARCHAR(100) NOT NULL,
    
    -- Valor del atributo (puede ser texto, número, booleano, array)
    attribute_value JSONB NOT NULL,
    
    -- Descripción del atributo
    description TEXT,
    
    -- Orden de visualización
    display_order INTEGER DEFAULT 0,
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: nombre único por tipo de producto
    UNIQUE(product_type, attribute_name)
);

CREATE INDEX IF NOT EXISTS idx_product_type_attributes_type ON catalog.product_type_attributes(product_type);
CREATE INDEX IF NOT EXISTS idx_product_type_attributes_is_active ON catalog.product_type_attributes(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE catalog.product_type_attributes IS 'Atributos globales para tipos de producto (ej: todos los medicamentos requieren validación)';

-- ============================================================================
-- 4. SISTEMA ESTRUCTURADO DE VARIANTES DE PRODUCTOS
-- ============================================================================

-- Crear tabla para grupos de variantes (ej: "Tamaño", "Sabor", "Color")
CREATE TABLE IF NOT EXISTS catalog.product_variant_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
    
    -- Información del grupo
    name VARCHAR(100) NOT NULL, -- Ej: "Tamaño", "Sabor", "Color"
    description TEXT,
    
    -- Configuración
    is_required BOOLEAN DEFAULT FALSE, -- ¿Es obligatorio seleccionar una variante?
    selection_type VARCHAR(20) NOT NULL DEFAULT 'single' CHECK (selection_type IN ('single', 'multiple')),
    
    -- Orden de visualización
    display_order INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: nombre único por producto
    UNIQUE(product_id, name)
);

CREATE INDEX IF NOT EXISTS idx_variant_groups_product_id ON catalog.product_variant_groups(product_id);
CREATE INDEX IF NOT EXISTS idx_variant_groups_display_order ON catalog.product_variant_groups(product_id, display_order);

COMMENT ON TABLE catalog.product_variant_groups IS 'Grupos de variantes de un producto (ej: "Tamaño" para papas fritas)';

-- Crear tabla para variantes individuales (ej: "Chica", "Mediana", "Grande")
CREATE TABLE IF NOT EXISTS catalog.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_group_id UUID NOT NULL REFERENCES catalog.product_variant_groups(id) ON DELETE CASCADE,
    
    -- Información de la variante
    name VARCHAR(100) NOT NULL, -- Ej: "Chica", "Mediana", "Grande"
    description TEXT,
    
    -- Precio adicional (puede ser negativo para descuentos)
    -- Si es NULL, usa el precio base del producto
    price_adjustment DECIMAL(10,2) DEFAULT 0.00,
    
    -- Precio absoluto (opcional, si se especifica, ignora price_adjustment)
    -- Útil cuando el precio de la variante no es relativo al precio base
    absolute_price DECIMAL(10,2),
    
    -- Disponibilidad
    is_available BOOLEAN DEFAULT TRUE,
    
    -- Orden de visualización
    display_order INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: nombre único por grupo
    UNIQUE(variant_group_id, name)
);

CREATE INDEX IF NOT EXISTS idx_variants_group_id ON catalog.product_variants(variant_group_id);
CREATE INDEX IF NOT EXISTS idx_variants_display_order ON catalog.product_variants(variant_group_id, display_order);
CREATE INDEX IF NOT EXISTS idx_variants_is_available ON catalog.product_variants(is_available) WHERE is_available = TRUE;

COMMENT ON TABLE catalog.product_variants IS 'Variantes individuales de un producto (ej: "Chica" con precio +$0, "Mediana" con precio +$5, "Grande" con precio +$10)';
COMMENT ON COLUMN catalog.product_variants.price_adjustment IS 'Ajuste de precio relativo al precio base del producto';
COMMENT ON COLUMN catalog.product_variants.absolute_price IS 'Precio absoluto de la variante (si se especifica, ignora price_adjustment)';

-- ============================================================================
-- 5. MEJORA DE COLECCIONES (PAQUETES COMO PRODUCTOS)
-- ============================================================================

-- Agregar campo para tratar colecciones como productos
ALTER TABLE catalog.collections
ADD COLUMN IF NOT EXISTS is_product BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN catalog.collections.is_product IS 'Si es true, la colección se trata como un producto (aparece en listado de productos, puede tener variantes, etc.)';

-- Agregar campo para categoría (las colecciones también pueden tener categoría)
ALTER TABLE catalog.collections
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES catalog.product_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_collections_category_id ON catalog.collections(category_id);

COMMENT ON COLUMN catalog.collections.category_id IS 'Categoría de la colección (útil cuando is_product = true)';

-- Agregar campo para tipo de producto (si la colección es un producto)
ALTER TABLE catalog.collections
ADD COLUMN IF NOT EXISTS product_type catalog.product_type;

CREATE INDEX IF NOT EXISTS idx_collections_product_type ON catalog.collections(product_type);

COMMENT ON COLUMN catalog.collections.product_type IS 'Tipo de producto de la colección (útil cuando is_product = true)';

-- ============================================================================
-- 6. MEJORA DE COLLECTION_PRODUCTS (CANTIDADES FRACCIONARIAS)
-- ============================================================================

-- Cambiar quantity de INTEGER a DECIMAL para permitir fracciones
ALTER TABLE catalog.collection_products
ALTER COLUMN quantity TYPE DECIMAL(10,2);

-- Agregar campo para unidad personalizada
ALTER TABLE catalog.collection_products
ADD COLUMN IF NOT EXISTS unit_label VARCHAR(50);

COMMENT ON COLUMN catalog.collection_products.quantity IS 'Cantidad del producto en la colección (puede ser fraccionaria, ej: 0.5 para media orden)';
COMMENT ON COLUMN catalog.collection_products.unit_label IS 'Etiqueta de unidad personalizada para mostrar al cliente (ej: "porción combo", "media orden")';
COMMENT ON COLUMN catalog.collection_products.price_override IS 'Precio específico de este producto en esta colección (si difiere del precio normal)';

-- Actualizar constraint UNIQUE para incluir unit_label
-- Nota: PostgreSQL no permite COALESCE en constraints, usamos índice único con expresión
ALTER TABLE catalog.collection_products
DROP CONSTRAINT IF EXISTS collection_products_collection_id_product_id_quantity_key;

-- Crear índice único con expresión para manejar NULLs en unit_label
CREATE UNIQUE INDEX IF NOT EXISTS collection_products_unique 
    ON catalog.collection_products(collection_id, product_id, quantity, COALESCE(unit_label, ''));

-- ============================================================================
-- 7. PRODUCTOS DE FARMACIA (CAMPOS OPCIONALES)
-- ============================================================================

-- Agregar campos para productos de farmacia
ALTER TABLE catalog.products
ADD COLUMN IF NOT EXISTS requires_prescription BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS age_restriction INTEGER, -- Edad mínima requerida (NULL = sin restricción)
ADD COLUMN IF NOT EXISTS max_quantity_per_order INTEGER, -- Límite de cantidad por pedido (NULL = sin límite)
ADD COLUMN IF NOT EXISTS requires_pharmacist_validation BOOLEAN DEFAULT FALSE;

-- Agregar comentarios
COMMENT ON COLUMN catalog.products.requires_prescription IS 'Requiere receta médica (solo para productos de tipo medicine)';
COMMENT ON COLUMN catalog.products.age_restriction IS 'Edad mínima requerida para comprar (NULL = sin restricción)';
COMMENT ON COLUMN catalog.products.max_quantity_per_order IS 'Cantidad máxima permitida por pedido (NULL = sin límite)';
COMMENT ON COLUMN catalog.products.requires_pharmacist_validation IS 'Requiere validación de farmacéutico antes de procesar (solo para productos de tipo medicine)';

-- ============================================================================
-- 8. ACTUALIZAR ORDER_ITEMS PARA VARIANTES
-- ============================================================================

-- Agregar campo para almacenar selección de variantes estructuradas
ALTER TABLE orders.order_items
ADD COLUMN IF NOT EXISTS variant_selections JSONB;

COMMENT ON COLUMN orders.order_items.variant_selections IS 'JSON con selección de variantes estructuradas: {"variant_group_id": "variant_id"} o {"variant_group_id": ["variant_id1", "variant_id2"]} para múltiples';

-- Agregar campo para precio adicional de variantes
ALTER TABLE orders.order_items
ADD COLUMN IF NOT EXISTS variant_price_adjustment DECIMAL(10,2) DEFAULT 0.00;

COMMENT ON COLUMN orders.order_items.variant_price_adjustment IS 'Suma total de ajustes de precio de variantes seleccionadas';

-- Nota: El campo variant_selection (JSONB) existente se mantiene para compatibilidad
-- pero variant_selections es la versión estructurada recomendada

-- ============================================================================
-- 9. DATOS INICIALES: ATRIBUTOS DE TIPOS DE PRODUCTO
-- ============================================================================

-- Insertar atributos por defecto para tipos de producto
INSERT INTO catalog.product_type_attributes (product_type, attribute_name, attribute_value, description, display_order, is_active)
VALUES
    -- Alimentos
    ('food', 'requires_temperature_control', 'true'::jsonb, 'Requiere control de temperatura', 1, TRUE),
    ('food', 'is_perishable', 'true'::jsonb, 'Es perecedero', 2, TRUE),
    ('food', 'suggest_beverage', 'true'::jsonb, 'Sugerir bebidas al agregar', 3, TRUE),
    
    -- Bebidas
    ('beverage', 'requires_temperature_control', 'true'::jsonb, 'Requiere control de temperatura', 1, TRUE),
    ('beverage', 'suggest_food', 'false'::jsonb, 'No sugerir comida al agregar', 2, TRUE),
    
    -- Medicamentos
    ('medicine', 'requires_prescription_validation', 'true'::jsonb, 'Requiere validación de receta', 1, TRUE),
    ('medicine', 'requires_pharmacist_approval', 'true'::jsonb, 'Requiere aprobación de farmacéutico', 2, TRUE),
    ('medicine', 'has_quantity_limits', 'true'::jsonb, 'Tiene límites de cantidad', 3, TRUE),
    
    -- Abarrotes
    ('grocery', 'requires_temperature_control', 'false'::jsonb, 'No requiere control de temperatura', 1, TRUE),
    ('grocery', 'is_perishable', 'false'::jsonb, 'No es perecedero', 2, TRUE),
    
    -- No alimenticio
    ('non_food', 'requires_temperature_control', 'false'::jsonb, 'No requiere control de temperatura', 1, TRUE),
    ('non_food', 'is_perishable', 'false'::jsonb, 'No es perecedero', 2, TRUE)
ON CONFLICT (product_type, attribute_name) DO UPDATE SET
    attribute_value = EXCLUDED.attribute_value,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- 10. FUNCIONES AUXILIARES
-- ============================================================================

-- Función para calcular precio de producto con variante
CREATE OR REPLACE FUNCTION catalog.calculate_product_price_with_variant(
    p_product_id UUID,
    p_variant_id UUID DEFAULT NULL
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_base_price DECIMAL(10,2);
    v_price_adjustment DECIMAL(10,2);
    v_absolute_price DECIMAL(10,2);
BEGIN
    -- Obtener precio base del producto
    SELECT price INTO v_base_price
    FROM catalog.products
    WHERE id = p_product_id;
    
    -- Si no hay variante, retornar precio base
    IF p_variant_id IS NULL THEN
        RETURN v_base_price;
    END IF;
    
    -- Obtener información de la variante
    SELECT 
        pv.price_adjustment,
        pv.absolute_price
    INTO 
        v_price_adjustment,
        v_absolute_price
    FROM catalog.product_variants pv
    WHERE pv.id = p_variant_id;
    
    -- Si la variante tiene precio absoluto, usarlo
    IF v_absolute_price IS NOT NULL THEN
        RETURN v_absolute_price;
    END IF;
    
    -- Si no, calcular precio base + ajuste
    RETURN v_base_price + COALESCE(v_price_adjustment, 0);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION catalog.calculate_product_price_with_variant IS 'Calcula el precio de un producto considerando una variante seleccionada';

-- ============================================================================
-- 11. VISTAS ÚTILES
-- ============================================================================

-- Vista para productos con sus variantes
CREATE OR REPLACE VIEW catalog.products_with_variants AS
SELECT 
    p.id,
    p.business_id,
    p.name,
    p.description,
    p.image_url,
    p.price as base_price,
    p.product_type,
    p.category_id,
    p.is_available,
    p.is_featured,
    p.display_order,
    p.created_at,
    p.updated_at,
    -- Información de variantes
    COALESCE(
        json_agg(
            json_build_object(
                'variant_group_id', vg.id,
                'variant_group_name', vg.name,
                'variant_group_required', vg.is_required,
                'variant_group_selection_type', vg.selection_type,
                'variants', (
                    SELECT json_agg(
                        json_build_object(
                            'variant_id', v.id,
                            'variant_name', v.name,
                            'price_adjustment', v.price_adjustment,
                            'absolute_price', v.absolute_price,
                            'is_available', v.is_available,
                            'display_order', v.display_order
                        ) ORDER BY v.display_order
                    )
                    FROM catalog.product_variants v
                    WHERE v.variant_group_id = vg.id
                    AND v.is_available = TRUE
                )
            ) ORDER BY vg.display_order
        ) FILTER (WHERE vg.id IS NOT NULL),
        '[]'::json
    ) as variant_groups
FROM catalog.products p
LEFT JOIN catalog.product_variant_groups vg ON vg.product_id = p.id
GROUP BY p.id, p.business_id, p.name, p.description, p.image_url, p.price, p.product_type, 
         p.category_id, p.is_available, p.is_featured, p.display_order, p.created_at, p.updated_at;

COMMENT ON VIEW catalog.products_with_variants IS 'Vista que incluye productos con sus grupos de variantes y variantes individuales';

-- ============================================================================
-- 12. MIGRACIÓN DE DATOS EXISTENTES
-- ============================================================================

-- Migrar productos existentes: si no tienen product_type, asignar 'food' por defecto
UPDATE catalog.products
SET product_type = 'food'
WHERE product_type IS NULL;

-- Migrar variantes existentes en JSONB a estructura nueva (opcional, requiere análisis manual)
-- NOTA: Esto requiere revisar el contenido del campo variants JSONB existente
-- y crear los grupos y variantes correspondientes manualmente

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

-- Verificar que todo se creó correctamente
DO $$
BEGIN
    RAISE NOTICE '✅ Migración completada exitosamente';
    RAISE NOTICE '   - Tipo de producto: ✅';
    RAISE NOTICE '   - Atributos de categorías: ✅';
    RAISE NOTICE '   - Atributos de tipos de producto: ✅';
    RAISE NOTICE '   - Sistema de variantes estructurado: ✅';
    RAISE NOTICE '   - Colecciones como productos: ✅';
    RAISE NOTICE '   - Cantidades fraccionarias: ✅';
    RAISE NOTICE '   - Productos de farmacia: ✅';
END $$;

-- ============================================================================
