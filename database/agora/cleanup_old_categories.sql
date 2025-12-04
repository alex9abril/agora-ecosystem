-- ============================================================================
-- AGORA ECOSYSTEM - Limpieza de Categorías Antiguas (OPCIONAL)
-- ============================================================================
-- Descripción: Script opcional para eliminar categorías antiguas antes de 
--              insertar el nuevo catálogo de refacciones
-- 
-- ⚠️ ADVERTENCIA: Este script eliminará todas las categorías globales existentes
--              (donde business_id IS NULL). Úsalo solo si quieres empezar desde cero.
-- 
-- Uso: Ejecutar ANTES de seed_refacciones_catalog.sql si quieres limpiar datos antiguos
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2025-12-02
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- VERIFICAR CATEGORÍAS EXISTENTES
-- ============================================================================

-- Mostrar categorías globales existentes antes de eliminar
SELECT 
    id,
    name,
    parent_category_id,
    display_order,
    is_active,
    created_at
FROM catalog.product_categories
WHERE business_id IS NULL
ORDER BY display_order, name;

-- ============================================================================
-- ELIMINAR CATEGORÍAS GLOBALES EXISTENTES
-- ============================================================================
-- ⚠️ ADVERTENCIA: Esto eliminará TODAS las categorías globales
-- Las categorías asociadas a negocios específicos NO se eliminarán

-- Paso 1: Eliminar subcategorías (nivel 3) primero (por foreign key)
DELETE FROM catalog.product_categories
WHERE business_id IS NULL
  AND parent_category_id IS NOT NULL
  AND parent_category_id IN (
      SELECT id FROM catalog.product_categories 
      WHERE business_id IS NULL AND parent_category_id IS NOT NULL
  );

-- Paso 2: Eliminar categorías de nivel 2
DELETE FROM catalog.product_categories
WHERE business_id IS NULL
  AND parent_category_id IS NOT NULL;

-- Paso 3: Eliminar categorías principales (nivel 1)
DELETE FROM catalog.product_categories
WHERE business_id IS NULL
  AND parent_category_id IS NULL;

-- ============================================================================
-- VERIFICAR ELIMINACIÓN
-- ============================================================================

-- Verificar que no queden categorías globales
SELECT 
    COUNT(*) as categorias_globales_restantes
FROM catalog.product_categories
WHERE business_id IS NULL;

-- Si el resultado es 0, la limpieza fue exitosa

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================

-- 1. Este script NO elimina productos asociados a las categorías
--    Los productos quedarán con category_id = NULL o apuntando a categorías eliminadas
--    Considera actualizar los productos después de ejecutar este script

-- 2. Este script NO elimina categorías asociadas a negocios específicos
--    Solo elimina categorías globales (business_id IS NULL)

-- 3. Si tienes productos asociados a categorías globales que vas a eliminar,
--    considera ejecutar esto ANTES de la limpieza:
--    UPDATE catalog.products SET category_id = NULL WHERE category_id IN (
--        SELECT id FROM catalog.product_categories WHERE business_id IS NULL
--    );

-- ============================================================================
-- FIN DEL SCRIPT DE LIMPIEZA
-- ============================================================================

