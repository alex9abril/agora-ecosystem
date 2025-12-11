-- ============================================================================
-- MIGRACIÓN: Agregar campo original_quantity a orders.order_items
-- ============================================================================
-- Descripción: Agrega un campo para rastrear la cantidad original solicitada
--              vs la cantidad surtida, permitiendo mostrar ambas cantidades
-- 
-- Fecha: 2025-01-XX
-- Versión: 1.0
-- ============================================================================

-- Agregar columna original_quantity
ALTER TABLE orders.order_items
ADD COLUMN IF NOT EXISTS original_quantity INTEGER;

-- Si la columna es nueva, inicializar con el valor actual de quantity
UPDATE orders.order_items
SET original_quantity = quantity
WHERE original_quantity IS NULL;

-- Agregar constraint para que original_quantity sea NOT NULL después de la migración
-- (permitimos NULL temporalmente para datos existentes)
ALTER TABLE orders.order_items
ALTER COLUMN original_quantity SET DEFAULT NULL;

-- Comentario
COMMENT ON COLUMN orders.order_items.original_quantity IS 
    'Cantidad original solicitada en el pedido. Se mantiene para comparar con quantity (cantidad surtida)';

-- ============================================================================
-- ACTUALIZAR TRIGGER O FUNCIÓN DE CHECKOUT PARA GUARDAR original_quantity
-- ============================================================================
-- Nota: El trigger/función de checkout deberá actualizarse para establecer
--       original_quantity = quantity cuando se crea el pedido

