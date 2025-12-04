-- ============================================================================
-- AGORA ECOSYSTEM - Migración: Tipos de Producto para Refacciones
-- ============================================================================
-- Descripción: Migra los tipos de producto de alimentos a refacciones automotrices
--              y actualiza la configuración de campos para el nuevo contexto
-- 
-- Uso: Ejecutar después de schema.sql y antes de seed_refacciones_catalog.sql
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2025-12-02
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- PASO 1: CREAR NUEVO ENUM CON TIPOS DE REFACCIONES
-- ============================================================================

-- Crear nuevo tipo ENUM para refacciones
DO $$ 
BEGIN
    -- Verificar si el tipo ya existe con los nuevos valores
    IF EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'catalog' AND t.typname = 'product_type_refacciones'
    ) THEN
        RAISE NOTICE 'El tipo product_type_refacciones ya existe.';
    ELSE
        -- Crear nuevo tipo con valores de refacciones
        CREATE TYPE catalog.product_type_refacciones AS ENUM (
            'refaccion',              -- Refacción (pieza de repuesto)
            'accesorio',              -- Accesorio (personalización)
            'servicio_instalacion',   -- Servicio de Instalación
            'servicio_mantenimiento',  -- Servicio de Mantenimiento
            'fluido'                  -- Fluidos y Lubricantes
        );
        RAISE NOTICE 'Tipo catalog.product_type_refacciones creado';
    END IF;
END $$;

-- ============================================================================
-- PASO 2: MIGRAR DATOS EXISTENTES (si hay productos con tipos antiguos)
-- ============================================================================

-- Si hay productos con tipos antiguos, migrarlos al tipo más cercano
-- Nota: Esto es opcional y solo se ejecuta si existen productos
DO $$
DECLARE
    product_count INTEGER;
BEGIN
    -- Verificar si hay productos con tipos antiguos
    SELECT COUNT(*) INTO product_count
    FROM catalog.products
    WHERE product_type IS NOT NULL;
    
    IF product_count > 0 THEN
        RAISE NOTICE 'Se encontraron % productos con tipos antiguos. Considera migrarlos manualmente.', product_count;
        -- Opcional: Migrar automáticamente
        -- UPDATE catalog.products SET product_type = NULL WHERE product_type IN ('food', 'beverage', 'medicine', 'grocery', 'non_food');
    ELSE
        RAISE NOTICE 'No hay productos con tipos antiguos. Continuando con la migración.';
    END IF;
END $$;

-- ============================================================================
-- PASO 3: REEMPLAZAR EL TIPO ANTIGUO POR EL NUEVO
-- ============================================================================

-- Nota: En PostgreSQL no se puede modificar un ENUM directamente
-- Este script recrea el tipo completamente
-- ⚠️ ADVERTENCIA: Si hay productos con tipos antiguos, se establecerán en NULL

DO $$
DECLARE
    type_exists BOOLEAN;
    has_products BOOLEAN;
BEGIN
    -- Verificar si el tipo existe
    SELECT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'catalog' AND t.typname = 'product_type'
    ) INTO type_exists;
    
    -- Verificar si hay productos usando el tipo
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'catalog' AND table_name = 'products' 
               AND column_name = 'product_type') THEN
        SELECT EXISTS (
            SELECT 1 FROM catalog.products WHERE product_type IS NOT NULL
        ) INTO has_products;
    ELSE
        has_products := FALSE;
    END IF;
    
    IF type_exists THEN
        RAISE NOTICE 'Tipo product_type existe. Recreando con valores de refacciones...';
        
        -- Paso 1: Si hay productos, establecer product_type en NULL temporalmente
        IF has_products THEN
            RAISE NOTICE 'Estableciendo product_type en NULL para productos existentes...';
            UPDATE catalog.products SET product_type = NULL;
        END IF;
        
        -- Paso 2: Eliminar registros de configuración antiguos
        DELETE FROM catalog.product_type_field_config 
        WHERE product_type::text IN ('food', 'beverage', 'medicine', 'grocery', 'non_food');
        
        -- Paso 3: Eliminar vistas que dependen de product_type
        -- La vista products_with_variants depende de la columna product_type
        DROP VIEW IF EXISTS catalog.products_with_variants CASCADE;
        
        -- Paso 4: Renombrar tipo antiguo
        ALTER TYPE catalog.product_type RENAME TO product_type_old;
        
        -- Paso 5: Crear nuevo tipo con valores de refacciones
        CREATE TYPE catalog.product_type AS ENUM (
            'refaccion',
            'accesorio',
            'servicio_instalacion',
            'servicio_mantenimiento',
            'fluido'
        );
        
        -- Paso 6: Actualizar columnas que usan el tipo
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'catalog' AND table_name = 'products' 
                   AND column_name = 'product_type') THEN
            -- Primero eliminar el DEFAULT existente
            ALTER TABLE catalog.products 
            ALTER COLUMN product_type DROP DEFAULT;
            
            -- Cambiar el tipo de la columna
            ALTER TABLE catalog.products 
            ALTER COLUMN product_type TYPE catalog.product_type 
            USING NULL;
            
            -- Establecer el nuevo DEFAULT
            ALTER TABLE catalog.products 
            ALTER COLUMN product_type SET DEFAULT 'refaccion'::catalog.product_type;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'catalog' AND table_name = 'product_type_field_config' 
                   AND column_name = 'product_type') THEN
            -- Cambiar el tipo de la columna (no tiene DEFAULT normalmente)
            ALTER TABLE catalog.product_type_field_config 
            ALTER COLUMN product_type TYPE catalog.product_type 
            USING NULL;
        END IF;
        
        -- Paso 7: Eliminar tipo antiguo
        DROP TYPE catalog.product_type_old CASCADE;
        
        -- Paso 8: Recrear la vista products_with_variants
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
        
        RAISE NOTICE 'Tipo product_type migrado exitosamente a tipos de refacciones';
    ELSE
        -- Si no existe, crear directamente
        CREATE TYPE catalog.product_type AS ENUM (
            'refaccion',
            'accesorio',
            'servicio_instalacion',
            'servicio_mantenimiento',
            'fluido'
        );
        RAISE NOTICE 'Tipo product_type creado con valores de refacciones';
    END IF;
END $$;

-- ============================================================================
-- PASO 4: LIMPIAR CONFIGURACIONES ANTIGUAS
-- ============================================================================

-- Eliminar configuraciones de tipos antiguos
DELETE FROM catalog.product_type_field_config 
WHERE product_type::text IN ('food', 'beverage', 'medicine', 'grocery', 'non_food');

-- ============================================================================
-- PASO 5: INSERTAR CONFIGURACIONES PARA NUEVOS TIPOS
-- ============================================================================

-- Refacción (refaccion)
INSERT INTO catalog.product_type_field_config (product_type, field_name, is_visible, is_required, display_order)
VALUES
    ('refaccion', 'name', TRUE, TRUE, 1),
    ('refaccion', 'description', TRUE, FALSE, 2),
    ('refaccion', 'image_url', TRUE, FALSE, 3),
    ('refaccion', 'price', TRUE, TRUE, 4),
    ('refaccion', 'category_id', TRUE, TRUE, 5),
    ('refaccion', 'product_type', TRUE, TRUE, 6),
    ('refaccion', 'is_available', TRUE, FALSE, 7),
    ('refaccion', 'is_featured', TRUE, FALSE, 8),
    ('refaccion', 'display_order', TRUE, FALSE, 9),
    ('refaccion', 'variant_groups', TRUE, FALSE, 10),
    ('refaccion', 'variants', TRUE, FALSE, 11), -- Compatibilidad de vehículos en variants
    ('refaccion', 'nutritional_info', TRUE, FALSE, 12), -- Especificaciones técnicas en nutritional_info
    ('refaccion', 'allergens', FALSE, FALSE, 13), -- NO visible para refacciones
    ('refaccion', 'requires_prescription', FALSE, FALSE, 14),
    ('refaccion', 'age_restriction', FALSE, FALSE, 15),
    ('refaccion', 'max_quantity_per_order', FALSE, FALSE, 16),
    ('refaccion', 'requires_pharmacist_validation', FALSE, FALSE, 17)
ON CONFLICT (product_type, field_name) DO UPDATE SET
    is_visible = EXCLUDED.is_visible,
    is_required = EXCLUDED.is_required,
    display_order = EXCLUDED.display_order,
    updated_at = CURRENT_TIMESTAMP;

-- Accesorio (accesorio)
INSERT INTO catalog.product_type_field_config (product_type, field_name, is_visible, is_required, display_order)
VALUES
    ('accesorio', 'name', TRUE, TRUE, 1),
    ('accesorio', 'description', TRUE, FALSE, 2),
    ('accesorio', 'image_url', TRUE, FALSE, 3),
    ('accesorio', 'price', TRUE, TRUE, 4),
    ('accesorio', 'category_id', TRUE, TRUE, 5),
    ('accesorio', 'product_type', TRUE, TRUE, 6),
    ('accesorio', 'is_available', TRUE, FALSE, 7),
    ('accesorio', 'is_featured', TRUE, FALSE, 8),
    ('accesorio', 'display_order', TRUE, FALSE, 9),
    ('accesorio', 'variant_groups', TRUE, FALSE, 10),
    ('accesorio', 'variants', TRUE, FALSE, 11), -- Compatibilidad universal o específica
    ('accesorio', 'nutritional_info', TRUE, FALSE, 12), -- Especificaciones técnicas
    ('accesorio', 'allergens', FALSE, FALSE, 13),
    ('accesorio', 'requires_prescription', FALSE, FALSE, 14),
    ('accesorio', 'age_restriction', FALSE, FALSE, 15),
    ('accesorio', 'max_quantity_per_order', FALSE, FALSE, 16),
    ('accesorio', 'requires_pharmacist_validation', FALSE, FALSE, 17)
ON CONFLICT (product_type, field_name) DO UPDATE SET
    is_visible = EXCLUDED.is_visible,
    is_required = EXCLUDED.is_required,
    display_order = EXCLUDED.display_order,
    updated_at = CURRENT_TIMESTAMP;

-- Servicio de Instalación (servicio_instalacion)
INSERT INTO catalog.product_type_field_config (product_type, field_name, is_visible, is_required, display_order)
VALUES
    ('servicio_instalacion', 'name', TRUE, TRUE, 1),
    ('servicio_instalacion', 'description', TRUE, FALSE, 2),
    ('servicio_instalacion', 'image_url', TRUE, FALSE, 3),
    ('servicio_instalacion', 'price', TRUE, TRUE, 4),
    ('servicio_instalacion', 'category_id', TRUE, TRUE, 5),
    ('servicio_instalacion', 'product_type', TRUE, TRUE, 6),
    ('servicio_instalacion', 'is_available', TRUE, FALSE, 7),
    ('servicio_instalacion', 'is_featured', TRUE, FALSE, 8),
    ('servicio_instalacion', 'display_order', TRUE, FALSE, 9),
    ('servicio_instalacion', 'variant_groups', FALSE, FALSE, 10),
    ('servicio_instalacion', 'variants', TRUE, FALSE, 11), -- Tiempo estimado, dificultad, herramientas
    ('servicio_instalacion', 'nutritional_info', TRUE, FALSE, 12), -- Detalles del servicio
    ('servicio_instalacion', 'allergens', FALSE, FALSE, 13),
    ('servicio_instalacion', 'requires_prescription', FALSE, FALSE, 14),
    ('servicio_instalacion', 'age_restriction', FALSE, FALSE, 15),
    ('servicio_instalacion', 'max_quantity_per_order', FALSE, FALSE, 16),
    ('servicio_instalacion', 'requires_pharmacist_validation', FALSE, FALSE, 17)
ON CONFLICT (product_type, field_name) DO UPDATE SET
    is_visible = EXCLUDED.is_visible,
    is_required = EXCLUDED.is_required,
    display_order = EXCLUDED.display_order,
    updated_at = CURRENT_TIMESTAMP;

-- Servicio de Mantenimiento (servicio_mantenimiento)
INSERT INTO catalog.product_type_field_config (product_type, field_name, is_visible, is_required, display_order)
VALUES
    ('servicio_mantenimiento', 'name', TRUE, TRUE, 1),
    ('servicio_mantenimiento', 'description', TRUE, FALSE, 2),
    ('servicio_mantenimiento', 'image_url', TRUE, FALSE, 3),
    ('servicio_mantenimiento', 'price', TRUE, TRUE, 4),
    ('servicio_mantenimiento', 'category_id', TRUE, TRUE, 5),
    ('servicio_mantenimiento', 'product_type', TRUE, TRUE, 6),
    ('servicio_mantenimiento', 'is_available', TRUE, FALSE, 7),
    ('servicio_mantenimiento', 'is_featured', TRUE, FALSE, 8),
    ('servicio_mantenimiento', 'display_order', TRUE, FALSE, 9),
    ('servicio_mantenimiento', 'variant_groups', FALSE, FALSE, 10),
    ('servicio_mantenimiento', 'variants', TRUE, FALSE, 11), -- Tiempo estimado, frecuencia recomendada
    ('servicio_mantenimiento', 'nutritional_info', TRUE, FALSE, 12), -- Detalles del servicio
    ('servicio_mantenimiento', 'allergens', FALSE, FALSE, 13),
    ('servicio_mantenimiento', 'requires_prescription', FALSE, FALSE, 14),
    ('servicio_mantenimiento', 'age_restriction', FALSE, FALSE, 15),
    ('servicio_mantenimiento', 'max_quantity_per_order', FALSE, FALSE, 16),
    ('servicio_mantenimiento', 'requires_pharmacist_validation', FALSE, FALSE, 17)
ON CONFLICT (product_type, field_name) DO UPDATE SET
    is_visible = EXCLUDED.is_visible,
    is_required = EXCLUDED.is_required,
    display_order = EXCLUDED.display_order,
    updated_at = CURRENT_TIMESTAMP;

-- Fluidos y Lubricantes (fluido)
INSERT INTO catalog.product_type_field_config (product_type, field_name, is_visible, is_required, display_order)
VALUES
    ('fluido', 'name', TRUE, TRUE, 1),
    ('fluido', 'description', TRUE, FALSE, 2),
    ('fluido', 'image_url', TRUE, FALSE, 3),
    ('fluido', 'price', TRUE, TRUE, 4),
    ('fluido', 'category_id', TRUE, TRUE, 5),
    ('fluido', 'product_type', TRUE, TRUE, 6),
    ('fluido', 'is_available', TRUE, FALSE, 7),
    ('fluido', 'is_featured', TRUE, FALSE, 8),
    ('fluido', 'display_order', TRUE, FALSE, 9),
    ('fluido', 'variant_groups', TRUE, FALSE, 10), -- Capacidad, tipo (sintético/convencional)
    ('fluido', 'variants', TRUE, FALSE, 11), -- Compatibilidad de vehículos
    ('fluido', 'nutritional_info', TRUE, FALSE, 12), -- Especificaciones técnicas (viscosidad, etc.)
    ('fluido', 'allergens', FALSE, FALSE, 13),
    ('fluido', 'requires_prescription', FALSE, FALSE, 14),
    ('fluido', 'age_restriction', FALSE, FALSE, 15),
    ('fluido', 'max_quantity_per_order', FALSE, FALSE, 16),
    ('fluido', 'requires_pharmacist_validation', FALSE, FALSE, 17)
ON CONFLICT (product_type, field_name) DO UPDATE SET
    is_visible = EXCLUDED.is_visible,
    is_required = EXCLUDED.is_required,
    display_order = EXCLUDED.display_order,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar tipos creados
SELECT 
    t.typname as tipo,
    e.enumlabel as valor
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'catalog' AND t.typname = 'product_type'
ORDER BY e.enumsortorder;

-- Verificar configuraciones creadas
SELECT 
    product_type::text,
    COUNT(*) as campos_configurados
FROM catalog.product_type_field_config
GROUP BY product_type
ORDER BY product_type;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

