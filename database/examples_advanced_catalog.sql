-- ============================================================================
-- EJEMPLOS: Sistema Avanzado de Catálogos de Productos
-- ============================================================================
-- Descripción: Ejemplos prácticos de uso del sistema avanzado de catálogos
-- 
-- Uso: Ejecutar después de migration_advanced_catalog_system.sql
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2025-01-XX
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- EJEMPLO 1: PRODUCTO CON VARIANTES (Papas Fritas - Chica, Mediana, Grande)
-- ============================================================================

-- NOTA: Este script requiere que exista al menos un negocio en la base de datos
-- Si no existe, crea uno primero o modifica los IDs según tus datos

-- Obtener el primer negocio disponible (o usar uno específico)
DO $$
DECLARE
    v_business_id UUID;
    v_category_id UUID;
    v_product_id UUID := '11111111-1111-1111-1111-111111111111'::uuid;
BEGIN
    -- Obtener el primer negocio disponible
    SELECT id INTO v_business_id 
    FROM core.businesses 
    LIMIT 1;
    
    -- Si no hay negocios, crear uno de ejemplo
    IF v_business_id IS NULL THEN
        RAISE EXCEPTION 'No hay negocios en la base de datos. Por favor, crea un negocio primero.';
    END IF;
    
    -- Crear o obtener categoría "Acompañamientos"
    SELECT id INTO v_category_id 
    FROM catalog.product_categories 
    WHERE name = 'Acompañamientos' 
    LIMIT 1;
    
    -- Si no existe, crear categoría global
    IF v_category_id IS NULL THEN
        INSERT INTO catalog.product_categories (name, description, business_id, display_order, is_active)
        VALUES ('Acompañamientos', 'Acompañamientos para platos principales', NULL, 1, TRUE)
        RETURNING id INTO v_category_id;
    END IF;
    
    -- Paso 1: Crear el producto base (Papas Fritas)
    INSERT INTO catalog.products (
        id,
        business_id,
        name,
        description,
        price,
        product_type,
        category_id,
        is_available,
        display_order
    ) VALUES (
        v_product_id,
        v_business_id,
        'Papas Fritas',
        'Papas fritas crujientes',
        50.00, -- Precio base (tamaño chica)
        'food',
        v_category_id,
        TRUE,
        1
    ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        price = EXCLUDED.price,
        product_type = EXCLUDED.product_type;
END $$;

-- Paso 2: Crear grupo de variantes "Tamaño"
INSERT INTO catalog.product_variant_groups (
    id,
    product_id,
    name,
    description,
    is_required,
    selection_type,
    display_order
) VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    'Tamaño',
    'Selecciona el tamaño de las papas',
    TRUE, -- Obligatorio seleccionar un tamaño
    'single', -- Solo una selección
    1
) ON CONFLICT (product_id, name) DO UPDATE SET
    description = EXCLUDED.description,
    is_required = EXCLUDED.is_required,
    selection_type = EXCLUDED.selection_type;

-- Paso 3: Crear variantes individuales
INSERT INTO catalog.product_variants (
    id,
    variant_group_id,
    name,
    description,
    price_adjustment,
    absolute_price,
    is_available,
    display_order
) VALUES
    -- Chica (precio base, sin ajuste)
    (
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
        'Chica',
        'Porción pequeña',
        0.00, -- Sin ajuste (usa precio base $50)
        NULL, -- No tiene precio absoluto
        TRUE,
        1
    ),
    -- Mediana (precio base + $10)
    (
        'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
        'Mediana',
        'Porción mediana',
        10.00, -- Ajuste de +$10 (precio final: $60)
        NULL,
        TRUE,
        2
    ),
    -- Grande (precio absoluto de $80)
    (
        'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
        'Grande',
        'Porción grande',
        NULL, -- No usa ajuste
        80.00, -- Precio absoluto de $80
        TRUE,
        3
    )
ON CONFLICT (variant_group_id, name) DO UPDATE SET
    description = EXCLUDED.description,
    price_adjustment = EXCLUDED.price_adjustment,
    absolute_price = EXCLUDED.absolute_price,
    is_available = EXCLUDED.is_available,
    display_order = EXCLUDED.display_order;

-- ============================================================================
-- EJEMPLO 2: PRODUCTO CON MÚLTIPLES GRUPOS DE VARIANTES
-- ============================================================================

-- Producto: Hamburguesa Clásica
-- Variantes: Tamaño (obligatorio) + Extras (opcional, múltiple)

DO $$
DECLARE
    v_business_id UUID;
    v_category_id UUID;
    v_product_id UUID := '22222222-2222-2222-2222-222222222222'::uuid;
BEGIN
    -- Obtener el primer negocio disponible
    SELECT id INTO v_business_id 
    FROM core.businesses 
    LIMIT 1;
    
    IF v_business_id IS NULL THEN
        RAISE EXCEPTION 'No hay negocios en la base de datos. Por favor, crea un negocio primero.';
    END IF;
    
    -- Crear o obtener categoría "Hamburguesas"
    SELECT id INTO v_category_id 
    FROM catalog.product_categories 
    WHERE name = 'Hamburguesas' 
    LIMIT 1;
    
    IF v_category_id IS NULL THEN
        INSERT INTO catalog.product_categories (name, description, business_id, display_order, is_active)
        VALUES ('Hamburguesas', 'Hamburguesas y sandwiches', NULL, 2, TRUE)
        RETURNING id INTO v_category_id;
    END IF;
    
    -- Paso 1: Crear producto
    INSERT INTO catalog.products (
        id,
        business_id,
        name,
        description,
        price,
        product_type,
        category_id,
        is_available,
        display_order
    ) VALUES (
        v_product_id,
        v_business_id,
        'Hamburguesa Clásica',
        'Carne, lechuga, tomate, cebolla, queso',
        100.00,
        'food',
        v_category_id,
        TRUE,
        2
    ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        price = EXCLUDED.price;
END $$;

-- Paso 2: Grupo de variantes "Tamaño" (obligatorio)
INSERT INTO catalog.product_variant_groups (
    product_id,
    name,
    is_required,
    selection_type,
    display_order
) VALUES (
    '22222222-2222-2222-2222-222222222222'::uuid,
    'Tamaño',
    TRUE,
    'single',
    1
) ON CONFLICT (product_id, name) DO NOTHING;

-- Paso 3: Variantes de tamaño
INSERT INTO catalog.product_variants (
    variant_group_id,
    name,
    price_adjustment,
    display_order
)
SELECT 
    (SELECT id FROM catalog.product_variant_groups WHERE product_id = '22222222-2222-2222-2222-222222222222'::uuid AND name = 'Tamaño'),
    name,
    price_adjustment,
    display_order
FROM (VALUES
    ('Pequeño', 0.00, 1),
    ('Mediano', 10.00, 2),
    ('Grande', 20.00, 3)
) AS v(name, price_adjustment, display_order)
ON CONFLICT (variant_group_id, name) DO UPDATE SET
    price_adjustment = EXCLUDED.price_adjustment;

-- Paso 4: Grupo de variantes "Extras" (opcional, múltiple)
INSERT INTO catalog.product_variant_groups (
    product_id,
    name,
    is_required,
    selection_type,
    display_order
) VALUES (
    '22222222-2222-2222-2222-222222222222'::uuid,
    'Extras',
    FALSE, -- Opcional
    'multiple', -- Múltiple selección
    2
) ON CONFLICT (product_id, name) DO NOTHING;

-- Paso 5: Variantes de extras
INSERT INTO catalog.product_variants (
    variant_group_id,
    name,
    price_adjustment,
    display_order
)
SELECT 
    (SELECT id FROM catalog.product_variant_groups WHERE product_id = '22222222-2222-2222-2222-222222222222'::uuid AND name = 'Extras'),
    name,
    price_adjustment,
    display_order
FROM (VALUES
    ('Queso Extra', 15.00, 1),
    ('Tocino', 20.00, 2),
    ('Aguacate', 10.00, 3),
    ('Cebolla Caramelizada', 8.00, 4)
) AS v(name, price_adjustment, display_order)
ON CONFLICT (variant_group_id, name) DO UPDATE SET
    price_adjustment = EXCLUDED.price_adjustment;

-- ============================================================================
-- EJEMPLO 3: CATEGORÍA CON ATRIBUTOS MÚLTIPLES
-- ============================================================================

-- Crear categoría "Bebidas Frías" con atributos
INSERT INTO catalog.product_categories (
    id,
    business_id,
    name,
    description,
    parent_category_id,
    attributes,
    display_order,
    is_active
) VALUES (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid,
    NULL, -- Categoría global
    'Bebidas Frías',
    'Refrescos, jugos, aguas',
    (SELECT id FROM catalog.product_categories WHERE name = 'Bebidas' AND business_id IS NULL LIMIT 1),
    '{
        "temperature": "cold",
        "serving_type": "individual",
        "suggest_with": ["food"],
        "dietary_options": ["sugar-free", "diet"],
        "storage": "refrigerated"
    }'::jsonb,
    1,
    TRUE
) ON CONFLICT (business_id, name) DO UPDATE SET
    attributes = EXCLUDED.attributes;

-- ============================================================================
-- EJEMPLO 4: COMBO CON CANTIDADES FRACCIONARIAS
-- ============================================================================

-- Combo: Hamburguesa con Papas
-- - 1 Hamburguesa (precio en combo: $100)
-- - 0.5 Orden de Papas (precio en combo: $20, etiqueta: "porción combo")

-- Paso 1: Crear colección/combo
DO $$
DECLARE
    v_business_id UUID;
    v_category_id UUID;
    v_collection_id UUID := 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid;
BEGIN
    -- Obtener el primer negocio disponible
    SELECT id INTO v_business_id 
    FROM core.businesses 
    LIMIT 1;
    
    IF v_business_id IS NULL THEN
        RAISE EXCEPTION 'No hay negocios en la base de datos. Por favor, crea un negocio primero.';
    END IF;
    
    -- Crear o obtener categoría "Combos"
    SELECT id INTO v_category_id 
    FROM catalog.product_categories 
    WHERE name = 'Combos' 
    LIMIT 1;
    
    IF v_category_id IS NULL THEN
        INSERT INTO catalog.product_categories (name, description, business_id, display_order, is_active)
        VALUES ('Combos', 'Combos y paquetes promocionales', NULL, 3, TRUE)
        RETURNING id INTO v_category_id;
    END IF;
    
    INSERT INTO catalog.collections (
        id,
        business_id,
        name,
        description,
        type,
        price,
        original_price,
        is_product, -- Tratarlo como producto
        category_id,
        product_type,
        is_available,
        display_order
    ) VALUES (
        v_collection_id,
        v_business_id,
        'Combo Hamburguesa con Papas',
        'Hamburguesa clásica con porción de papas',
        'combo',
        120.00, -- Precio del combo
        150.00, -- Precio si compraras por separado
        TRUE, -- Es un producto
        v_category_id,
        'food',
        TRUE,
        1
    ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        price = EXCLUDED.price;
END $$;

-- Paso 2: Agregar componentes con cantidades fraccionarias
INSERT INTO catalog.collection_products (
    collection_id,
    product_id,
    quantity,
    unit_label,
    price_override,
    display_order
) VALUES
    -- Hamburguesa (1 unidad)
    (
        'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid,
        '22222222-2222-2222-2222-222222222222'::uuid, -- Hamburguesa Clásica
        1.0,
        '1 unidad',
        100.00, -- Precio en el combo
        1
    ),
    -- Papas (media orden)
    (
        'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid,
        '11111111-1111-1111-1111-111111111111'::uuid, -- Papas Fritas
        0.5, -- Media orden
        'porción combo',
        20.00, -- Precio en el combo (menor que orden completa $50)
        2
    );
-- Nota: El índice único collection_products_unique previene duplicados automáticamente
-- Si intentas insertar un duplicado, obtendrás un error (lo cual está bien para este script de ejemplos)

-- ============================================================================
-- EJEMPLO 5: PRODUCTO DE FARMACIA
-- ============================================================================

-- Producto: Paracetamol 500mg
DO $$
DECLARE
    v_business_id UUID;
    v_category_id UUID;
    v_product_id UUID := '33333333-3333-3333-3333-333333333333'::uuid;
BEGIN
    -- Obtener el primer negocio disponible (o uno de tipo farmacia si existe)
    SELECT id INTO v_business_id 
    FROM core.businesses 
    WHERE category ILIKE '%farmacia%' OR category ILIKE '%pharmacy%'
    LIMIT 1;
    
    -- Si no hay farmacia, usar el primer negocio disponible
    IF v_business_id IS NULL THEN
        SELECT id INTO v_business_id 
        FROM core.businesses 
        LIMIT 1;
    END IF;
    
    IF v_business_id IS NULL THEN
        RAISE EXCEPTION 'No hay negocios en la base de datos. Por favor, crea un negocio primero.';
    END IF;
    
    -- Crear o obtener categoría "Analgésicos"
    SELECT id INTO v_category_id 
    FROM catalog.product_categories 
    WHERE name = 'Analgésicos' 
    LIMIT 1;
    
    IF v_category_id IS NULL THEN
        INSERT INTO catalog.product_categories (name, description, business_id, display_order, is_active)
        VALUES ('Analgésicos', 'Medicamentos analgésicos y antipiréticos', NULL, 4, TRUE)
        RETURNING id INTO v_category_id;
    END IF;
    
    INSERT INTO catalog.products (
        id,
        business_id,
        name,
        description,
        price,
        product_type,
        category_id,
        requires_prescription,
        age_restriction,
        max_quantity_per_order,
        requires_pharmacist_validation,
        is_available,
        display_order
    ) VALUES (
        v_product_id,
        v_business_id,
        'Paracetamol 500mg',
        'Analgésico y antipirético',
        25.00,
        'medicine',
        v_category_id,
        FALSE, -- No requiere receta
        NULL, -- Sin restricción de edad
        3, -- Máximo 3 por pedido
        FALSE, -- No requiere validación de farmacéutico
        TRUE,
        1
    ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        product_type = EXCLUDED.product_type;
END $$;

-- ============================================================================
-- EJEMPLO 6: CONSULTAS ÚTILES
-- ============================================================================

-- Consulta 1: Obtener producto con todas sus variantes
SELECT * FROM catalog.products_with_variants
WHERE id = '11111111-1111-1111-1111-111111111111'::uuid;

-- Consulta 2: Calcular precio de producto con variante seleccionada
SELECT 
    p.name as product_name,
    v.name as variant_name,
    catalog.calculate_product_price_with_variant(p.id, v.id) as final_price
FROM catalog.products p
JOIN catalog.product_variant_groups vg ON vg.product_id = p.id
JOIN catalog.product_variants v ON v.variant_group_id = vg.id
WHERE p.id = '11111111-1111-1111-1111-111111111111'::uuid;

-- Consulta 3: Buscar categorías por atributo
SELECT 
    name,
    attributes
FROM catalog.product_categories
WHERE attributes @> '{"temperature": "cold"}'::jsonb;

-- Consulta 4: Obtener productos de un tipo específico con sus atributos
SELECT 
    p.name,
    p.product_type,
    pta.attribute_name,
    pta.attribute_value
FROM catalog.products p
LEFT JOIN catalog.product_type_attributes pta ON pta.product_type = p.product_type
WHERE p.product_type = 'food'
AND pta.is_active = TRUE;

-- Consulta 5: Obtener combos con componentes y cantidades
SELECT 
    c.name as combo_name,
    c.price as combo_price,
    p.name as product_name,
    cp.quantity,
    cp.unit_label,
    cp.price_override
FROM catalog.collections c
JOIN catalog.collection_products cp ON cp.collection_id = c.id
JOIN catalog.products p ON p.id = cp.product_id
WHERE c.id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid
ORDER BY cp.display_order;

-- ============================================================================
-- FIN DE EJEMPLOS
-- ============================================================================

