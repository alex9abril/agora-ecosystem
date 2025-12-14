-- ============================================================================
-- AGORA ECOSYSTEM - Migración: Vehículos de Usuarios
-- ============================================================================
-- Descripción: Crea la tabla para almacenar los vehículos seleccionados por
--              los usuarios. Permite que un usuario tenga múltiples vehículos
--              y seleccione uno como predeterminado.
-- 
-- Uso: Ejecutar después de migration_vehicle_compatibility.sql
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2025-01-XX
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- TABLA: VEHÍCULOS DE USUARIOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS core.user_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Referencias a catálogo de vehículos
    vehicle_brand_id UUID NOT NULL REFERENCES catalog.vehicle_brands(id) ON DELETE RESTRICT,
    vehicle_model_id UUID REFERENCES catalog.vehicle_models(id) ON DELETE RESTRICT,
    vehicle_year_id UUID REFERENCES catalog.vehicle_years(id) ON DELETE RESTRICT,
    vehicle_spec_id UUID REFERENCES catalog.vehicle_specs(id) ON DELETE RESTRICT,
    
    -- Nombre personalizado del vehículo (opcional)
    nickname VARCHAR(100), -- Ej: "Mi Corolla", "Auto de trabajo"
    
    -- Vehículo predeterminado (solo uno por usuario puede ser predeterminado)
    is_default BOOLEAN DEFAULT FALSE,
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: Solo un vehículo predeterminado por usuario
    CONSTRAINT unique_default_vehicle UNIQUE (user_id, is_default) DEFERRABLE INITIALLY DEFERRED
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_vehicles_user_id ON core.user_vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_vehicles_brand_id ON core.user_vehicles(vehicle_brand_id);
CREATE INDEX IF NOT EXISTS idx_user_vehicles_model_id ON core.user_vehicles(vehicle_model_id);
CREATE INDEX IF NOT EXISTS idx_user_vehicles_year_id ON core.user_vehicles(vehicle_year_id);
CREATE INDEX IF NOT EXISTS idx_user_vehicles_spec_id ON core.user_vehicles(vehicle_spec_id);
CREATE INDEX IF NOT EXISTS idx_user_vehicles_is_default ON core.user_vehicles(user_id, is_default) WHERE is_default = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_vehicles_is_active ON core.user_vehicles(user_id, is_active) WHERE is_active = TRUE;

COMMENT ON TABLE core.user_vehicles IS 'Vehículos seleccionados por los usuarios';
COMMENT ON COLUMN core.user_vehicles.nickname IS 'Nombre personalizado del vehículo (ej: "Mi Corolla", "Auto de trabajo")';
COMMENT ON COLUMN core.user_vehicles.is_default IS 'Indica si este es el vehículo predeterminado del usuario (solo uno por usuario)';

-- ============================================================================
-- TRIGGER: Actualizar updated_at automáticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION core.update_user_vehicles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_vehicles_updated_at
    BEFORE UPDATE ON core.user_vehicles
    FOR EACH ROW
    EXECUTE FUNCTION core.update_user_vehicles_updated_at();

-- ============================================================================
-- TRIGGER: Asegurar que solo haya un vehículo predeterminado por usuario
-- ============================================================================

CREATE OR REPLACE FUNCTION core.ensure_single_default_vehicle()
RETURNS TRIGGER AS $$
BEGIN
    -- Si se está estableciendo un vehículo como predeterminado
    IF NEW.is_default = TRUE THEN
        -- Desmarcar todos los demás vehículos del mismo usuario como predeterminados
        UPDATE core.user_vehicles
        SET is_default = FALSE
        WHERE user_id = NEW.user_id
          AND id != NEW.id
          AND is_default = TRUE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_default_vehicle
    BEFORE INSERT OR UPDATE ON core.user_vehicles
    FOR EACH ROW
    WHEN (NEW.is_default = TRUE)
    EXECUTE FUNCTION core.ensure_single_default_vehicle();

-- ============================================================================
-- FUNCIÓN: Obtener vehículo predeterminado de un usuario
-- ============================================================================

CREATE OR REPLACE FUNCTION core.get_user_default_vehicle(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    vehicle_brand_id UUID,
    vehicle_model_id UUID,
    vehicle_year_id UUID,
    vehicle_spec_id UUID,
    nickname VARCHAR(100),
    is_default BOOLEAN,
    brand_name VARCHAR(100),
    model_name VARCHAR(100),
    year_start INTEGER,
    year_end INTEGER,
    generation VARCHAR(50),
    engine_code VARCHAR(50),
    transmission_type VARCHAR(50),
    drivetrain VARCHAR(20),
    body_type VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uv.id,
        uv.user_id,
        uv.vehicle_brand_id,
        uv.vehicle_model_id,
        uv.vehicle_year_id,
        uv.vehicle_spec_id,
        uv.nickname,
        uv.is_default,
        vb.name as brand_name,
        vm.name as model_name,
        vy.year_start,
        vy.year_end,
        vy.generation,
        vs.engine_code,
        vs.transmission_type,
        vs.drivetrain,
        vs.body_type
    FROM core.user_vehicles uv
    JOIN catalog.vehicle_brands vb ON uv.vehicle_brand_id = vb.id
    LEFT JOIN catalog.vehicle_models vm ON uv.vehicle_model_id = vm.id
    LEFT JOIN catalog.vehicle_years vy ON uv.vehicle_year_id = vy.id
    LEFT JOIN catalog.vehicle_specs vs ON uv.vehicle_spec_id = vs.id
    WHERE uv.user_id = p_user_id
      AND uv.is_default = TRUE
      AND uv.is_active = TRUE
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.get_user_default_vehicle IS 'Obtiene el vehículo predeterminado de un usuario con toda su información';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar que la tabla se creó correctamente
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'core'
  AND table_name = 'user_vehicles'
ORDER BY ordinal_position;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

