-- ============================================================================
-- AGORA ECOSYSTEM - Migración: vehicle_variants y product_vehicle_compatibility (estructura radical)
-- ============================================================================
-- Descripción: Crea catalog.vehicle_variants (year, make, model, body_trim,
--              engine_transmission como campos explícitos) y reemplaza
--              product_vehicle_compatibility para que enlace producto ↔ variante
--              en lugar de la jerarquía spec/year/model/brand. No se usan notes
--              para almacenar compatibilidad; los cinco campos salen de vehicle_variants.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-03-11
-- Hora: 18:30:00
-- ============================================================================

SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- 1. TABLA: vehicle_variants (catálogo plano por make, model, year, body_trim, engine_transmission)
-- ============================================================================

CREATE TABLE IF NOT EXISTS catalog.vehicle_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL CHECK (year >= 1900 AND year <= 2100),
    body_trim TEXT,
    engine_transmission TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_vehicle_variants_unique
    ON catalog.vehicle_variants (make, model, year, COALESCE(body_trim, ''), COALESCE(engine_transmission, ''));

CREATE INDEX idx_vehicle_variants_make ON catalog.vehicle_variants(make);
CREATE INDEX idx_vehicle_variants_model ON catalog.vehicle_variants(model);
CREATE INDEX idx_vehicle_variants_year ON catalog.vehicle_variants(year);
CREATE INDEX idx_vehicle_variants_is_active ON catalog.vehicle_variants(is_active) WHERE is_active = TRUE;

DROP TRIGGER IF EXISTS update_vehicle_variants_updated_at ON catalog.vehicle_variants;
CREATE TRIGGER update_vehicle_variants_updated_at
    BEFORE UPDATE ON catalog.vehicle_variants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE catalog.vehicle_variants IS 'Variantes de vehículo por make, model, year, body_trim, engine_transmission (1:1 con estilo del catálogo/CSV)';

-- ============================================================================
-- 2. NUEVA TABLA: product_vehicle_compatibility (por vehicle_variant_id)
-- ============================================================================

CREATE TABLE IF NOT EXISTS catalog.product_vehicle_compatibility_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
    vehicle_variant_id UUID REFERENCES catalog.vehicle_variants(id) ON DELETE CASCADE,
    is_universal BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_compat_universal_or_variant CHECK (
        (is_universal = TRUE AND vehicle_variant_id IS NULL)
        OR
        (is_universal = FALSE AND vehicle_variant_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX idx_product_vehicle_compat_new_unique_variant
    ON catalog.product_vehicle_compatibility_new (product_id, vehicle_variant_id)
    WHERE is_universal = FALSE AND vehicle_variant_id IS NOT NULL;

CREATE UNIQUE INDEX idx_product_vehicle_compat_new_unique_universal
    ON catalog.product_vehicle_compatibility_new (product_id)
    WHERE is_universal = TRUE;

CREATE INDEX idx_product_vehicle_compat_new_product_id ON catalog.product_vehicle_compatibility_new(product_id);
CREATE INDEX idx_product_vehicle_compat_new_variant_id ON catalog.product_vehicle_compatibility_new(vehicle_variant_id) WHERE vehicle_variant_id IS NOT NULL;
CREATE INDEX idx_product_vehicle_compat_new_is_active ON catalog.product_vehicle_compatibility_new(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE catalog.product_vehicle_compatibility_new IS 'Compatibilidad producto–variante (radical); reemplaza la tabla antigua que usaba spec/year/model/brand';

-- ============================================================================
-- 3. REEMPLAZAR TABLA ANTIGUA
-- ============================================================================

DROP TABLE IF EXISTS catalog.product_vehicle_compatibility CASCADE;

ALTER TABLE catalog.product_vehicle_compatibility_new RENAME TO product_vehicle_compatibility;

ALTER INDEX idx_product_vehicle_compat_new_product_id RENAME TO idx_product_vehicle_compat_product_id;
ALTER INDEX idx_product_vehicle_compat_new_variant_id RENAME TO idx_product_vehicle_compat_variant_id;
ALTER INDEX idx_product_vehicle_compat_new_is_active RENAME TO idx_product_vehicle_compat_is_active;
ALTER INDEX idx_product_vehicle_compat_new_unique_variant RENAME TO idx_product_vehicle_compat_unique_variant;
ALTER INDEX idx_product_vehicle_compat_new_unique_universal RENAME TO idx_product_vehicle_compat_unique_universal;

DROP TRIGGER IF EXISTS update_product_vehicle_compatibility_updated_at ON catalog.product_vehicle_compatibility;
CREATE TRIGGER update_product_vehicle_compatibility_updated_at
    BEFORE UPDATE ON catalog.product_vehicle_compatibility
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE catalog.product_vehicle_compatibility IS 'Compatibilidad entre productos y variantes de vehículo (vehicle_variants); is_universal=true sin variant_id';

-- ============================================================================
-- 4. VISTA: compatibilidades por producto con 5 columnas (para UI)
-- ============================================================================

CREATE OR REPLACE VIEW catalog.product_vehicle_compatibility_detail AS
SELECT
    pvc.id,
    pvc.product_id,
    pvc.is_universal,
    pvc.is_active AS compat_is_active,
    pvc.notes AS compat_notes,
    vv.make,
    vv.model,
    vv.year,
    vv.body_trim,
    vv.engine_transmission
FROM catalog.product_vehicle_compatibility pvc
LEFT JOIN catalog.vehicle_variants vv ON vv.id = pvc.vehicle_variant_id
WHERE pvc.is_active = TRUE;

COMMENT ON VIEW catalog.product_vehicle_compatibility_detail IS 'Compatibilidades por producto con year, make, model, body_trim, engine_transmission en columnas (JOIN vehicle_variants); is_universal=true tiene make/model/year/body_trim/engine_transmission NULL';

-- ============================================================================
-- NOTAS
-- ============================================================================
-- - Las tablas vehicle_brands, vehicle_models, vehicle_years, vehicle_specs se mantienen
--   para core.user_vehicles y catalog.business_vehicle_brands; la compatibilidad de
--   productos usa solo vehicle_variants + product_vehicle_compatibility.
-- - Las funciones check_product_vehicle_compatibility y get_compatible_vehicles de
--   migration_vehicle_compatibility.sql dejan de aplicar a esta tabla; la UI debe
--   consultar product_vehicle_compatibility JOIN vehicle_variants o esta vista.
