-- ============================================================================
-- AGORA ECOSYSTEM - Create: orders.order_views tracking table
-- ============================================================================
-- Descripción: Crea la tabla orders.order_views para rastrear qué usuarios
-- han visto cada pedido. Permite resaltar pedidos no leídos en web-local,
-- similar al comportamiento de correos no leídos en un cliente de email.
-- Cada usuario tiene su propio estado de lectura por pedido.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-04-13
-- Hora: 12:00:00
-- ============================================================================

SET search_path TO orders, public;

-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS orders.order_views (
    order_id   UUID NOT NULL REFERENCES orders.orders(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    viewed_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (order_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_order_views_user_id ON orders.order_views(user_id);

-- ============================================================================
-- NOTAS
-- ============================================================================
-- 1. PK compuesta (order_id, user_id): un solo registro por usuario por pedido.
-- 2. ON DELETE CASCADE en ambas FK: si se elimina el pedido o el usuario,
--    se limpian automáticamente los registros de vistas.
-- 3. Índice en user_id: optimiza el LEFT JOIN al listar pedidos por negocio
--    filtrando por el usuario autenticado.
-- 4. El frontend usa INSERT ... ON CONFLICT DO NOTHING para marcar como visto
--    de forma idempotente (llamar múltiples veces no genera duplicados).
