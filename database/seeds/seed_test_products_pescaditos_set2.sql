-- ============================================================================
-- SCRIPT DE PRODUCTOS DE PRUEBA SET 2: LOS PESCADITOS GORDITOS
-- ============================================================================
-- Descripción: Inserta un segundo set de 10 productos adicionales con variantes
--              realistas para la tienda "Los pescaditos gorditos"
-- 
-- Uso: Ejecutar después de seed_test_products_pescaditos.sql
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
    -- SET 2: PRODUCTOS ADICIONALES (10 productos diferentes)
    -- ============================================================================
    
    -- ============================================================================
    -- 13. TACO DE PESCADO (Platos Principales) - Con variantes de tipo de pescado
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
        'Taco de Pescado',
        'Taco de pescado empanizado con repollo, salsa especial y limón. Orden de 2 tacos.',
        NULL,
        65.00,
        'food',
        v_cat_platos_principales,
        TRUE,
        FALSE,
        2,
        ARRAY['gluten', 'pescado', 'huevo']
    );
    
    -- Grupo: Tipo de pescado
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
        'Tipo de Pescado',
        'Selecciona el tipo de pescado',
        TRUE,
        'single',
        0
    );
    
    INSERT INTO catalog.product_variants (id, variant_group_id, name, price_adjustment, is_available, display_order) VALUES
        (gen_random_uuid(), v_variant_group_id, 'Pescado blanco', 0, TRUE, 1),
        (gen_random_uuid(), v_variant_group_id, 'Atún', 10, TRUE, 2),
        (gen_random_uuid(), v_variant_group_id, 'Salmón', 20, TRUE, 3);
    
    -- ============================================================================
    -- 14. AGUACHILE (Entradas) - Con variantes de picante y proteína
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
        'Aguachile',
        'Aguachile fresco con cebolla morada, pepino, cilantro y chile. Preparado al momento.',
        NULL,
        105.00,
        'food',
        v_cat_entradas,
        TRUE,
        TRUE,
        4,
        ARRAY['mariscos', 'pescado']
    );
    
    -- Grupo 1: Nivel de picante
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
        'Nivel de Picante',
        'Selecciona qué tan picante lo quieres',
        TRUE,
        'single',
        0
    );
    
    INSERT INTO catalog.product_variants (id, variant_group_id, name, price_adjustment, is_available, display_order) VALUES
        (gen_random_uuid(), v_variant_group_id, 'Suave', 0, TRUE, 1),
        (gen_random_uuid(), v_variant_group_id, 'Medio', 0, TRUE, 2),
        (gen_random_uuid(), v_variant_group_id, 'Picante', 0, TRUE, 3),
        (gen_random_uuid(), v_variant_group_id, 'Muy picante', 0, TRUE, 4);
    
    -- Grupo 2: Proteína
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
        'Proteína',
        'Selecciona la proteína',
        TRUE,
        'single',
        1
    );
    
    INSERT INTO catalog.product_variants (id, variant_group_id, name, price_adjustment, is_available, display_order) VALUES
        (gen_random_uuid(), v_variant_group_id, 'Camarón', 0, TRUE, 1),
        (gen_random_uuid(), v_variant_group_id, 'Pescado', 0, TRUE, 2),
        (gen_random_uuid(), v_variant_group_id, 'Mixto (Camarón + Pescado)', 25, TRUE, 3);
    
    -- ============================================================================
    -- 15. TOSTADA DE CEVICHE (Entradas) - Con variantes de cantidad
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
        'Tostada de Ceviche',
        'Tostada crujiente con ceviche fresco, aguacate, cebolla y cilantro. Orden de 2 piezas.',
        NULL,
        70.00,
        'food',
        v_cat_entradas,
        TRUE,
        FALSE,
        5,
        ARRAY['pescado', 'gluten']
    );
    
    -- Grupo: Cantidad
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
        'Selecciona la cantidad',
        TRUE,
        'single',
        0
    );
    
    INSERT INTO catalog.product_variants (id, variant_group_id, name, price_adjustment, absolute_price, is_available, display_order) VALUES
        (gen_random_uuid(), v_variant_group_id, '2 piezas', 0, 70.00, TRUE, 1),
        (gen_random_uuid(), v_variant_group_id, '4 piezas', 60, 130.00, TRUE, 2),
        (gen_random_uuid(), v_variant_group_id, '6 piezas', 130, 200.00, TRUE, 3);
    
    -- ============================================================================
    -- 16. REFRESCO (Bebidas Frías) - Con variantes de sabor y tamaño
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
        display_order
    ) VALUES (
        v_product_id,
        v_business_id,
        'Refresco',
        'Refresco embotellado frío. Disponible en varios sabores.',
        NULL,
        25.00,
        'beverage',
        v_cat_bebidas_frias,
        TRUE,
        FALSE,
        3
    );
    
    -- Grupo 1: Sabor
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
        'Sabor',
        'Selecciona el sabor',
        TRUE,
        'single',
        0
    );
    
    INSERT INTO catalog.product_variants (id, variant_group_id, name, price_adjustment, is_available, display_order) VALUES
        (gen_random_uuid(), v_variant_group_id, 'Coca Cola', 0, TRUE, 1),
        (gen_random_uuid(), v_variant_group_id, 'Sprite', 0, TRUE, 2),
        (gen_random_uuid(), v_variant_group_id, 'Fanta', 0, TRUE, 3),
        (gen_random_uuid(), v_variant_group_id, 'Jarritos', 0, TRUE, 4);
    
    -- Grupo 2: Tamaño
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
        'Selecciona el tamaño',
        TRUE,
        'single',
        1
    );
    
    INSERT INTO catalog.product_variants (id, variant_group_id, name, price_adjustment, absolute_price, is_available, display_order) VALUES
        (gen_random_uuid(), v_variant_group_id, 'Chico (355ml)', 0, 25.00, TRUE, 1),
        (gen_random_uuid(), v_variant_group_id, 'Mediano (500ml)', 5, 30.00, TRUE, 2),
        (gen_random_uuid(), v_variant_group_id, 'Grande (600ml)', 10, 35.00, TRUE, 3);
    
    -- ============================================================================
    -- 17. TÉ HELADO (Bebidas Frías) - Con variantes de sabor
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
        display_order
    ) VALUES (
        v_product_id,
        v_business_id,
        'Té Helado',
        'Refrescante té helado natural. Disponible en varios sabores. (500ml)',
        NULL,
        30.00,
        'beverage',
        v_cat_bebidas_frias,
        TRUE,
        FALSE,
        4
    );
    
    -- Grupo: Sabor
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
        'Sabor',
        'Selecciona el sabor',
        TRUE,
        'single',
        0
    );
    
    INSERT INTO catalog.product_variants (id, variant_group_id, name, price_adjustment, is_available, display_order) VALUES
        (gen_random_uuid(), v_variant_group_id, 'Té negro', 0, TRUE, 1),
        (gen_random_uuid(), v_variant_group_id, 'Té verde', 0, TRUE, 2),
        (gen_random_uuid(), v_variant_group_id, 'Té de limón', 0, TRUE, 3),
        (gen_random_uuid(), v_variant_group_id, 'Té de durazno', 0, TRUE, 4);
    
    -- ============================================================================
    -- 18. ARROZ A LA MEXICANA (Acompañamientos) - Con variantes de extras
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
        'Arroz a la Mexicana',
        'Arroz rojo tradicional mexicano con jitomate, cebolla y especias. Acompañamiento perfecto.',
        NULL,
        40.00,
        'food',
        v_cat_acompanamientos,
        TRUE,
        FALSE,
        3,
        ARRAY[]::TEXT[]
    );
    
    -- Grupo: Extras (opcional, múltiple)
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
        'Extras',
        'Agrega extras a tu arroz (opcional)',
        FALSE,
        'multiple',
        0
    );
    
    INSERT INTO catalog.product_variants (id, variant_group_id, name, price_adjustment, is_available, display_order) VALUES
        (gen_random_uuid(), v_variant_group_id, 'Elote', 15, TRUE, 1),
        (gen_random_uuid(), v_variant_group_id, 'Frijoles', 10, TRUE, 2),
        (gen_random_uuid(), v_variant_group_id, 'Queso', 12, TRUE, 3);
    
    -- ============================================================================
    -- 19. FRIJOLES REFRITOS (Acompañamientos) - Sin variantes
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
        'Frijoles Refritos',
        'Frijoles refritos tradicionales con manteca. Acompañamiento clásico mexicano.',
        NULL,
        35.00,
        'food',
        v_cat_acompanamientos,
        TRUE,
        FALSE,
        4,
        ARRAY[]::TEXT[]
    );
    
    -- ============================================================================
    -- 20. HELADO (Postres) - Con variantes de sabor
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
        'Helado',
        'Helado artesanal cremoso. Disponible en varios sabores. (1 bola)',
        NULL,
        40.00,
        'food',
        v_cat_postres,
        TRUE,
        FALSE,
        2,
        ARRAY['lacteos', 'huevo'],
        '{"calories": 150, "protein": 3, "carbs": 20, "fat": 7}'::jsonb
    );
    
    -- Grupo: Sabor
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
        'Sabor',
        'Selecciona el sabor',
        TRUE,
        'single',
        0
    );
    
    INSERT INTO catalog.product_variants (id, variant_group_id, name, price_adjustment, is_available, display_order) VALUES
        (gen_random_uuid(), v_variant_group_id, 'Vainilla', 0, TRUE, 1),
        (gen_random_uuid(), v_variant_group_id, 'Chocolate', 0, TRUE, 2),
        (gen_random_uuid(), v_variant_group_id, 'Fresa', 0, TRUE, 3),
        (gen_random_uuid(), v_variant_group_id, 'Napolitano', 0, TRUE, 4),
        (gen_random_uuid(), v_variant_group_id, 'Coco', 0, TRUE, 5);
    
    -- ============================================================================
    -- 21. COMBO FAMILIAR (Combos) - Sin variantes
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
        'Combo Familiar',
        'Ideal para compartir: 4 tortas de pescado medianas + 4 aguas frescas + 2 papas fritas grandes. Ahorra $50.',
        NULL,
        550.00,
        'food',
        v_cat_combos,
        TRUE,
        TRUE,
        2
    );
    
    -- ============================================================================
    -- 22. PESCADO A LA TALLA (Especialidades) - Con variantes de tamaño y tipo
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
        'Pescado a la Talla',
        'Pescado entero a la parrilla con adobo especial. Acompañado con arroz, frijoles, ensalada y tortillas. Servido para 2 personas.',
        NULL,
        280.00,
        'food',
        v_cat_especialidades,
        TRUE,
        TRUE,
        2,
        ARRAY['pescado']
    );
    
    -- Grupo 1: Tamaño del pescado
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
        'Selecciona el tamaño del pescado',
        TRUE,
        'single',
        0
    );
    
    INSERT INTO catalog.product_variants (id, variant_group_id, name, price_adjustment, absolute_price, is_available, display_order) VALUES
        (gen_random_uuid(), v_variant_group_id, 'Mediano (2 personas)', 0, 280.00, TRUE, 1),
        (gen_random_uuid(), v_variant_group_id, 'Grande (3-4 personas)', 100, 380.00, TRUE, 2),
        (gen_random_uuid(), v_variant_group_id, 'Extra grande (5-6 personas)', 200, 480.00, TRUE, 3);
    
    -- Grupo 2: Tipo de pescado
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
        'Tipo de Pescado',
        'Selecciona el tipo de pescado',
        TRUE,
        'single',
        1
    );
    
    INSERT INTO catalog.product_variants (id, variant_group_id, name, price_adjustment, is_available, display_order) VALUES
        (gen_random_uuid(), v_variant_group_id, 'Robalo', 0, TRUE, 1),
        (gen_random_uuid(), v_variant_group_id, 'Huachinango', 30, TRUE, 2),
        (gen_random_uuid(), v_variant_group_id, 'Mojarra', 0, TRUE, 3);
    
    RAISE NOTICE '✅ Set 2 de productos de prueba insertados correctamente para Los pescaditos gorditos';
    RAISE NOTICE '   Total: 10 productos adicionales con variantes realistas';
    
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
-- - Este es el Set 2 de productos de prueba (10 productos adicionales)
-- - Los productos incluyen variantes de tamaño, sabor, proteína, extras, etc.
-- - Algunos productos tienen múltiples grupos de variantes
-- - Los precios están en pesos mexicanos (MXN)
-- - Los alérgenos están especificados según el tipo de producto
-- - Algunos productos incluyen información nutricional
-- 
-- PRODUCTOS INCLUIDOS EN ESTE SET:
-- - Taco de Pescado (Platos Principales)
-- - Aguachile (Entradas)
-- - Tostada de Ceviche (Entradas)
-- - Refresco (Bebidas Frías)
-- - Té Helado (Bebidas Frías)
-- - Arroz a la Mexicana (Acompañamientos)
-- - Frijoles Refritos (Acompañamientos)
-- - Helado (Postres)
-- - Combo Familiar (Combos)
-- - Pescado a la Talla (Especialidades)
-- ============================================================================

