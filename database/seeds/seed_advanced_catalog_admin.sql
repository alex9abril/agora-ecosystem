-- ============================================================================
-- SEED: Catálogo Avanzado para Administradores
-- ============================================================================
-- Descripción: Catálogo completo de tipos de productos y categorías
--              gestionado exclusivamente por administradores
-- 
-- Uso: Ejecutar después de migration_advanced_catalog_system.sql
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2025-01-XX
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- 1. ATRIBUTOS DE TIPOS DE PRODUCTO (Configuración Global)
-- ============================================================================

-- Limpiar atributos existentes (opcional, comentar si quieres mantener los del migration)
-- DELETE FROM catalog.product_type_attributes;

-- Insertar atributos completos para cada tipo de producto
INSERT INTO catalog.product_type_attributes (product_type, attribute_name, attribute_value, description, display_order, is_active)
VALUES
    -- ========== ALIMENTOS (food) ==========
    ('food', 'requires_temperature_control', 'true'::jsonb, 'Requiere control de temperatura durante almacenamiento y transporte', 1, TRUE),
    ('food', 'is_perishable', 'true'::jsonb, 'Es un producto perecedero con fecha de caducidad', 2, TRUE),
    ('food', 'suggest_beverage', 'true'::jsonb, 'Sugerir bebidas al agregar este producto al carrito', 3, TRUE),
    ('food', 'suggest_dessert', 'true'::jsonb, 'Sugerir postres al agregar este producto al carrito', 4, TRUE),
    ('food', 'requires_heating', 'false'::jsonb, 'Requiere calentamiento antes de servir', 5, TRUE),
    ('food', 'is_ready_to_eat', 'true'::jsonb, 'Listo para consumir sin preparación adicional', 6, TRUE),
    ('food', 'allergen_risk', 'high'::jsonb, 'Alto riesgo de contener alérgenos comunes', 7, TRUE),
    ('food', 'dietary_options', '["vegetarian", "vegan", "gluten-free", "dairy-free"]'::jsonb, 'Opciones dietéticas disponibles', 8, TRUE),
    
    -- ========== BEBIDAS (beverage) ==========
    ('beverage', 'requires_temperature_control', 'true'::jsonb, 'Requiere control de temperatura (frío o caliente)', 1, TRUE),
    ('beverage', 'is_perishable', 'false'::jsonb, 'No es perecedero (excepto jugos naturales)', 2, TRUE),
    ('beverage', 'suggest_food', 'false'::jsonb, 'No sugerir comida al agregar (las bebidas son complementarias)', 3, TRUE),
    ('beverage', 'serving_temperature', '["cold", "hot", "room"]'::jsonb, 'Temperaturas de servicio disponibles', 4, TRUE),
    ('beverage', 'contains_alcohol', 'false'::jsonb, 'Contiene alcohol (requiere validación de edad)', 5, TRUE),
    ('beverage', 'sugar_content', '["sugar-free", "low-sugar", "regular"]'::jsonb, 'Niveles de azúcar disponibles', 6, TRUE),
    ('beverage', 'caffeine_content', '["none", "low", "medium", "high"]'::jsonb, 'Niveles de cafeína disponibles', 7, TRUE),
    
    -- ========== MEDICAMENTOS (medicine) ==========
    ('medicine', 'requires_prescription_validation', 'true'::jsonb, 'Requiere validación de receta médica', 1, TRUE),
    ('medicine', 'requires_pharmacist_approval', 'true'::jsonb, 'Requiere aprobación de farmacéutico antes de procesar', 2, TRUE),
    ('medicine', 'has_quantity_limits', 'true'::jsonb, 'Tiene límites de cantidad por pedido', 3, TRUE),
    ('medicine', 'requires_age_verification', 'true'::jsonb, 'Requiere verificación de edad del comprador', 4, TRUE),
    ('medicine', 'storage_requirements', '["room-temperature", "refrigerated", "protected-from-light"]'::jsonb, 'Requisitos de almacenamiento', 5, TRUE),
    ('medicine', 'requires_medical_history', 'false'::jsonb, 'Requiere historial médico del paciente', 6, TRUE),
    ('medicine', 'is_controlled_substance', 'false'::jsonb, 'Es una sustancia controlada (requiere permisos especiales)', 7, TRUE),
    ('medicine', 'expiration_tracking', 'true'::jsonb, 'Requiere seguimiento de fecha de caducidad', 8, TRUE),
    
    -- ========== ABARROTES (grocery) ==========
    ('grocery', 'requires_temperature_control', 'false'::jsonb, 'No requiere control de temperatura especial', 1, TRUE),
    ('grocery', 'is_perishable', 'false'::jsonb, 'No es perecedero (productos enlatados, empaquetados)', 2, TRUE),
    ('grocery', 'shelf_life', 'long'::jsonb, 'Vida útil larga', 3, TRUE),
    ('grocery', 'requires_refrigeration', 'false'::jsonb, 'No requiere refrigeración', 4, TRUE),
    ('grocery', 'package_type', '["canned", "packaged", "bulk"]'::jsonb, 'Tipos de empaque disponibles', 5, TRUE),
    ('grocery', 'is_organic', 'false'::jsonb, 'Producto orgánico certificado', 6, TRUE),
    
    -- ========== NO ALIMENTICIO (non_food) ==========
    ('non_food', 'requires_temperature_control', 'false'::jsonb, 'No requiere control de temperatura', 1, TRUE),
    ('non_food', 'is_perishable', 'false'::jsonb, 'No es perecedero', 2, TRUE),
    ('non_food', 'is_fragile', 'false'::jsonb, 'Es frágil y requiere manejo especial', 3, TRUE),
    ('non_food', 'requires_special_packaging', 'false'::jsonb, 'Requiere empaque especial', 4, TRUE),
    ('non_food', 'product_category', '["electronics", "clothing", "household", "personal-care"]'::jsonb, 'Categorías de productos no alimenticios', 5, TRUE)
ON CONFLICT (product_type, attribute_name) DO UPDATE SET
    attribute_value = EXCLUDED.attribute_value,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- 2. CATEGORÍAS GLOBALES DE PRODUCTOS (Jerarquía Completa)
-- ============================================================================

-- ========== CATEGORÍAS PRINCIPALES ==========

-- 1. Entradas y Aperitivos
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
    '00000001-0000-0000-0000-000000000001'::uuid,
    NULL, -- Categoría global
    'Entradas y Aperitivos',
    'Platos para comenzar, aperitivos y botanas',
    NULL,
    '{
        "course_type": "appetizer",
        "serving_size": "small",
        "suggest_with": ["beverage"],
        "typical_prep_time": "5-15",
        "temperature": "hot"
    }'::jsonb,
    1,
    TRUE
) ON CONFLICT (business_id, name) DO UPDATE SET
    attributes = EXCLUDED.attributes,
    description = EXCLUDED.description;

-- 2. Platos Principales
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
    '00000001-0000-0000-0000-000000000002'::uuid,
    NULL,
    'Platos Principales',
    'Platos fuertes y principales del menú',
    NULL,
    '{
        "course_type": "main",
        "serving_size": "large",
        "suggest_with": ["beverage", "dessert", "side"],
        "typical_prep_time": "15-45",
        "temperature": "hot"
    }'::jsonb,
    2,
    TRUE
) ON CONFLICT (business_id, name) DO UPDATE SET
    attributes = EXCLUDED.attributes,
    description = EXCLUDED.description;

-- 3. Acompañamientos
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
    '00000001-0000-0000-0000-000000000003'::uuid,
    NULL,
    'Acompañamientos',
    'Guarniciones y acompañamientos para platos principales',
    NULL,
    '{
        "course_type": "side",
        "serving_size": "medium",
        "suggest_with": ["main"],
        "typical_prep_time": "5-20",
        "temperature": "hot"
    }'::jsonb,
    3,
    TRUE
) ON CONFLICT (business_id, name) DO UPDATE SET
    attributes = EXCLUDED.attributes,
    description = EXCLUDED.description;

-- 4. Bebidas
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
    '00000001-0000-0000-0000-000000000004'::uuid,
    NULL,
    'Bebidas',
    'Bebidas frías, calientes y alcohólicas',
    NULL,
    '{
        "course_type": "beverage",
        "serving_size": "individual",
        "suggest_with": ["food"],
        "temperature": "variable"
    }'::jsonb,
    4,
    TRUE
) ON CONFLICT (business_id, name) DO UPDATE SET
    attributes = EXCLUDED.attributes,
    description = EXCLUDED.description;

-- 5. Postres
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
    '00000001-0000-0000-0000-000000000005'::uuid,
    NULL,
    'Postres',
    'Dulces, postres y golosinas',
    NULL,
    '{
        "course_type": "dessert",
        "serving_size": "small",
        "suggest_with": ["main", "beverage"],
        "typical_prep_time": "0-10",
        "temperature": "variable"
    }'::jsonb,
    5,
    TRUE
) ON CONFLICT (business_id, name) DO UPDATE SET
    attributes = EXCLUDED.attributes,
    description = EXCLUDED.description;

-- 6. Combos y Paquetes
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
    '00000001-0000-0000-0000-000000000006'::uuid,
    NULL,
    'Combos y Paquetes',
    'Combos promocionales y paquetes especiales',
    NULL,
    '{
        "course_type": "combo",
        "serving_size": "variable",
        "is_promotional": true,
        "discount_applicable": true
    }'::jsonb,
    6,
    TRUE
) ON CONFLICT (business_id, name) DO UPDATE SET
    attributes = EXCLUDED.attributes,
    description = EXCLUDED.description;

-- ========== SUBCATEGORÍAS DE BEBIDAS ==========

-- Bebidas Frías
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
    '00000002-0000-0000-0000-000000000001'::uuid,
    NULL,
    'Bebidas Frías',
    'Refrescos, jugos, aguas y bebidas frías',
    '00000001-0000-0000-0000-000000000004'::uuid,
    '{
        "temperature": "cold",
        "serving_type": "individual",
        "suggest_with": ["food"],
        "dietary_options": ["sugar-free", "diet", "natural"],
        "storage": "refrigerated",
        "beverage_type": ["soda", "juice", "water", "iced-tea"]
    }'::jsonb,
    1,
    TRUE
) ON CONFLICT (business_id, name) DO UPDATE SET
    attributes = EXCLUDED.attributes,
    description = EXCLUDED.description;

-- Bebidas Calientes
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
    '00000002-0000-0000-0000-000000000002'::uuid,
    NULL,
    'Bebidas Calientes',
    'Café, té, chocolate y bebidas calientes',
    '00000001-0000-0000-0000-000000000004'::uuid,
    '{
        "temperature": "hot",
        "serving_type": "individual",
        "suggest_with": ["dessert", "breakfast"],
        "caffeine_content": ["none", "low", "medium", "high"],
        "beverage_type": ["coffee", "tea", "hot-chocolate", "herbal"]
    }'::jsonb,
    2,
    TRUE
) ON CONFLICT (business_id, name) DO UPDATE SET
    attributes = EXCLUDED.attributes,
    description = EXCLUDED.description;

-- Bebidas Alcohólicas
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
    '00000002-0000-0000-0000-000000000003'::uuid,
    NULL,
    'Bebidas Alcohólicas',
    'Cerveza, vino, licores y bebidas alcohólicas',
    '00000001-0000-0000-0000-000000000004'::uuid,
    '{
        "temperature": "variable",
        "serving_type": "individual",
        "contains_alcohol": true,
        "age_restriction": 18,
        "requires_id_verification": true,
        "beverage_type": ["beer", "wine", "spirits", "cocktails"]
    }'::jsonb,
    3,
    TRUE
) ON CONFLICT (business_id, name) DO UPDATE SET
    attributes = EXCLUDED.attributes,
    description = EXCLUDED.description;

-- ========== SUBCATEGORÍAS DE PLATOS PRINCIPALES ==========

-- Hamburguesas
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
    '00000002-0000-0000-0000-000000000010'::uuid,
    NULL,
    'Hamburguesas',
    'Hamburguesas clásicas y especiales',
    '00000001-0000-0000-0000-000000000002'::uuid,
    '{
        "protein_type": ["beef", "chicken", "vegetarian", "vegan"],
        "typical_prep_time": "10-20",
        "suggest_with": ["fries", "beverage"],
        "allergen_risk": "high",
        "dietary_options": ["vegetarian", "vegan", "gluten-free"]
    }'::jsonb,
    1,
    TRUE
) ON CONFLICT (business_id, name) DO UPDATE SET
    attributes = EXCLUDED.attributes,
    description = EXCLUDED.description;

-- Pizzas
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
    '00000002-0000-0000-0000-000000000011'::uuid,
    NULL,
    'Pizzas',
    'Pizzas de diferentes tamaños y sabores',
    '00000001-0000-0000-0000-000000000002'::uuid,
    '{
        "size_options": ["personal", "medium", "large", "family"],
        "typical_prep_time": "15-30",
        "suggest_with": ["beverage", "dessert"],
        "allergen_risk": "high",
        "dietary_options": ["vegetarian", "vegan", "gluten-free"]
    }'::jsonb,
    2,
    TRUE
) ON CONFLICT (business_id, name) DO UPDATE SET
    attributes = EXCLUDED.attributes,
    description = EXCLUDED.description;

-- Tacos
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
    '00000002-0000-0000-0000-000000000012'::uuid,
    NULL,
    'Tacos',
    'Tacos tradicionales mexicanos',
    '00000001-0000-0000-0000-000000000002'::uuid,
    '{
        "protein_type": ["beef", "pork", "chicken", "fish", "vegetarian"],
        "typical_prep_time": "5-15",
        "suggest_with": ["salsa", "beverage"],
        "spice_level": ["mild", "medium", "hot"],
        "dietary_options": ["vegetarian", "gluten-free"]
    }'::jsonb,
    3,
    TRUE
) ON CONFLICT (business_id, name) DO UPDATE SET
    attributes = EXCLUDED.attributes,
    description = EXCLUDED.description;

-- Pastas
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
    '00000002-0000-0000-0000-000000000013'::uuid,
    NULL,
    'Pastas',
    'Pastas italianas y especialidades',
    '00000001-0000-0000-0000-000000000002'::uuid,
    '{
        "pasta_type": ["spaghetti", "penne", "fettuccine", "ravioli", "lasagna"],
        "typical_prep_time": "15-25",
        "suggest_with": ["bread", "beverage", "dessert"],
        "allergen_risk": "high",
        "dietary_options": ["vegetarian", "vegan", "gluten-free"]
    }'::jsonb,
    4,
    TRUE
) ON CONFLICT (business_id, name) DO UPDATE SET
    attributes = EXCLUDED.attributes,
    description = EXCLUDED.description;

-- Ensaladas
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
    '00000002-0000-0000-0000-000000000014'::uuid,
    NULL,
    'Ensaladas',
    'Ensaladas frescas y saludables',
    '00000001-0000-0000-0000-000000000002'::uuid,
    '{
        "typical_prep_time": "5-10",
        "suggest_with": ["protein", "beverage"],
        "temperature": "cold",
        "dietary_options": ["vegetarian", "vegan", "gluten-free", "keto"],
        "health_benefits": ["low-calorie", "high-fiber", "vitamin-rich"]
    }'::jsonb,
    5,
    TRUE
) ON CONFLICT (business_id, name) DO UPDATE SET
    attributes = EXCLUDED.attributes,
    description = EXCLUDED.description;

-- ========== SUBCATEGORÍAS DE ACOMPAÑAMIENTOS ==========

-- Papas y Frituras
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
    '00000002-0000-0000-0000-000000000020'::uuid,
    NULL,
    'Papas y Frituras',
    'Papas fritas, aros de cebolla y frituras',
    '00000001-0000-0000-0000-000000000003'::uuid,
    '{
        "size_options": ["small", "medium", "large"],
        "typical_prep_time": "5-10",
        "temperature": "hot",
        "allergen_risk": "medium",
        "dietary_options": ["vegetarian", "vegan"]
    }'::jsonb,
    1,
    TRUE
) ON CONFLICT (business_id, name) DO UPDATE SET
    attributes = EXCLUDED.attributes,
    description = EXCLUDED.description;

-- Arroz y Granos
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
    '00000002-0000-0000-0000-000000000021'::uuid,
    NULL,
    'Arroz y Granos',
    'Arroz, quinoa y otros granos',
    '00000001-0000-0000-0000-000000000003'::uuid,
    '{
        "typical_prep_time": "15-20",
        "temperature": "hot",
        "dietary_options": ["vegetarian", "vegan", "gluten-free"],
        "health_benefits": ["high-fiber", "protein-rich"]
    }'::jsonb,
    2,
    TRUE
) ON CONFLICT (business_id, name) DO UPDATE SET
    attributes = EXCLUDED.attributes,
    description = EXCLUDED.description;

-- Salsas y Aderezos
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
    '00000002-0000-0000-0000-000000000022'::uuid,
    NULL,
    'Salsas y Aderezos',
    'Salsas, aderezos y condimentos',
    '00000001-0000-0000-0000-000000000003'::uuid,
    '{
        "serving_size": "small",
        "spice_level": ["mild", "medium", "hot"],
        "temperature": "variable",
        "dietary_options": ["vegetarian", "vegan", "gluten-free"]
    }'::jsonb,
    3,
    TRUE
) ON CONFLICT (business_id, name) DO UPDATE SET
    attributes = EXCLUDED.attributes,
    description = EXCLUDED.description;

-- ========== SUBCATEGORÍAS DE POSTRES ==========

-- Pasteles
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
    '00000002-0000-0000-0000-000000000030'::uuid,
    NULL,
    'Pasteles',
    'Pasteles y tortas',
    '00000001-0000-0000-0000-000000000005'::uuid,
    '{
        "serving_size": ["slice", "whole"],
        "typical_prep_time": "0",
        "temperature": "variable",
        "allergen_risk": "high",
        "dietary_options": ["vegetarian", "vegan", "gluten-free", "sugar-free"]
    }'::jsonb,
    1,
    TRUE
) ON CONFLICT (business_id, name) DO UPDATE SET
    attributes = EXCLUDED.attributes,
    description = EXCLUDED.description;

-- Helados
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
    '00000002-0000-0000-0000-000000000031'::uuid,
    NULL,
    'Helados',
    'Helados y nieves',
    '00000001-0000-0000-0000-000000000005'::uuid,
    '{
        "size_options": ["cone", "cup", "pint", "gallon"],
        "temperature": "frozen",
        "storage": "frozen",
        "dietary_options": ["vegetarian", "vegan", "sugar-free", "dairy-free"]
    }'::jsonb,
    2,
    TRUE
) ON CONFLICT (business_id, name) DO UPDATE SET
    attributes = EXCLUDED.attributes,
    description = EXCLUDED.description;

-- ========== CATEGORÍAS ESPECIALES ==========

-- Productos de Farmacia - Analgésicos
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
    '00000003-0000-0000-0000-000000000001'::uuid,
    NULL,
    'Analgésicos',
    'Medicamentos para el dolor y fiebre',
    NULL,
    '{
        "product_type": "medicine",
        "requires_prescription": false,
        "age_restriction": null,
        "max_quantity_per_order": 3,
        "storage_requirements": ["room-temperature"],
        "requires_pharmacist_validation": false
    }'::jsonb,
    1,
    TRUE
) ON CONFLICT (business_id, name) DO UPDATE SET
    attributes = EXCLUDED.attributes,
    description = EXCLUDED.description;

-- Productos de Farmacia - Vitaminas
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
    '00000003-0000-0000-0000-000000000002'::uuid,
    NULL,
    'Vitaminas y Suplementos',
    'Vitaminas, minerales y suplementos alimenticios',
    NULL,
    '{
        "product_type": "medicine",
        "requires_prescription": false,
        "age_restriction": null,
        "max_quantity_per_order": 5,
        "storage_requirements": ["room-temperature"],
        "requires_pharmacist_validation": false
    }'::jsonb,
    2,
    TRUE
) ON CONFLICT (business_id, name) DO UPDATE SET
    attributes = EXCLUDED.attributes,
    description = EXCLUDED.description;

-- ============================================================================
-- 3. VERIFICACIÓN Y REPORTE
-- ============================================================================

DO $$
DECLARE
    v_type_attrs_count INTEGER;
    v_categories_count INTEGER;
    v_subcategories_count INTEGER;
BEGIN
    -- Contar atributos de tipos de producto
    SELECT COUNT(*) INTO v_type_attrs_count
    FROM catalog.product_type_attributes
    WHERE is_active = TRUE;
    
    -- Contar categorías principales
    SELECT COUNT(*) INTO v_categories_count
    FROM catalog.product_categories
    WHERE parent_category_id IS NULL
    AND business_id IS NULL;
    
    -- Contar subcategorías
    SELECT COUNT(*) INTO v_subcategories_count
    FROM catalog.product_categories
    WHERE parent_category_id IS NOT NULL
    AND business_id IS NULL;
    
    RAISE NOTICE '✅ Catálogo avanzado creado exitosamente';
    RAISE NOTICE '   - Atributos de tipos de producto: %', v_type_attrs_count;
    RAISE NOTICE '   - Categorías principales: %', v_categories_count;
    RAISE NOTICE '   - Subcategorías: %', v_subcategories_count;
    RAISE NOTICE '';
    RAISE NOTICE '📋 Categorías principales creadas:';
    RAISE NOTICE '   1. Entradas y Aperitivos';
    RAISE NOTICE '   2. Platos Principales';
    RAISE NOTICE '   3. Acompañamientos';
    RAISE NOTICE '   4. Bebidas (con 3 subcategorías)';
    RAISE NOTICE '   5. Postres (con 2 subcategorías)';
    RAISE NOTICE '   6. Combos y Paquetes';
    RAISE NOTICE '';
    RAISE NOTICE '💊 Categorías de farmacia:';
    RAISE NOTICE '   1. Analgésicos';
    RAISE NOTICE '   2. Vitaminas y Suplementos';
END $$;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

