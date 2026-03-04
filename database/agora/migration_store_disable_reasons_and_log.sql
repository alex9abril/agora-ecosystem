-- ============================================================================
-- AGORA ECOSYSTEM - Migration: Motivos de deshabilitación y log de estado de tiendas
-- ============================================================================
-- Descripción: Crea el catálogo de motivos para deshabilitar una tienda y la tabla
--              de trazabilidad (log) cuando se deshabilita o reactiva un canal.
--              Permite auditar por qué y cuándo se cambió el estado.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-02-24
-- Hora: 18:00:00
-- ============================================================================

SET search_path TO core, catalog, public;

-- ----------------------------------------------------------------------------
-- TABLA: catalog.store_disable_reasons (catálogo de motivos)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS catalog.store_disable_reasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE catalog.store_disable_reasons IS 'Catálogo de motivos por los que se deshabilita un canal de venta (tienda).';
COMMENT ON COLUMN catalog.store_disable_reasons.code IS 'Código único (ej: maintenance, seasonal_close).';
COMMENT ON COLUMN catalog.store_disable_reasons.display_order IS 'Orden de aparición en listados (menor primero).';

CREATE INDEX IF NOT EXISTS idx_store_disable_reasons_active_order ON catalog.store_disable_reasons(is_active, display_order) WHERE is_active = TRUE;

DROP TRIGGER IF EXISTS update_store_disable_reasons_updated_at ON catalog.store_disable_reasons;
CREATE TRIGGER update_store_disable_reasons_updated_at
    BEFORE UPDATE ON catalog.store_disable_reasons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TABLA: core.store_status_log (trazabilidad de cambios de estado)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS core.store_status_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES core.stores(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('disabled', 'enabled')),
    disable_reason_id UUID REFERENCES catalog.store_disable_reasons(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE core.store_status_log IS 'Registro de cuándo y por qué se deshabilitó o habilitó una tienda (trazabilidad).';
COMMENT ON COLUMN core.store_status_log.action IS 'disabled = se deshabilitó la tienda; enabled = se reactivó.';
COMMENT ON COLUMN core.store_status_log.disable_reason_id IS 'Motivo del catálogo (solo cuando action = disabled).';

CREATE INDEX IF NOT EXISTS idx_store_status_log_store_id ON core.store_status_log(store_id);
CREATE INDEX IF NOT EXISTS idx_store_status_log_created_at ON core.store_status_log(created_at);

-- ----------------------------------------------------------------------------
-- SEED: Motivos más probables para deshabilitar una tienda
-- ----------------------------------------------------------------------------
INSERT INTO catalog.store_disable_reasons (code, name, description, is_active, display_order)
SELECT 'maintenance', 'Mantenimiento o actualización del canal', 'Cierre temporal por mejoras o actualización de contenido.', TRUE, 10
WHERE NOT EXISTS (SELECT 1 FROM catalog.store_disable_reasons WHERE code = 'maintenance');
INSERT INTO catalog.store_disable_reasons (code, name, description, is_active, display_order)
SELECT 'seasonal_close', 'Cierre temporal (vacaciones, festivos)', 'El canal no operará por un periodo definido.', TRUE, 20
WHERE NOT EXISTS (SELECT 1 FROM catalog.store_disable_reasons WHERE code = 'seasonal_close');
INSERT INTO catalog.store_disable_reasons (code, name, description, is_active, display_order)
SELECT 'low_stock', 'Falta de inventario o capacidad', 'No hay stock o capacidad para atender por este canal.', TRUE, 30
WHERE NOT EXISTS (SELECT 1 FROM catalog.store_disable_reasons WHERE code = 'low_stock');
INSERT INTO catalog.store_disable_reasons (code, name, description, is_active, display_order)
SELECT 'reorganization', 'Reorganización del negocio', 'Cambios internos o reestructuración que afectan este canal.', TRUE, 40
WHERE NOT EXISTS (SELECT 1 FROM catalog.store_disable_reasons WHERE code = 'reorganization');
INSERT INTO catalog.store_disable_reasons (code, name, description, is_active, display_order)
SELECT 'strategic', 'Decisión estratégica', 'Dejar de vender por este canal de forma permanente o indefinida.', TRUE, 50
WHERE NOT EXISTS (SELECT 1 FROM catalog.store_disable_reasons WHERE code = 'strategic');
INSERT INTO catalog.store_disable_reasons (code, name, description, is_active, display_order)
SELECT 'other', 'Otro', 'Otro motivo (especificar en notas).', TRUE, 99
WHERE NOT EXISTS (SELECT 1 FROM catalog.store_disable_reasons WHERE code = 'other');

-- ============================================================================
-- NOTAS
-- ============================================================================
-- 1. Ejecutar después de migration_stores.sql.
-- 2. Al deshabilitar una tienda desde la app, el backend debe insertar una fila en core.store_status_log con action='disabled', disable_reason_id y opcionalmente notes y created_by.
-- 3. Al reactivar (enabled), se puede insertar action='enabled' sin disable_reason_id.
-- ============================================================================
