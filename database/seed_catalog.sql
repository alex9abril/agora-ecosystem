-- ============================================================================
-- DELIVERY ECOSYSTEM - Seed Data: Catálogo
-- ============================================================================
-- Descripción: Datos de ejemplo para catálogo (categorías, productos, colecciones)
-- 
-- Uso: Ejecutar después de schema.sql para poblar datos de catálogo
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2024-11-18
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- DATOS DE EJEMPLO: CATÁLOGO
-- ============================================================================

-- Nota: Este script asume que ya existen usuarios y negocios en la base de datos
-- Para un ejemplo completo, usar seed_delivery_cycle.sql que incluye todo

-- Ejemplo: Insertar categorías globales
INSERT INTO catalog.product_categories (id, business_id, name, description, display_order, is_active)
VALUES
    ('00000000-0000-0000-0000-000000000001', NULL, 'Entradas', 'Platos para comenzar', 1, TRUE),
    ('00000000-0000-0000-0000-000000000002', NULL, 'Platos Principales', 'Platos fuertes y principales', 2, TRUE),
    ('00000000-0000-0000-0000-000000000003', NULL, 'Bebidas', 'Bebidas frías y calientes', 3, TRUE),
    ('00000000-0000-0000-0000-000000000004', NULL, 'Postres', 'Dulces y postres', 4, TRUE),
    ('00000000-0000-0000-0000-000000000005', NULL, 'Especialidades', 'Platos especiales de la casa', 5, TRUE)
ON CONFLICT DO NOTHING;

-- Ejemplo: Insertar subcategorías (bebidas frías bajo bebidas)
INSERT INTO catalog.product_categories (id, business_id, name, description, parent_category_id, display_order, is_active)
VALUES
    ('00000000-0000-0000-0000-000000000010', NULL, 'Bebidas Frías', 'Refrescos, jugos, aguas', 
     '00000000-0000-0000-0000-000000000003', 1, TRUE),
    ('00000000-0000-0000-0000-000000000011', NULL, 'Bebidas Calientes', 'Café, té, chocolate', 
     '00000000-0000-0000-0000-000000000003', 2, TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- NOTA: Los productos y colecciones se insertan en seed_delivery_cycle.sql
-- junto con el negocio correspondiente para mantener la integridad referencial
-- ============================================================================

-- Ejemplo de estructura para productos (comentado, se usa en seed_delivery_cycle.sql):
/*
INSERT INTO catalog.products (
    id, business_id, name, description, price, category_id, 
    is_available, is_featured, display_order
) VALUES (
    'product-uuid-here',
    'business-uuid-here',
    'Nombre del Producto',
    'Descripción del producto',
    150.00,
    'category-uuid-here',
    TRUE,
    FALSE,
    1
);
*/

-- Ejemplo de estructura para colecciones (comentado, se usa en seed_delivery_cycle.sql):
/*
INSERT INTO catalog.collections (
    id, business_id, name, description, type, price, original_price,
    is_available, is_featured, display_order
) VALUES (
    'collection-uuid-here',
    'business-uuid-here',
    'Combo Familiar',
    'Combo especial para toda la familia',
    'combo',
    250.00,
    320.00,
    TRUE,
    TRUE,
    1
);
*/

-- ============================================================================
-- FIN DEL SCRIPT DE CATÁLOGO
-- ============================================================================

