-- ============================================================================
-- AGORA ECOSYSTEM - Migration: Agregar is_read y read_at a orders.orders
-- ============================================================================
-- Descripción: Agrega columnas para rastrear si un pedido ha sido abierto
--              (leído) por algún operador del negocio en web-local.
--              Permite resaltar visualmente los pedidos nuevos no revisados.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-04-13
-- Hora: 12:00:00
-- ============================================================================

SET search_path TO orders, public;

ALTER TABLE orders.orders
ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

COMMENT ON COLUMN orders.orders.is_read IS 'Indica si el pedido ha sido abierto/leído por algún operador del negocio.';
COMMENT ON COLUMN orders.orders.read_at IS 'Fecha y hora en que el pedido fue leído por primera vez.';

CREATE INDEX IF NOT EXISTS idx_orders_is_read
  ON orders.orders (business_id, is_read) WHERE is_read = false;

-- ============================================================================
-- NOTAS
-- ============================================================================
-- 1. Todo pedido nuevo nace con is_read = false.
-- 2. Al abrir el detalle del pedido en web-local, se marca is_read = true
--    y se registra read_at con la fecha actual.
-- 3. El índice parcial solo indexa pedidos no leídos para optimizar las
--    consultas de la consola de pedidos.
-- ============================================================================
