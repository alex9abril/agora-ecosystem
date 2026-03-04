-- ============================================================================
-- AGORA ECOSYSTEM - Migration: Agregar store_id a orders.orders
-- ============================================================================
-- Descripción: Agrega la columna store_id (FK a core.stores) para guardar el
--              canal de venta desde el que se realizó el pedido. store_context
--              se mantiene para compatibilidad y construcción de URL en correos.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-02-24
-- Hora: 12:00:00
-- ============================================================================

SET search_path TO orders, core, public;

ALTER TABLE orders.orders
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES core.stores(id) ON DELETE SET NULL;

COMMENT ON COLUMN orders.orders.store_id IS 'Canal de venta (tienda) desde el que se realizó el pedido. store_context conserva la ruta para el enlace en correo.';

CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders.orders(store_id) WHERE store_id IS NOT NULL;

-- ============================================================================
-- NOTAS
-- ============================================================================
-- 1. Ejecutar después de migration_stores.sql
-- 2. En checkout: guardar store_id (por storeId en DTO o resolviendo desde storeContext)
-- ============================================================================
