-- ============================================================================
-- AGORA ECOSYSTEM - Alter: branch_id obligatorio en integration_cart_items
-- ============================================================================
-- Descripción: Endurece la tabla orders.integration_cart_items para exigir
--              branch_id en todas las líneas del carrito de integración.
--              También cambia la FK a ON DELETE RESTRICT.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-03-23
-- Hora: 19:05:00
-- ============================================================================

SET search_path TO orders, core, catalog, public;

-- 1) Validar que no existan filas con branch_id NULL
DO $$
DECLARE
  v_nulls integer;
BEGIN
  SELECT COUNT(*) INTO v_nulls
  FROM orders.integration_cart_items
  WHERE branch_id IS NULL;

  IF v_nulls > 0 THEN
    RAISE EXCEPTION
      'No se puede aplicar NOT NULL en branch_id: existen % filas con branch_id NULL en orders.integration_cart_items',
      v_nulls;
  END IF;
END $$;

-- 2) Reemplazar FK de branch_id para usar ON DELETE RESTRICT
ALTER TABLE orders.integration_cart_items
  DROP CONSTRAINT IF EXISTS integration_cart_items_branch_id_fkey;

ALTER TABLE orders.integration_cart_items
  ADD CONSTRAINT integration_cart_items_branch_id_fkey
  FOREIGN KEY (branch_id)
  REFERENCES core.businesses(id)
  ON DELETE RESTRICT;

-- 3) Enforzar NOT NULL
ALTER TABLE orders.integration_cart_items
  ALTER COLUMN branch_id SET NOT NULL;

-- 4) Verificación rápida
SELECT
  (SELECT is_nullable
   FROM information_schema.columns
   WHERE table_schema = 'orders'
     AND table_name = 'integration_cart_items'
     AND column_name = 'branch_id') AS branch_id_is_nullable,
  (SELECT confdeltype
   FROM pg_constraint
   WHERE conname = 'integration_cart_items_branch_id_fkey') AS fk_on_delete;

-- ============================================================================
-- NOTAS
-- ============================================================================
-- - confdeltype = 'r' => ON DELETE RESTRICT.
-- - Si falla por filas NULL, primero corrige/borra esas líneas antiguas.
-- ============================================================================
