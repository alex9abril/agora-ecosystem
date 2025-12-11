-- ============================================================================
-- SCRIPT DE PRODUCTOS DE PRUEBA: LOS PESCADITOS GORDITOS
-- ============================================================================
-- Descripción: Inserta un set de al menos 10 productos variados con variantes
--              realistas para la tienda "Los pescaditos gorditos"
-- 
-- Uso: Ejecutar después de las migraciones de catálogo avanzado
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2025-11-19
-- ============================================================================

SET search_path TO core, catalog, public;

-- Variables del negocio
DO $$
DECLARE
    v_business_id UUID := 'f1bacb26-be0b-4de6-b02f-b54527212d99'::uuid;
    
    -- IDs de categorías
    v_cat_entradas UUID := '00000000-0000-0000-0000-000000000001'::uuid;
    v_cat_platos_principales UUID := '00000000-0000-0000-0000-000000000002'::uuid;
    v_cat_bebidas UUID := '00000000-0000-0000-0000-000000000003'::uuid;
    v_cat_postres UUID := '00000000-0000-0000-0000-000000000004'::uuid;
    v_cat_especialidades UUID := '00000000-0000-0000-0000-000000000005'::uuid;
    v_cat_bebidas_frias UUID := '00000000-0000-0000-0000-000000000010'::uuid;
    v_cat_bebidas_calientes UUID := '00000000-0000-0000-0000-000000000011'::uuid;
    v_cat_acompanamientos UUID := 'a34e0f98-1358-44bd-877c-87ce007e87d4'::uuid;
    v_cat_combos UUID := 'c306057a-c787-471d-9c7c-442163041816'::uuid;
    
    -- Variables para productos
    v_product_id UUID;
    v_variant_group_id UUID;
    v_variant_id UUID;
BEGIN
    -- ============================================================================
    -- 1. TORTA DE PESCADO (Platos Principales) - Con variantes de tamaño
    -- ============================================================================
    v_product_id := gen_random_uuid();
    INSERT INTO catalog.products (
        id,
        business_id,
        name,
        description,
        image_url,
        price,
        product_type,
        category_id,
        is_available,
        is_featured,
        display_order,
        allergens,
        nutritional_info
    ) VALUES (
        v_product_id,
        v_business_id,
        'Torta de Pescado',
        'Deliciosa torta de pescado empanizado con lechuga, jitomate, cebolla, aguacate y mayonesa. Pan telera tostado.',
        NULL,
        85.00,
        'food',
        v_cat_platos_principales,
        TRUE,
        TRUE,
        1,
        ARRAY['gluten', 'pescado', 'huevo'],
        '{"calories": 450, "protein": 25, "carbs": 35, "fat": 20}'::jsonb
    );
    
    -- Grupo de variantes: Tamaño
    v_variant_group_id := gen_random_uuid();
    INSERT INTO catalog.product_variant_groups (
        id,
        product_id,
        name,
        description,
        is_required,
        selection_type,
        display_order
    ) VALUES (
        v_variant_group_id,
        v_product_id,
        'Tamaño',
        'Selecciona el tamaño de la torta',
        TRUE,
        'single',
        0
    );
    
    -- Variantes de tamaño
    INSERT INTO catalog.product_variants (id, variant_group_id, name, price_adjustment, absolute_price, is_available, display_order) VALUES
        (gen_random_uuid(), v_variant_group_id, 'Individual', 0, 85.00, TRUE, 1),
        (gen_random_uuid(), v_variant_group_id, 'Mediana', 20, 105.00, TRUE, 2),
        (gen_random_uuid(), v_variant_group_id, 'Grande', 40, 125.00, TRUE, 3);
    
    -- ============================================================================
    -- 2. TOSTADAS DE ATÚN (Entradas) - Con variantes de cantidad
    -- ============================================================================
    v_product_id := gen_random_uuid();
    INSERT INTO catalog.products (
        id,
        business_id,
        name,
        description,
        image_url,
        price,
        product_type,
        category_id,
        is_available,
        is_featured,
        display_order,
        allergens
    ) VALUES (
        v_product_id,
        v_business_id,
        'Tostadas de Atún',
        'Tostadas crujientes con atún fresco, aguacate, cebolla morada y salsa verde. Orden de 3 piezas.',
        NULL,
        75.00,
        'food',
        v_cat_entradas,
        TRUE,
        FALSE,
        1,
        ARRAY['pescado', 'gluten']
    );
    
    -- Grupo de variantes: Cantidad
    v_variant_group_id := gen_random_uuid();
    INSERT INTO catalog.product_variant_groups (
        id,
        product_id,
        name,
        description,
        is_required,
        selection_type,
        display_order
    ) VALUES (
        v_variant_group_id,
        v_product_id,
        'Cantidad',
        'Selecciona la cantidad de tostadas',
        TRUE,
        'single',
        0
    );
    
    -- Variantes de cantidad
    INSERT INTO catalog.product_variants (id, variant_group_id, name, price_adjustment, absolute_price, is_available, display_order) VALUES
        (gen_random_uuid(), v_variant_group_id, '3 piezas', 0, 75.00, TRUE, 1),
        (gen_random_uuid(), v_variant_group_id, '5 piezas', 40, 115.00, TRUE, 2),
        (gen_random_uuid(), v_variant_group_id, '7 piezas', 80, 155.00, TRUE, 3);
    
    -- ============================================================================
    -- 3. CEVICHE (Entradas) - Con variantes de tamaño y tipo de pescado
    -- ============================================================================
    INSERT INTO catalog.products (
        id,
        business_id,
        name,
        description,
        image_url,
        price,
        product_type,
        category_id,
        is_available,
        is_featured,
        display_order,
        allergens
    ) VALUES (
        gen_random_uuid(),
        v_business_id,
        'Ceviche',
        'Ceviche fresco de pescado con cebolla, cilantro, jitomate, aguacate y limón. Acompañado con tostadas.',
        NULL,
        95.00,
        'food',
        v_cat_entradas,
        TRUE,
        TRUE,
        2,
        ARRAY['pescado']
    ) RETURNING id INTO v_product_id;
    
    -- Grupo 1: Tamaño
    INSERT INTO catalog.product_variant_groups (
        id,
        product_id,
        name,
        description,
        is_required,
        selection_type,
        display_order
    ) VALUES (
        gen_random_uuid(),
        v_product_id,
        'Tamaño',
        'Selecciona el tamaño de la porción',
        TRUE,
        'single',
        0
    ) RETURNING id INTO v_variant_group_id;
    
    INSERT INTO catalog.product_variants (id, variant_group_id, name, price_adjustment, absolute_price, is_available, display_order) VALUES
        (gen_random_uuid(), v_variant_group_id, 'Chico', 0, 95.00, TRUE, 1),
        (gen_random_uuid(), v_variant_group_id, 'Mediano', 30, 125.00, TRUE, 2),
        (gen_random_uuid(), v_variant_group_id, 'Grande', 60, 155.00, TRUE, 3);
    
    -- Grupo 2: Tipo de pescado
    INSERT INTO catalog.product_variant_groups (
        id,
        product_id,
        name,
        description,
        is_required,
        selection_type,
        display_order
    ) VALUES (
        gen_random_uuid(),
        v_product_id,
        'Tipo de Pescado',
        'Selecciona el tipo de pescado',
        TRUE,
        'single',
        1
    ) RETURNING id INTO v_variant_group_id;
    
    INSERT INTO catalog.product_variants (id, variant_group_id, name, price_adjustment, is_available, display_order) VALUES
        (gen_random_uuid(), v_variant_group_id, 'Pescado blanco', 0, TRUE, 1),
        (gen_random_uuid(), v_variant_group_id, 'Atún', 15, TRUE, 2),
        (gen_random_uuid(), v_variant_group_id, 'Camarón', 25, TRUE, 3);
    
    -- ============================================================================
    -- 4. MICHELADA (Bebidas Frías) - Con variantes de cerveza y salsas
    -- ============================================================================
    INSERT INTO catalog.products (
        id,
        business_id,
        name,
        description,
        image_url,
        price,
        product_type,
        category_id,
        is_available,
        is_featured,
        display_order,
        allergens
    ) VALUES (
        gen_random_uuid(),
        v_business_id,
        'Michelada',
        'Refrescante bebida preparada con cerveza clara, jugo de limón natural, sal, salsas clásicas y hielo. Vaso escarchado con sal y chile en polvo, servido frío. (500ml)',
        NULL,
        120.00,
        'beverage',
        v_cat_bebidas_frias,
        TRUE,
        TRUE,
        1,
        ARRAY['gluten']
    ) RETURNING id INTO v_product_id;
    
    -- Grupo 1: Tipo de cerveza
    INSERT INTO catalog.product_variant_groups (
        id,
        product_id,
        name,
        description,
        is_required,
        selection_type,
        display_order
    ) VALUES (
        gen_random_uuid(),
        v_product_id,
        'Cerveza',
        'Selecciona el tipo de cerveza',
        TRUE,
        'single',
        0
    ) RETURNING id INTO v_variant_group_id;
    
    INSERT INTO catalog.product_variants (id, variant_group_id, name, price_adjustment, absolute_price, is_available, display_order) VALUES
        (gen_random_uuid(), v_variant_group_id, 'Corona', 0, 140.00, TRUE, 1),
        (gen_random_uuid(), v_variant_group_id, 'Bud Light', 10, 150.00, TRUE, 2),
        (gen_random_uuid(), v_variant_group_id, 'Modelo Especial', 15, 155.00, TRUE, 3);
    
    -- Grupo 2: Salsas (múltiple selección)
    INSERT INTO catalog.product_variant_groups (
        id,
        product_id,
        name,
        description,
        is_required,
        selection_type,
        display_order
    ) VALUES (
        gen_random_uuid(),
        v_product_id,
        'Salsas',
        'Selecciona las salsas que deseas (puedes elegir varias)',
        TRUE,
        'multiple',
        1
    ) RETURNING id INTO v_variant_group_id;
    
    INSERT INTO catalog.product_variants (id, variant_group_id, name, price_adjustment, is_available, display_order) VALUES
        (gen_random_uuid(), v_variant_group_id, 'Magui', 0, TRUE, 1),
        (gen_random_uuid(), v_variant_group_id, 'Valentina', 0, TRUE, 2),
        (gen_random_uuid(), v_variant_group_id, 'Inglesa', 0, TRUE, 3),
        (gen_random_uuid(), v_variant_group_id, 'Tajín', 0, TRUE, 4);
    
    -- ============================================================================
    -- 5. AGUA FRESCA (Bebidas Frías) - Con variantes de sabor
    -- ============================================================================
    INSERT INTO catalog.products (
        id,
        business_id,
        name,
        description,
        image_url,
        price,
        product_type,
        category_id,
        is_available,
        is_featured,
        display_order
    ) VALUES (
        gen_random_uuid(),
        v_business_id,
        'Agua Fresca',
        'Refrescante agua fresca natural. Disponible en varios sabores. (500ml)',
        NULL,
        25.00,
        'beverage',
        v_cat_bebidas_frias,
        TRUE,
        FALSE,
        2
    ) RETURNING id INTO v_product_id;
    
    -- Grupo: Sabor
    INSERT INTO catalog.product_variant_groups (
        id,
        product_id,
        name,
        description,
        is_required,
        selection_type,
        display_order
    ) VALUES (
        gen_random_uuid(),
        v_product_id,
        'Sabor',
        'Selecciona el sabor',
        TRUE,
        'single',
        0
    ) RETURNING id INTO v_variant_group_id;
    
    INSERT INTO catalog.product_variants (id, variant_group_id, name, price_adjustment, is_available, display_order) VALUES
        (gen_random_uuid(), v_variant_group_id, 'Horchata', 0, TRUE, 1),
        (gen_random_uuid(), v_variant_group_id, 'Jamaica', 0, TRUE, 2),
        (gen_random_uuid(), v_variant_group_id, 'Tamarindo', 0, TRUE, 3),
        (gen_random_uuid(), v_variant_group_id, 'Limonada', 0, TRUE, 4);
    
    -- ============================================================================
    -- 6. PAPAS FRITAS (Acompañamientos) - Con variantes de tamaño
    -- ============================================================================
    INSERT INTO catalog.products (
        id,
        business_id,
        name,
        description,
        image_url,
        price,
        product_type,
        category_id,
        is_available,
        is_featured,
        display_order,
        allergens
    ) VALUES (
        gen_random_uuid(),
        v_business_id,
        'Papas Fritas',
        'Papas fritas caseras crujientes. Acompañamiento perfecto para cualquier platillo.',
        NULL,
        45.00,
        'food',
        v_cat_acompanamientos,
        TRUE,
        FALSE,
        1,
        ARRAY['gluten']
    ) RETURNING id INTO v_product_id;
    
    -- Grupo: Tamaño
    INSERT INTO catalog.product_variant_groups (
        id,
        product_id,
        name,
        description,
        is_required,
        selection_type,
        display_order
    ) VALUES (
        gen_random_uuid(),
        v_product_id,
        'Tamaño',
        'Selecciona el tamaño',
        TRUE,
        'single',
        0
    ) RETURNING id INTO v_variant_group_id;
    
    INSERT INTO catalog.product_variants (id, variant_group_id, name, price_adjustment, absolute_price, is_available, display_order) VALUES
        (gen_random_uuid(), v_variant_group_id, 'Chica', 0, 45.00, TRUE, 1),
        (gen_random_uuid(), v_variant_group_id, 'Mediana', 15, 60.00, TRUE, 2),
        (gen_random_uuid(), v_variant_group_id, 'Grande', 30, 75.00, TRUE, 3);
    
    -- ============================================================================
    -- 7. ENSALADA (Acompañamientos) - Con variantes de aderezo
    -- ============================================================================
    INSERT INTO catalog.products (
        id,
        business_id,
        name,
        description,
        image_url,
        price,
        product_type,
        category_id,
        is_available,
        is_featured,
        display_order,
        nutritional_info
    ) VALUES (
        gen_random_uuid(),
        v_business_id,
        'Ensalada Mixta',
        'Ensalada fresca con lechuga, jitomate, cebolla, aguacate y aderezo a elegir.',
        NULL,
        55.00,
        'food',
        v_cat_acompanamientos,
        TRUE,
        FALSE,
        2,
        '{"calories": 120, "protein": 3, "carbs": 15, "fat": 5}'::jsonb
    ) RETURNING id INTO v_product_id;
    
    -- Grupo: Aderezo
    INSERT INTO catalog.product_variant_groups (
        id,
        product_id,
        name,
        description,
        is_required,
        selection_type,
        display_order
    ) VALUES (
        gen_random_uuid(),
        v_product_id,
        'Aderezo',
        'Selecciona el aderezo',
        TRUE,
        'single',
        0
    ) RETURNING id INTO v_variant_group_id;
    
    INSERT INTO catalog.product_variants (id, variant_group_id, name, price_adjustment, is_available, display_order) VALUES
        (gen_random_uuid(), v_variant_group_id, 'Ranch', 0, TRUE, 1),
        (gen_random_uuid(), v_variant_group_id, 'César', 0, TRUE, 2),
        (gen_random_uuid(), v_variant_group_id, 'Vinagreta', 0, TRUE, 3),
        (gen_random_uuid(), v_variant_group_id, 'Aceite y limón', 0, TRUE, 4);
    
    -- ============================================================================
    -- 8. FLAN (Postres) - Sin variantes
    -- ============================================================================
    INSERT INTO catalog.products (
        id,
        business_id,
        name,
        description,
        image_url,
        price,
        product_type,
        category_id,
        is_available,
        is_featured,
        display_order,
        allergens,
        nutritional_info
    ) VALUES (
        gen_random_uuid(),
        v_business_id,
        'Flan Napolitano',
        'Delicioso flan casero con caramelo. Postre tradicional mexicano.',
        NULL,
        35.00,
        'food',
        v_cat_postres,
        TRUE,
        FALSE,
        1,
        ARRAY['huevo', 'lacteos'],
        '{"calories": 180, "protein": 5, "carbs": 30, "fat": 6}'::jsonb
    );
    
    -- ============================================================================
    -- 9. COMBO TORTA + BEBIDA (Combos) - Sin variantes
    -- ============================================================================
    INSERT INTO catalog.products (
        id,
        business_id,
        name,
        description,
        image_url,
        price,
        product_type,
        category_id,
        is_available,
        is_featured,
        display_order
    ) VALUES (
        gen_random_uuid(),
        v_business_id,
        'Combo Torta + Bebida',
        'Torta de pescado individual + agua fresca de 500ml. Ahorra $10 con este combo.',
        NULL,
        100.00,
        'food',
        v_cat_combos,
        TRUE,
        TRUE,
        1
    );
    
    -- ============================================================================
    -- 10. TORTA ESPECIAL (Especialidades) - Con variantes de proteína y extras
    -- ============================================================================
    INSERT INTO catalog.products (
        id,
        business_id,
        name,
        description,
        image_url,
        price,
        product_type,
        category_id,
        is_available,
        is_featured,
        display_order,
        allergens
    ) VALUES (
        gen_random_uuid(),
        v_business_id,
        'Torta Especial del Mar',
        'Torta gourmet con pescado empanizado, camarón, aguacate, queso panela, lechuga, jitomate y mayonesa especial. Pan telera artesanal.',
        NULL,
        150.00,
        'food',
        v_cat_especialidades,
        TRUE,
        TRUE,
        1,
        ARRAY['gluten', 'pescado', 'mariscos', 'huevo', 'lacteos']
    ) RETURNING id INTO v_product_id;
    
    -- Grupo 1: Proteína extra
    INSERT INTO catalog.product_variant_groups (
        id,
        product_id,
        name,
        description,
        is_required,
        selection_type,
        display_order
    ) VALUES (
        gen_random_uuid(),
        v_product_id,
        'Proteína Extra',
        'Agrega proteína extra (opcional)',
        FALSE,
        'single',
        0
    ) RETURNING id INTO v_variant_group_id;
    
    INSERT INTO catalog.product_variants (id, variant_group_id, name, price_adjustment, is_available, display_order) VALUES
        (gen_random_uuid(), v_variant_group_id, 'Sin extra', 0, TRUE, 1),
        (gen_random_uuid(), v_variant_group_id, 'Camarón extra', 30, TRUE, 2),
        (gen_random_uuid(), v_variant_group_id, 'Pescado extra', 25, TRUE, 3);
    
    -- Grupo 2: Extras (múltiple selección)
    INSERT INTO catalog.product_variant_groups (
        id,
        product_id,
        name,
        description,
        is_required,
        selection_type,
        display_order
    ) VALUES (
        gen_random_uuid(),
        v_product_id,
        'Extras',
        'Agrega extras a tu torta (puedes elegir varios)',
        FALSE,
        'multiple',
        1
    ) RETURNING id INTO v_variant_group_id;
    
    INSERT INTO catalog.product_variants (id, variant_group_id, name, price_adjustment, is_available, display_order) VALUES
        (gen_random_uuid(), v_variant_group_id, 'Queso extra', 10, TRUE, 1),
        (gen_random_uuid(), v_variant_group_id, 'Aguacate extra', 15, TRUE, 2),
        (gen_random_uuid(), v_variant_group_id, 'Cebolla caramelizada', 8, TRUE, 3),
        (gen_random_uuid(), v_variant_group_id, 'Papas fritas', 20, TRUE, 4);
    
    -- ============================================================================
    -- 11. CAFÉ DE OLLA (Bebidas Calientes) - Con variantes de tamaño
    -- ============================================================================
    INSERT INTO catalog.products (
        id,
        business_id,
        name,
        description,
        image_url,
        price,
        product_type,
        category_id,
        is_available,
        is_featured,
        display_order
    ) VALUES (
        gen_random_uuid(),
        v_business_id,
        'Café de Olla',
        'Café tradicional mexicano preparado con canela y piloncillo. Servido caliente.',
        NULL,
        30.00,
        'beverage',
        v_cat_bebidas_calientes,
        TRUE,
        FALSE,
        1
    ) RETURNING id INTO v_product_id;
    
    -- Grupo: Tamaño
    INSERT INTO catalog.product_variant_groups (
        id,
        product_id,
        name,
        description,
        is_required,
        selection_type,
        display_order
    ) VALUES (
        gen_random_uuid(),
        v_product_id,
        'Tamaño',
        'Selecciona el tamaño',
        TRUE,
        'single',
        0
    ) RETURNING id INTO v_variant_group_id;
    
    INSERT INTO catalog.product_variants (id, variant_group_id, name, price_adjustment, absolute_price, is_available, display_order) VALUES
        (gen_random_uuid(), v_variant_group_id, 'Chico (250ml)', 0, 30.00, TRUE, 1),
        (gen_random_uuid(), v_variant_group_id, 'Mediano (350ml)', 10, 40.00, TRUE, 2),
        (gen_random_uuid(), v_variant_group_id, 'Grande (500ml)', 20, 50.00, TRUE, 3);
    
    -- ============================================================================
    -- 12. COCTEL DE CAMARÓN (Entradas) - Con variantes de tamaño
    -- ============================================================================
    INSERT INTO catalog.products (
        id,
        business_id,
        name,
        description,
        image_url,
        price,
        product_type,
        category_id,
        is_available,
        is_featured,
        display_order,
        allergens
    ) VALUES (
        gen_random_uuid(),
        v_business_id,
        'Cóctel de Camarón',
        'Cóctel fresco de camarón con cebolla, cilantro, jitomate, aguacate y salsa especial. Acompañado con galletas saladas.',
        NULL,
        110.00,
        'food',
        v_cat_entradas,
        TRUE,
        TRUE,
        3,
        ARRAY['mariscos']
    ) RETURNING id INTO v_product_id;
    
    -- Grupo: Tamaño
    INSERT INTO catalog.product_variant_groups (
        id,
        product_id,
        name,
        description,
        is_required,
        selection_type,
        display_order
    ) VALUES (
        gen_random_uuid(),
        v_product_id,
        'Tamaño',
        'Selecciona el tamaño',
        TRUE,
        'single',
        0
    ) RETURNING id INTO v_variant_group_id;
    
    INSERT INTO catalog.product_variants (id, variant_group_id, name, price_adjustment, absolute_price, is_available, display_order) VALUES
        (gen_random_uuid(), v_variant_group_id, 'Chico', 0, 110.00, TRUE, 1),
        (gen_random_uuid(), v_variant_group_id, 'Mediano', 40, 150.00, TRUE, 2),
        (gen_random_uuid(), v_variant_group_id, 'Grande', 80, 190.00, TRUE, 3);
    
    RAISE NOTICE '✅ Set 1 de productos de prueba insertados correctamente para Los pescaditos gorditos';
    RAISE NOTICE '   Total: 12 productos con variantes realistas';
    
END $$;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- Verificar que se insertaron los productos correctamente
SELECT 
    p.id,
    p.name,
    p.product_type,
    pc.name as category_name,
    p.price,
    p.is_available,
    p.is_featured,
    COUNT(DISTINCT vg.id) as variant_groups_count,
    COUNT(DISTINCT v.id) as variants_count
FROM catalog.products p
LEFT JOIN catalog.product_categories pc ON p.category_id = pc.id
LEFT JOIN catalog.product_variant_groups vg ON vg.product_id = p.id
LEFT JOIN catalog.product_variants v ON v.variant_group_id = vg.id
WHERE p.business_id = 'f1bacb26-be0b-4de6-b02f-b54527212d99'::uuid
GROUP BY p.id, p.name, p.product_type, pc.name, p.price, p.is_available, p.is_featured
ORDER BY p.display_order, p.name;

-- ============================================================================
-- NOTAS
-- ============================================================================
-- - Este es el Set 1 de productos de prueba (12 productos iniciales)
-- - Los productos incluyen variantes de tamaño, sabor, proteína, extras, etc.
-- - Algunos productos tienen múltiples grupos de variantes
-- - Los precios están en pesos mexicanos (MXN)
-- - Los alérgenos están especificados según el tipo de producto
-- - Algunos productos incluyen información nutricional
-- 
-- PRODUCTOS INCLUIDOS EN ESTE SET:
-- - Torta de Pescado (Platos Principales)
-- - Tostadas de Atún (Entradas)
-- - Ceviche (Entradas)
-- - Michelada (Bebidas Frías)
-- - Agua Fresca (Bebidas Frías)
-- - Papas Fritas (Acompañamientos)
-- - Ensalada Mixta (Acompañamientos)
-- - Flan Napolitano (Postres)
-- - Combo Torta + Bebida (Combos)
-- - Torta Especial del Mar (Especialidades)
-- - Café de Olla (Bebidas Calientes)
-- - Cóctel de Camarón (Entradas)
-- 
-- NOTA: Para el Set 2 de productos adicionales, ejecuta el archivo:
--       seed_test_products_pescaditos_set2.sql
-- ============================================================================

