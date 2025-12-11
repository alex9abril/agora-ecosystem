-- ============================================================================
-- Migración: Agregar order_group_id para agrupar órdenes relacionadas
-- ============================================================================
-- Descripción: Agrega un campo para relacionar órdenes creadas en el mismo
--              checkout cuando el carrito contiene productos de múltiples sucursales.
-- Fecha: 2025-12-08
-- ============================================================================

-- Agregar columna order_group_id a la tabla orders.orders
ALTER TABLE orders.orders 
ADD COLUMN IF NOT EXISTS order_group_id UUID;

-- Crear índice para búsquedas eficientes de órdenes agrupadas
CREATE INDEX IF NOT EXISTS idx_orders_order_group_id 
ON orders.orders(order_group_id) 
WHERE order_group_id IS NOT NULL;

-- Agregar comentario descriptivo
COMMENT ON COLUMN orders.orders.order_group_id IS 
  'ID del grupo de órdenes relacionadas creadas en el mismo checkout. NULL si la orden no pertenece a un grupo. Todas las órdenes con el mismo order_group_id fueron creadas simultáneamente y comparten un pago global.';

-- ============================================================================
-- Verificación
-- ============================================================================

-- Verificar que la columna se creó correctamente
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'orders'
  AND table_name = 'orders'
  AND column_name = 'order_group_id';

-- Verificar que el índice se creó correctamente
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'orders'
  AND tablename = 'orders'
  AND indexname = 'idx_orders_order_group_id';

