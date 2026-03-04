-- ============================================================================
-- AGORA ECOSYSTEM - Migration: user_fulfillment_scope y assigned_fulfiller_user_id
-- ============================================================================
-- Descripción: Crea core.user_fulfillment_scope para surtidores sin tienda
--              (distribuidores que solo surten pedidos asignados) y añade
--              orders.orders.assigned_fulfiller_user_id para asignar un pedido
--              a un surtidor. Cumple convenciones: core/orders, snake_case,
--              created_at/updated_at, triggers.
--
-- Ejecución condicional: solo crea/alterea si existen las tablas dependientes
-- (core.business_groups, core.businesses, orders.orders). No falla si faltan.
-- ============================================================================
-- Versión: 1.1
-- Fecha: 2026-03-02
-- Hora: 19:00:00
-- ============================================================================

SET search_path TO core, orders, public;

-- Función updated_at (requerida por el trigger); idempotente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- TABLA: core.user_fulfillment_scope (solo si existen core.business_groups y core.businesses)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'core' AND table_name = 'business_groups')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'core' AND table_name = 'businesses') THEN
        CREATE TABLE IF NOT EXISTS core.user_fulfillment_scope (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            business_group_id UUID REFERENCES core.business_groups(id) ON DELETE CASCADE,
            business_id UUID REFERENCES core.businesses(id) ON DELETE CASCADE,
            can_fulfill BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT user_fulfillment_scope_scope_check
                CHECK (business_id IS NOT NULL OR business_group_id IS NOT NULL)
        );
        COMMENT ON TABLE core.user_fulfillment_scope IS 'Usuarios que pueden surtir pedidos sin tener tienda (distribuidor sin tienda). Scope por business o por business_group.';
        COMMENT ON COLUMN core.user_fulfillment_scope.user_id IS 'Usuario que puede surtir (auth.users).';
        COMMENT ON COLUMN core.user_fulfillment_scope.business_group_id IS 'Si no es NULL, puede surtir pedidos de cualquier negocio del grupo.';
        COMMENT ON COLUMN core.user_fulfillment_scope.business_id IS 'Si no es NULL, puede surtir pedidos de este negocio.';
        COMMENT ON COLUMN core.user_fulfillment_scope.can_fulfill IS 'Habilita la capacidad de surtir en este scope.';
        CREATE INDEX IF NOT EXISTS idx_user_fulfillment_scope_user_id ON core.user_fulfillment_scope(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_fulfillment_scope_business_id ON core.user_fulfillment_scope(business_id) WHERE business_id IS NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_user_fulfillment_scope_business_group_id ON core.user_fulfillment_scope(business_group_id) WHERE business_group_id IS NOT NULL;
        DROP TRIGGER IF EXISTS update_user_fulfillment_scope_updated_at ON core.user_fulfillment_scope;
        CREATE TRIGGER update_user_fulfillment_scope_updated_at
            BEFORE UPDATE ON core.user_fulfillment_scope
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        GRANT SELECT, INSERT, UPDATE, DELETE ON core.user_fulfillment_scope TO authenticated;
        GRANT SELECT, INSERT, UPDATE, DELETE ON core.user_fulfillment_scope TO service_role;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- COLUMNA: orders.orders.assigned_fulfiller_user_id (solo si existe orders.orders)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'orders' AND table_name = 'orders') THEN
        ALTER TABLE orders.orders
            ADD COLUMN IF NOT EXISTS assigned_fulfiller_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL;
        COMMENT ON COLUMN orders.orders.assigned_fulfiller_user_id IS 'Usuario asignado para surtir este pedido (surtidor sin tienda). NULL = no asignado o lo surte la propia tienda.';
        CREATE INDEX IF NOT EXISTS idx_orders_assigned_fulfiller_user_id ON orders.orders(assigned_fulfiller_user_id) WHERE assigned_fulfiller_user_id IS NOT NULL;
    END IF;
END $$;

-- ============================================================================
-- NOTAS
-- ============================================================================
-- - Ejecución condicional: core.user_fulfillment_scope solo se crea si existen
--   core.business_groups y core.businesses. La columna en orders.orders solo
--   se añade si existe orders.orders. Si algo no existe, el script no falla.
-- - user_fulfillment_scope: al menos uno de business_id o business_group_id
--   debe ser NOT NULL. Un usuario puede tener varias filas (ej. un business
--   y un group).
-- - assigned_fulfiller_user_id: el backend debe setearlo cuando una tienda
--   asigna un pedido a un distribuidor sin tienda; los listados "mis pedidos
--   a surtir" filtran por este campo o por business_id + can_fulfill.
-- - orders.orders ya tiene grants; la nueva columna hereda. RLS: añadir según criterio del proyecto.
-- ============================================================================
