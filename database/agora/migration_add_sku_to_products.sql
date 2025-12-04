-- ============================================================================
-- AGORA ECOSYSTEM - Migración: Agregar campo SKU a productos
-- ============================================================================
-- Descripción: Agrega el campo SKU (Stock Keeping Unit) a la tabla de productos
--              para permitir la identificación única de productos mediante código.
-- 
-- Casos de uso:
-- - Identificación única de productos por código SKU
-- - Búsqueda de productos por SKU
-- - Integración con sistemas de inventario
-- 
-- Uso: Ejecutar después de los scripts base de catalog
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2025-12-02
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- AGREGAR CAMPO SKU A LA TABLA PRODUCTOS
-- ============================================================================

-- Agregar columna SKU (opcional, puede ser NULL para productos existentes)
ALTER TABLE catalog.products
ADD COLUMN IF NOT EXISTS sku VARCHAR(100);

-- Crear índice único para SKU por negocio (un SKU puede repetirse en diferentes negocios)
-- Pero debe ser único dentro del mismo negocio
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_business_sku 
    ON catalog.products(business_id, sku) 
    WHERE sku IS NOT NULL;

-- Crear índice para búsquedas rápidas por SKU
CREATE INDEX IF NOT EXISTS idx_products_sku 
    ON catalog.products(sku) 
    WHERE sku IS NOT NULL;

-- Comentarios
COMMENT ON COLUMN catalog.products.sku IS 
    'SKU (Stock Keeping Unit) - Código único de identificación del producto dentro del negocio. Opcional pero recomendado para gestión de inventario.';

-- ============================================================================
-- NOTAS DE USO
-- ============================================================================
-- 
-- 1. El SKU es opcional (puede ser NULL)
-- 2. El SKU debe ser único por negocio (no puede haber dos productos con el mismo SKU en el mismo negocio)
-- 3. Diferentes negocios pueden tener productos con el mismo SKU
-- 4. Para búsquedas por SKU:
--    SELECT * FROM catalog.products WHERE business_id = $1 AND sku = $2;
-- 
-- ============================================================================

