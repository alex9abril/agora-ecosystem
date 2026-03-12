-- ============================================================================
-- AGORA ECOSYSTEM - Migración: Columna trim_levels en vehicle_specs
-- ============================================================================
-- Descripción: Agrega trim_levels a catalog.vehicle_specs para almacenar
--              niveles de equipamiento (LE, Limited, XLE, etc.) que vienen
--              del CSV de compatibilidades, permitiendo compatibilidad fina
--              sin depender del campo notes en product_vehicle_compatibility.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-03-11
-- ============================================================================

SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

ALTER TABLE catalog.vehicle_specs
ADD COLUMN IF NOT EXISTS trim_levels TEXT;

COMMENT ON COLUMN catalog.vehicle_specs.trim_levels IS 'Niveles de equipamiento (ej: LE, Limited, XLE) del CSV body_trim';
