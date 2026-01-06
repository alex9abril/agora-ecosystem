-- ============================================================================
-- MIGRACIÓN: Agregar información de envío a order_items
-- ============================================================================
-- Descripción: Agrega campos para almacenar la información de la selección
--              del usuario sobre el método de envío (carrier y service)
--              junto con el quotation_id de Skydropx
-- 
-- Fecha: 2026-01-05
-- Versión: 1.0
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- AGREGAR CAMPOS DE INFORMACIÓN DE ENVÍO A order_items
-- ============================================================================

-- Agregar carrier (paquetería)
ALTER TABLE orders.order_items
ADD COLUMN IF NOT EXISTS shipping_carrier VARCHAR(100) NULL;

COMMENT ON COLUMN orders.order_items.shipping_carrier IS 'Nombre de la paquetería seleccionada por el usuario (ej: "FEDEX", "DHL", "ESTAFETA")';

-- Agregar service (tipo de servicio)
ALTER TABLE orders.order_items
ADD COLUMN IF NOT EXISTS shipping_service VARCHAR(255) NULL;

COMMENT ON COLUMN orders.order_items.shipping_service IS 'Tipo de servicio de envío seleccionado por el usuario (ej: "Express Saver", "Standard Overnight")';

-- Crear índice compuesto para búsquedas por información de envío
CREATE INDEX IF NOT EXISTS idx_order_items_shipping_info 
    ON orders.order_items(shipping_carrier, shipping_service) 
    WHERE shipping_carrier IS NOT NULL;

-- ============================================================================
-- NOTAS
-- ============================================================================
-- Estos campos se guardan cuando el usuario selecciona un método de envío
-- durante el checkout. Se usan junto con quotation_id para mostrar la
-- información completa de envío en el detalle de la orden en web-local.
-- ============================================================================

