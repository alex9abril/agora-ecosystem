-- ============================================================================
-- MIGRACIÓN: Costos de instalación por sucursal + snapshot en carrito/pedidos
-- ============================================================================
-- Objetivo:
-- - Permitir configurar un costo de instalación por producto y sucursal.
-- - Persistir en carrito y en order_items si se seleccionó instalación y si es forzada.
-- - Mantener scripts idempotentes (IF NOT EXISTS / DO $$).
--
-- Fecha: 2026-05-26
-- ============================================================================

-- ============================================================================
-- 1) Configuración por sucursal: catalog.product_branch_availability
-- ============================================================================

ALTER TABLE catalog.product_branch_availability
  ADD COLUMN IF NOT EXISTS installation_cost DECIMAL(10,2)
    CHECK (installation_cost IS NULL OR installation_cost >= 0),
  ADD COLUMN IF NOT EXISTS installation_forced BOOLEAN DEFAULT FALSE;

-- Si por algún motivo quedó "forced" sin costo, normalizarlo.
UPDATE catalog.product_branch_availability
SET installation_forced = FALSE
WHERE installation_forced = TRUE AND installation_cost IS NULL;

COMMENT ON COLUMN catalog.product_branch_availability.installation_cost IS
  'Costo de instalación por unidad en esta sucursal. NULL = no ofrece instalación.';
COMMENT ON COLUMN catalog.product_branch_availability.installation_forced IS
  'Si TRUE, la instalación se considera forzada cuando el producto se compra desde esta sucursal.';

-- ============================================================================
-- 2) Snapshot en carrito: orders.shopping_cart_items
-- ============================================================================

ALTER TABLE orders.shopping_cart_items
  ADD COLUMN IF NOT EXISTS installation_selected BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS installation_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00
    CHECK (installation_cost >= 0),
  ADD COLUMN IF NOT EXISTS installation_forced BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN orders.shopping_cart_items.installation_selected IS
  'Si TRUE, este item incluye instalación (snapshot al momento de agregar).';
COMMENT ON COLUMN orders.shopping_cart_items.installation_cost IS
  'Costo de instalación por unidad (snapshot). 0 cuando no aplica.';
COMMENT ON COLUMN orders.shopping_cart_items.installation_forced IS
  'Si TRUE, la instalación fue forzada por configuración de la sucursal (snapshot).';

-- Actualizar constraint UNIQUE para que el mismo producto pueda existir con/sin instalación
-- y para evitar mezclar costos si cambian entre adiciones.
ALTER TABLE orders.shopping_cart_items
  DROP CONSTRAINT IF EXISTS shopping_cart_items_unique;

ALTER TABLE orders.shopping_cart_items
  ADD CONSTRAINT shopping_cart_items_unique UNIQUE(
    cart_id,
    product_id,
    variant_selections,
    special_instructions_normalized,
    branch_id,
    installation_selected,
    installation_cost
  );

-- ============================================================================
-- 3) Snapshot en pedidos: orders.order_items
-- ============================================================================

ALTER TABLE orders.order_items
  ADD COLUMN IF NOT EXISTS installation_selected BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS installation_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00
    CHECK (installation_cost >= 0),
  ADD COLUMN IF NOT EXISTS installation_forced BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN orders.order_items.installation_selected IS
  'Si TRUE, el item incluye instalación (snapshot).';
COMMENT ON COLUMN orders.order_items.installation_cost IS
  'Costo de instalación por unidad (snapshot). 0 cuando no aplica.';
COMMENT ON COLUMN orders.order_items.installation_forced IS
  'Si TRUE, la instalación fue forzada por configuración de la sucursal (snapshot).';

-- ============================================================================
-- 4) (Opcional) Paridad para carrito de integración: orders.integration_cart_items
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'orders' AND table_name = 'integration_cart_items'
  ) THEN
    ALTER TABLE orders.integration_cart_items
      ADD COLUMN IF NOT EXISTS installation_selected BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS installation_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00
        CHECK (installation_cost >= 0),
      ADD COLUMN IF NOT EXISTS installation_forced BOOLEAN NOT NULL DEFAULT FALSE;

    ALTER TABLE orders.integration_cart_items
      DROP CONSTRAINT IF EXISTS integration_cart_items_unique;

    ALTER TABLE orders.integration_cart_items
      ADD CONSTRAINT integration_cart_items_unique UNIQUE(
        cart_id,
        product_id,
        variant_selections,
        special_instructions_normalized,
        branch_id,
        installation_selected,
        installation_cost
      );
  END IF;
END $$;

-- ============================================================================
-- FIN
-- ============================================================================
