-- ============================================================================
-- AGORA ECOSYSTEM - Carrito de integración (sin auth.users)
-- ============================================================================
-- Descripción: Tablas orders.integration_carts e integration_cart_items para
--              WhatsApp, bots y servicios externos. Cada carrito está ligado a
--              core.stores (canal de venta). No sustituye orders.shopping_cart.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-03-19
-- Hora: 20:00:00
-- ============================================================================

SET search_path TO orders, core, catalog, public;

-- ----------------------------------------------------------------------------
-- Tabla: integration_carts
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS orders.integration_carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES core.stores(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_integration_carts_store_id ON orders.integration_carts(store_id);
CREATE INDEX IF NOT EXISTS idx_integration_carts_expires_at ON orders.integration_carts(expires_at);

COMMENT ON TABLE orders.integration_carts IS 'Carrito para integraciones (sin usuario Supabase). Un carrito por sesión de compra; store_id fija el canal de validación.';
COMMENT ON COLUMN orders.integration_carts.store_id IS 'Canal de venta (core.stores); el backend valida productos contra este contexto.';

-- ----------------------------------------------------------------------------
-- Tabla: integration_cart_items
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS orders.integration_cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES orders.integration_carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
    variant_selections JSONB DEFAULT '{}'::jsonb,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    variant_price_adjustment DECIMAL(10,2) DEFAULT 0.00 CHECK (variant_price_adjustment >= -999999.99),
    item_subtotal DECIMAL(10,2) NOT NULL CHECK (item_subtotal >= 0),
    special_instructions TEXT,
    special_instructions_normalized TEXT GENERATED ALWAYS AS (COALESCE(special_instructions, '')) STORED,
    branch_id UUID REFERENCES core.businesses(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT integration_cart_items_unique UNIQUE(
        cart_id,
        product_id,
        variant_selections,
        special_instructions_normalized,
        branch_id
    )
);

CREATE INDEX IF NOT EXISTS idx_integration_cart_items_cart_id ON orders.integration_cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_integration_cart_items_product_id ON orders.integration_cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_integration_cart_items_branch_id ON orders.integration_cart_items(branch_id);
CREATE INDEX IF NOT EXISTS idx_integration_cart_items_variant_selections ON orders.integration_cart_items USING GIN(variant_selections);

COMMENT ON TABLE orders.integration_cart_items IS 'Líneas del carrito de integración; misma semántica que shopping_cart_items (snapshot de precio, branch_id opcional).';

-- ----------------------------------------------------------------------------
-- Triggers updated_at (reutiliza funciones existentes en orders)
-- ----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trigger_update_integration_carts_updated_at ON orders.integration_carts;
CREATE TRIGGER trigger_update_integration_carts_updated_at
    BEFORE UPDATE ON orders.integration_carts
    FOR EACH ROW
    EXECUTE FUNCTION orders.update_shopping_cart_updated_at();

DROP TRIGGER IF EXISTS trigger_update_integration_cart_items_updated_at ON orders.integration_cart_items;
CREATE TRIGGER trigger_update_integration_cart_items_updated_at
    BEFORE UPDATE ON orders.integration_cart_items
    FOR EACH ROW
    EXECUTE FUNCTION orders.update_shopping_cart_items_updated_at();

-- ============================================================================
-- NOTAS
-- ============================================================================
-- 1. Ejecutar después de core.stores y catalog.products.
-- 2. La autorización de la API es por webhook secret (provider integration_cart),
--    no por RLS en estas tablas; el backend usa pool con rol con permisos INSERT/SELECT/DELETE.
-- ============================================================================
