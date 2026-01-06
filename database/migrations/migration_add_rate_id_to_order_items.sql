-- ============================================================================
-- MIGRACIÓN: Agregar rate_id a orders.order_items
-- ============================================================================
-- Descripción: Agrega una columna para almacenar el ID del rate de Skydropx
--              seleccionado por el usuario, necesario para crear el shipment.
--
-- Fecha: 2025-01-XX
-- Versión: 1.0
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- Agregar columna rate_id a orders.order_items
ALTER TABLE orders.order_items
ADD COLUMN IF NOT EXISTS rate_id VARCHAR(255);

COMMENT ON COLUMN orders.order_items.rate_id IS 'ID del rate de Skydropx seleccionado para crear el shipment (obtenido de la respuesta de quotations)';

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_order_items_rate_id
    ON orders.order_items(rate_id)
    WHERE rate_id IS NOT NULL;

-- ============================================================================
-- NOTAS
-- ============================================================================
-- El rate_id es el ID del rate específico dentro de una cotización de Skydropx.
-- Este ID se obtiene de la respuesta de /quotations y se usa para crear el shipment.
-- ============================================================================

