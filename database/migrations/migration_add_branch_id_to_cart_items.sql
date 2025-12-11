-- ============================================================================
-- MIGRACIÓN: Agregar branch_id a shopping_cart_items
-- ============================================================================
-- Esta migración agrega el campo branch_id a la tabla shopping_cart_items
-- para poder guardar la sucursal desde donde se está comprando cada producto.
-- Esto permite agrupar productos por tienda/sucursal en el carrito.

-- Agregar columna branch_id
ALTER TABLE orders.shopping_cart_items
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES core.businesses(id) ON DELETE SET NULL;

-- Crear índice para mejorar consultas
CREATE INDEX IF NOT EXISTS idx_shopping_cart_items_branch_id ON orders.shopping_cart_items(branch_id);

-- Actualizar el constraint UNIQUE para incluir branch_id
-- Esto permite que el mismo producto de diferentes sucursales se trate como items diferentes
ALTER TABLE orders.shopping_cart_items
DROP CONSTRAINT IF EXISTS shopping_cart_items_unique;

ALTER TABLE orders.shopping_cart_items
ADD CONSTRAINT shopping_cart_items_unique UNIQUE(
  cart_id, 
  product_id, 
  variant_selections, 
  special_instructions_normalized,
  branch_id
);

-- Comentario
COMMENT ON COLUMN orders.shopping_cart_items.branch_id IS 'ID de la sucursal desde donde se está comprando este producto. NULL = precio global del producto.';

