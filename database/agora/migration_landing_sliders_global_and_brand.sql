-- ============================================================================
-- AGORA ECOSYSTEM - Migración: Sliders globales y por marca
-- ============================================================================
-- Descripción: Extiende commerce.landing_sliders para soportar sliders
--              globales (sin grupo/sucursal/marca) y sliders por marca de
--              vehículo (vehicle_brand_id), además de grupo y sucursal existentes.
--              Actualiza la función get_landing_sliders_by_context.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-02-19
-- ============================================================================

SET search_path TO core, catalog, commerce, public;

-- ----------------------------------------------------------------------------
-- 1. Añadir columna vehicle_brand_id
-- ----------------------------------------------------------------------------
ALTER TABLE commerce.landing_sliders
  ADD COLUMN IF NOT EXISTS vehicle_brand_id UUID REFERENCES catalog.vehicle_brands(id) ON DELETE CASCADE;

COMMENT ON COLUMN commerce.landing_sliders.vehicle_brand_id IS 'Marca de vehículo para sliders en contexto /brand/{code}. Solo uno de business_group_id, business_id o vehicle_brand_id debe estar presente; todos null = slider global.';

-- ----------------------------------------------------------------------------
-- 2. Eliminar constraint anterior y añadir nueva
-- ----------------------------------------------------------------------------
ALTER TABLE commerce.landing_sliders
  DROP CONSTRAINT IF EXISTS landing_sliders_context_check;

ALTER TABLE commerce.landing_sliders
  ADD CONSTRAINT landing_sliders_context_check CHECK (
    (business_group_id IS NOT NULL AND business_id IS NULL AND vehicle_brand_id IS NULL) OR
    (business_group_id IS NULL AND business_id IS NOT NULL AND vehicle_brand_id IS NULL) OR
    (business_group_id IS NULL AND business_id IS NULL AND vehicle_brand_id IS NOT NULL) OR
    (business_group_id IS NULL AND business_id IS NULL AND vehicle_brand_id IS NULL)
  );

-- ----------------------------------------------------------------------------
-- 3. Índices para vehicle_brand_id
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_landing_sliders_vehicle_brand_id
  ON commerce.landing_sliders(vehicle_brand_id)
  WHERE vehicle_brand_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_landing_sliders_brand_active_order
  ON commerce.landing_sliders(vehicle_brand_id, is_active, display_order)
  WHERE vehicle_brand_id IS NOT NULL AND is_active = TRUE;

-- Sliders globales: todos los contextos null
CREATE INDEX IF NOT EXISTS idx_landing_sliders_global
  ON commerce.landing_sliders(display_order)
  WHERE business_group_id IS NULL AND business_id IS NULL AND vehicle_brand_id IS NULL;

-- ----------------------------------------------------------------------------
-- 4. Actualizar función get_landing_sliders_by_context
-- ----------------------------------------------------------------------------
-- Eliminar la versión anterior (3 parámetros) para evitar "function name is not unique"
DROP FUNCTION IF EXISTS commerce.get_landing_sliders_by_context(UUID, UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION commerce.get_landing_sliders_by_context(
    p_business_group_id UUID DEFAULT NULL,
    p_business_id UUID DEFAULT NULL,
    p_vehicle_brand_id UUID DEFAULT NULL,
    p_only_active BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
    id UUID,
    business_group_id UUID,
    business_id UUID,
    vehicle_brand_id UUID,
    content JSONB,
    redirect_type VARCHAR,
    redirect_target_id UUID,
    redirect_url TEXT,
    display_order INTEGER,
    is_active BOOLEAN,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ls.id,
        ls.business_group_id,
        ls.business_id,
        ls.vehicle_brand_id,
        ls.content,
        ls.redirect_type,
        ls.redirect_target_id,
        ls.redirect_url,
        ls.display_order,
        ls.is_active,
        ls.start_date,
        ls.end_date,
        ls.created_at,
        ls.updated_at
    FROM commerce.landing_sliders ls
    WHERE
        (
            (p_business_group_id IS NOT NULL AND ls.business_group_id = p_business_group_id AND ls.business_id IS NULL AND ls.vehicle_brand_id IS NULL) OR
            (p_business_id IS NOT NULL AND ls.business_id = p_business_id AND ls.business_group_id IS NULL AND ls.vehicle_brand_id IS NULL) OR
            (p_vehicle_brand_id IS NOT NULL AND ls.vehicle_brand_id = p_vehicle_brand_id AND ls.business_group_id IS NULL AND ls.business_id IS NULL) OR
            (p_business_group_id IS NULL AND p_business_id IS NULL AND p_vehicle_brand_id IS NULL AND ls.business_group_id IS NULL AND ls.business_id IS NULL AND ls.vehicle_brand_id IS NULL)
        )
        AND (NOT p_only_active OR ls.is_active = TRUE)
        AND (ls.start_date IS NULL OR ls.start_date <= CURRENT_TIMESTAMP)
        AND (ls.end_date IS NULL OR ls.end_date >= CURRENT_TIMESTAMP)
    ORDER BY ls.display_order ASC, ls.created_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION commerce.get_landing_sliders_by_context(UUID, UUID, UUID, BOOLEAN) IS 'Obtiene sliders activos para un contexto: grupo, sucursal, marca o global (todos null). Ordenados por display_order.';

-- ============================================================================
-- NOTAS
-- ============================================================================
-- - Slider global: business_group_id, business_id y vehicle_brand_id en NULL.
-- - Slider por marca: solo vehicle_brand_id no nulo.
-- - La función acepta un solo tipo de contexto por llamada; para global se
--   invoca con (NULL, NULL, NULL, p_only_active).
--
-- IMPORTANTE: Este script DEBE ejecutarse en la base de datos antes de usar
-- la gestión de sliders globales o por marca en web-admin. Sin él, el backend
-- devolverá "column vehicle_brand_id does not exist".
-- Ejemplo (psql): \i database/agora/migration_landing_sliders_global_and_brand.sql
-- ============================================================================
