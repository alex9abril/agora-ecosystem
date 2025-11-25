-- ============================================================================
-- CATÁLOGO DE CATEGORÍAS DE NEGOCIOS
-- ============================================================================
-- Descripción: Catálogo normalizado de categorías de negocios
-- 
-- Uso: Ejecutar después de schema.sql para crear el catálogo
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2024-11-18
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- CREAR TABLA DE CATÁLOGO DE CATEGORÍAS DE NEGOCIOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS core.business_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Información de la categoría
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon_url TEXT,
    
    -- Orden de visualización
    display_order INTEGER DEFAULT 0,
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_business_categories_is_active ON core.business_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_business_categories_display_order ON core.business_categories(display_order);

-- ============================================================================
-- INSERTAR CATEGORÍAS PREDEFINIDAS (DEBE IR ANTES DE LA MIGRACIÓN)
-- ============================================================================

INSERT INTO core.business_categories (name, description, display_order, is_active) VALUES
    ('Restaurante', 'Restaurantes con menú completo', 1, TRUE),
    ('Cafetería', 'Cafeterías y lugares de café', 2, TRUE),
    ('Pizzería', 'Pizzerías y comida italiana', 3, TRUE),
    ('Taquería', 'Taquerías y comida mexicana tradicional', 4, TRUE),
    ('Panadería', 'Panaderías y pastelerías', 5, TRUE),
    ('Heladería', 'Heladerías y postrerías', 6, TRUE),
    ('Comida Rápida', 'Restaurantes de comida rápida', 7, TRUE),
    ('Asiático', 'Restaurantes de comida asiática (sushi, thai, chino, etc.)', 8, TRUE),
    ('Saludable/Vegano', 'Restaurantes saludables, veganos y vegetarianos', 9, TRUE),
    ('Pollería', 'Pollerías y rosticerías', 10, TRUE),
    ('Sandwich Shop', 'Tiendas de sandwiches y delis', 11, TRUE),
    ('Repostería', 'Repostería fina y pastelerías gourmet', 12, TRUE),
    ('Otro', 'Otras categorías de negocios', 13, TRUE)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- MIGRAR TABLA BUSINESSES PARA AGREGAR RELACIÓN CON CATÁLOGO
-- ============================================================================

-- Paso 1: Agregar columna category_id como FK opcional (mantiene compatibilidad)
-- Esta columna almacena la relación normalizada con el catálogo
ALTER TABLE core.businesses 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES core.business_categories(id) ON DELETE SET NULL;

-- Paso 2: Crear índice para la nueva FK (mejora el rendimiento de las consultas)
CREATE INDEX IF NOT EXISTS idx_businesses_category_id ON core.businesses(category_id);

-- Paso 3: Migrar datos existentes: actualizar category_id basado en el nombre de category
-- Esto asume que los nombres en businesses.category coinciden con business_categories.name
-- Solo actualiza los registros que aún no tienen category_id asignado
UPDATE core.businesses b
SET category_id = bc.id
FROM core.business_categories bc
WHERE b.category = bc.name
  AND b.category_id IS NULL;

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================

-- Por ahora mantenemos ambas columnas:
-- - category (VARCHAR): Mantiene compatibilidad con código existente
-- - category_id (UUID FK): Relación normalizada recomendada

-- En el futuro, cuando todos los negocios tengan category_id:
-- 1. Asegúrate de que todos los businesses tengan category_id:
--    UPDATE core.businesses SET category_id = (SELECT id FROM core.business_categories WHERE name = category) WHERE category_id IS NULL;
--
-- 2. Hacer category_id obligatorio:
--    ALTER TABLE core.businesses ALTER COLUMN category_id SET NOT NULL;
--
-- 3. (Opcional) Eliminar la columna category si ya no se necesita:
--    ALTER TABLE core.businesses DROP COLUMN category;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

