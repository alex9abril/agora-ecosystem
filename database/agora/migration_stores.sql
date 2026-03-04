-- ============================================================================
-- AGORA ECOSYSTEM - Migration: Tabla core.stores (canales de venta)
-- ============================================================================
-- Descripción: Crea la tabla core.stores para representar cada "tienda" como
--              canal de venta (global, grupo, sucursal, grupo+marca, global+marca).
--              Permite referenciar desde pedidos el canal desde el que se realizó
--              la venta, manteniendo fulfillment siempre en la sucursal.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-02-24
-- Hora: 12:00:00
-- ============================================================================

SET search_path TO core, catalog, orders, public;

-- ----------------------------------------------------------------------------
-- ENUM: store_type (opcional; usamos TEXT con CHECK para flexibilidad)
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- TABLA: core.stores
-- ----------------------------------------------------------------------------
-- Una fila por canal de venta. Reglas por tipo:
--   global: business_group_id, business_id, vehicle_brand_id NULL
--   group:  business_group_id NOT NULL, business_id y vehicle_brand_id NULL
--   branch: business_id NOT NULL
--   group_brand: business_group_id y vehicle_brand_id NOT NULL, business_id NULL
--   global_brand: vehicle_brand_id NOT NULL, business_group_id y business_id NULL
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS core.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL CHECK (type IN ('global', 'group', 'branch', 'group_brand', 'global_brand')),
    business_group_id UUID REFERENCES core.business_groups(id) ON DELETE CASCADE,
    business_id UUID REFERENCES core.businesses(id) ON DELETE CASCADE,
    vehicle_brand_id UUID REFERENCES catalog.vehicle_brands(id) ON DELETE CASCADE,
    slug VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT stores_global_check CHECK (
        (type = 'global' AND business_group_id IS NULL AND business_id IS NULL AND vehicle_brand_id IS NULL) OR
        (type = 'group' AND business_group_id IS NOT NULL AND business_id IS NULL AND vehicle_brand_id IS NULL) OR
        (type = 'branch' AND business_id IS NOT NULL) OR
        (type = 'group_brand' AND business_group_id IS NOT NULL AND business_id IS NULL AND vehicle_brand_id IS NOT NULL) OR
        (type = 'global_brand' AND business_group_id IS NULL AND business_id IS NULL AND vehicle_brand_id IS NOT NULL)
    )
);

COMMENT ON TABLE core.stores IS 'Canales de venta (tiendas): global, por grupo, por sucursal, por grupo+marca, por marca global. El pedido guarda store_id para atribución; fulfillment sigue en orders.business_id.';
COMMENT ON COLUMN core.stores.type IS 'Tipo de tienda: global, group, branch, group_brand, global_brand.';
COMMENT ON COLUMN core.stores.slug IS 'Path corto para URL (ej: grupo/grupo-andrade, sucursal/toyota-satelite, brand/nissan).';
COMMENT ON COLUMN core.stores.name IS 'Nombre para mostrar.';
COMMENT ON COLUMN core.stores.settings IS 'Configuración adicional (margen, visibilidad, etc.).';

-- Índices
CREATE INDEX IF NOT EXISTS idx_stores_type ON core.stores(type);
CREATE INDEX IF NOT EXISTS idx_stores_business_group_id ON core.stores(business_group_id) WHERE business_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stores_business_id ON core.stores(business_id) WHERE business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stores_vehicle_brand_id ON core.stores(vehicle_brand_id) WHERE vehicle_brand_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stores_slug ON core.stores(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stores_is_active ON core.stores(is_active) WHERE is_active = TRUE;

-- Unicidad por tipo
CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_one_global ON core.stores ((true)) WHERE type = 'global';
CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_unique_group ON core.stores (business_group_id) WHERE type = 'group';
CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_unique_branch ON core.stores (business_id) WHERE type = 'branch';
CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_unique_group_brand ON core.stores (business_group_id, vehicle_brand_id) WHERE type = 'group_brand';
CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_unique_global_brand ON core.stores (vehicle_brand_id) WHERE type = 'global_brand';

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_stores_updated_at ON core.stores;
CREATE TRIGGER update_stores_updated_at
    BEFORE UPDATE ON core.stores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- NOTAS
-- ============================================================================
-- 1. Poblado inicial: ejecutar seed_stores_from_groups_branches_brands.sql
-- 2. Sincronización: al crear/actualizar grupo o sucursal, crear o actualizar fila en core.stores (backend o trigger).
-- 3. orders.store_id se agrega en migration_orders_store_id.sql
-- ============================================================================
