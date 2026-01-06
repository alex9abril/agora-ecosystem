-- ============================================================================
-- MIGRACIÓN: Agregar quotation_id a order_items
-- ============================================================================
-- Descripción: Agrega el campo quotation_id para almacenar el ID de cotización
--              de Skydropx en cada item de la orden
-- 
-- Fecha: 2025-01-XX
-- Versión: 1.0
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- AGREGAR CAMPO quotation_id A order_items
-- ============================================================================

ALTER TABLE orders.order_items
ADD COLUMN IF NOT EXISTS quotation_id VARCHAR(255) NULL;

COMMENT ON COLUMN orders.order_items.quotation_id IS 'ID de cotización de Skydropx para este item. Se usa para crear el envío real cuando se surte el pedido.';

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_order_items_quotation_id 
    ON orders.order_items(quotation_id) 
    WHERE quotation_id IS NOT NULL;

-- ============================================================================
-- NOTAS
-- ============================================================================
-- El quotation_id se guarda cuando el usuario selecciona un método de envío
-- durante el checkout. Este ID se usará posteriormente para crear el envío
-- real cuando se surta el pedido desde web-admin.
-- ============================================================================

