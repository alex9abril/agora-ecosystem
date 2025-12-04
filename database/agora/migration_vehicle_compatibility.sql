-- ============================================================================
-- AGORA ECOSYSTEM - Migración: Sistema de Compatibilidad de Vehículos
-- ============================================================================
-- Descripción: Crea el sistema completo de compatibilidad de vehículos para
--              refacciones y accesorios. Permite asociar productos con
--              vehículos específicos basándose en marca, modelo, año y
--              especificaciones técnicas.
-- 
-- Uso: Ejecutar después de migration_product_types_refacciones.sql
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2025-12-02
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- 1. TABLA: MARCAS DE VEHÍCULOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS catalog.vehicle_brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Información de la marca
    name VARCHAR(100) NOT NULL, -- Ej: "Toyota", "Honda", "Nissan"
    code VARCHAR(50) NOT NULL,  -- Ej: "TOYOTA", "HONDA", "NISSAN"
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Orden de visualización
    display_order INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: código único
    UNIQUE(code)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_brands_code ON catalog.vehicle_brands(code);
CREATE INDEX IF NOT EXISTS idx_vehicle_brands_is_active ON catalog.vehicle_brands(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_vehicle_brands_display_order ON catalog.vehicle_brands(display_order);

COMMENT ON TABLE catalog.vehicle_brands IS 'Marcas de vehículos (Toyota, Honda, Nissan, etc.)';
COMMENT ON COLUMN catalog.vehicle_brands.code IS 'Código único de la marca para búsquedas y referencias';

-- ============================================================================
-- 2. TABLA: MODELOS DE VEHÍCULOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS catalog.vehicle_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES catalog.vehicle_brands(id) ON DELETE CASCADE,
    
    -- Información del modelo
    name VARCHAR(100) NOT NULL, -- Ej: "Corolla", "Civic", "Sentra"
    code VARCHAR(50) NOT NULL,  -- Ej: "COROLLA", "CIVIC", "SENTRA"
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Orden de visualización
    display_order INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: código único por marca
    UNIQUE(brand_id, code)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_models_brand_id ON catalog.vehicle_models(brand_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_models_code ON catalog.vehicle_models(code);
CREATE INDEX IF NOT EXISTS idx_vehicle_models_is_active ON catalog.vehicle_models(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_vehicle_models_display_order ON catalog.vehicle_models(brand_id, display_order);

COMMENT ON TABLE catalog.vehicle_models IS 'Modelos de vehículos por marca (Corolla, Civic, Sentra, etc.)';
COMMENT ON COLUMN catalog.vehicle_models.code IS 'Código único del modelo para búsquedas y referencias';

-- ============================================================================
-- 3. TABLA: AÑOS/GENERACIONES DE VEHÍCULOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS catalog.vehicle_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES catalog.vehicle_models(id) ON DELETE CASCADE,
    
    -- Rango de años
    year_start INTEGER NOT NULL CHECK (year_start >= 1900 AND year_start <= 2100), -- Ej: 2010
    year_end INTEGER CHECK (year_end IS NULL OR (year_end >= year_start AND year_end <= 2100)), -- Ej: 2020, NULL si es actual
    
    -- Generación (opcional)
    generation VARCHAR(50), -- Ej: "11th Gen", "12th Gen"
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    
    -- Nota: La validación de solapamiento de años se maneja con un trigger
    -- (ver función check_year_overlap más abajo)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_years_model_id ON catalog.vehicle_years(model_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_years_year_range ON catalog.vehicle_years(model_id, year_start, year_end);
CREATE INDEX IF NOT EXISTS idx_vehicle_years_is_active ON catalog.vehicle_years(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE catalog.vehicle_years IS 'Años o generaciones de modelos de vehículos';
COMMENT ON COLUMN catalog.vehicle_years.year_end IS 'NULL indica que el modelo sigue en producción';
COMMENT ON COLUMN catalog.vehicle_years.generation IS 'Generación del modelo (ej: "11th Gen", "12th Gen")';

-- ============================================================================
-- 4. TABLA: ESPECIFICACIONES DE VEHÍCULOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS catalog.vehicle_specs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year_id UUID NOT NULL REFERENCES catalog.vehicle_years(id) ON DELETE CASCADE,
    
    -- Motor
    engine_code VARCHAR(50), -- Ej: "2ZR-FE", "K20A"
    engine_displacement VARCHAR(20), -- Ej: "1.8L", "2.0L"
    engine_cylinders INTEGER CHECK (engine_cylinders > 0), -- Ej: 4, 6, 8
    
    -- Transmisión
    transmission_type VARCHAR(50), -- Ej: "Manual", "Automática", "CVT", "DCT"
    transmission_speeds INTEGER CHECK (transmission_speeds > 0), -- Ej: 5, 6, 8
    
    -- Tracción
    drivetrain VARCHAR(20), -- Ej: "FWD", "RWD", "AWD", "4WD"
    
    -- Carrocería
    body_type VARCHAR(50), -- Ej: "Sedán", "Hatchback", "SUV", "Pickup"
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vehicle_specs_year_id ON catalog.vehicle_specs(year_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_specs_engine_code ON catalog.vehicle_specs(engine_code) WHERE engine_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicle_specs_transmission ON catalog.vehicle_specs(transmission_type) WHERE transmission_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicle_specs_drivetrain ON catalog.vehicle_specs(drivetrain) WHERE drivetrain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicle_specs_is_active ON catalog.vehicle_specs(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE catalog.vehicle_specs IS 'Especificaciones técnicas de vehículos (motor, transmisión, tracción, etc.)';
COMMENT ON COLUMN catalog.vehicle_specs.engine_code IS 'Código del motor (ej: "2ZR-FE", "K20A")';
COMMENT ON COLUMN catalog.vehicle_specs.transmission_type IS 'Tipo de transmisión (Manual, Automática, CVT, DCT)';

-- ============================================================================
-- 5. TABLA: COMPATIBILIDAD PRODUCTO-VEHÍCULO
-- ============================================================================

CREATE TABLE IF NOT EXISTS catalog.product_vehicle_compatibility (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
    
    -- Niveles de compatibilidad (jerarquía: spec > year > model > brand)
    vehicle_spec_id UUID REFERENCES catalog.vehicle_specs(id) ON DELETE CASCADE,
    vehicle_year_id UUID REFERENCES catalog.vehicle_years(id) ON DELETE CASCADE,
    vehicle_model_id UUID REFERENCES catalog.vehicle_models(id) ON DELETE CASCADE,
    vehicle_brand_id UUID REFERENCES catalog.vehicle_brands(id) ON DELETE CASCADE,
    
    -- Compatibilidad universal
    is_universal BOOLEAN DEFAULT FALSE,
    
    -- Notas adicionales
    notes TEXT, -- Ej: "Requiere adaptador adicional", "Solo para versión deportiva"
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CHECK (
        -- Debe ser universal O tener al menos una referencia específica
        (is_universal = TRUE AND vehicle_spec_id IS NULL AND vehicle_year_id IS NULL 
         AND vehicle_model_id IS NULL AND vehicle_brand_id IS NULL)
        OR
        (is_universal = FALSE AND (
            vehicle_spec_id IS NOT NULL OR 
            vehicle_year_id IS NOT NULL OR 
            vehicle_model_id IS NOT NULL OR 
            vehicle_brand_id IS NOT NULL
        ))
    ),
    -- Evitar duplicados
    UNIQUE(product_id, vehicle_spec_id, vehicle_year_id, vehicle_model_id, vehicle_brand_id, is_universal)
);

CREATE INDEX IF NOT EXISTS idx_product_vehicle_compat_product_id ON catalog.product_vehicle_compatibility(product_id);
CREATE INDEX IF NOT EXISTS idx_product_vehicle_compat_spec_id ON catalog.product_vehicle_compatibility(vehicle_spec_id) WHERE vehicle_spec_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_vehicle_compat_year_id ON catalog.product_vehicle_compatibility(vehicle_year_id) WHERE vehicle_year_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_vehicle_compat_model_id ON catalog.product_vehicle_compatibility(vehicle_model_id) WHERE vehicle_model_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_vehicle_compat_brand_id ON catalog.product_vehicle_compatibility(vehicle_brand_id) WHERE vehicle_brand_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_vehicle_compat_universal ON catalog.product_vehicle_compatibility(product_id, is_universal) WHERE is_universal = TRUE;
CREATE INDEX IF NOT EXISTS idx_product_vehicle_compat_is_active ON catalog.product_vehicle_compatibility(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE catalog.product_vehicle_compatibility IS 'Compatibilidad entre productos (refacciones/accesorios) y vehículos';
COMMENT ON COLUMN catalog.product_vehicle_compatibility.is_universal IS 'TRUE si el producto es compatible con todos los vehículos';
COMMENT ON COLUMN catalog.product_vehicle_compatibility.notes IS 'Notas adicionales sobre la compatibilidad (ej: requiere adaptador)';

-- ============================================================================
-- 6. FUNCIONES DE VALIDACIÓN Y ÚTILES
-- ============================================================================

-- Función: Validar que no haya solapamiento de años para el mismo modelo
CREATE OR REPLACE FUNCTION catalog.check_year_overlap()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar si hay solapamiento con otros años del mismo modelo
    IF EXISTS (
        SELECT 1
        FROM catalog.vehicle_years vy
        WHERE vy.model_id = NEW.model_id
          AND vy.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
          AND vy.is_active = TRUE
          AND (
            -- El nuevo rango se solapa con un rango existente
            (NEW.year_start BETWEEN vy.year_start AND COALESCE(vy.year_end, 2100))
            OR
            (COALESCE(NEW.year_end, 2100) BETWEEN vy.year_start AND COALESCE(vy.year_end, 2100))
            OR
            (NEW.year_start <= vy.year_start AND COALESCE(NEW.year_end, 2100) >= COALESCE(vy.year_end, 2100))
          )
    ) THEN
        RAISE EXCEPTION 'El rango de años se solapa con otro rango existente para este modelo';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION catalog.check_year_overlap IS 'Valida que no haya solapamiento de años para el mismo modelo';

-- Trigger: Validar solapamiento antes de insertar/actualizar
CREATE TRIGGER trigger_check_year_overlap
    BEFORE INSERT OR UPDATE ON catalog.vehicle_years
    FOR EACH ROW
    EXECUTE FUNCTION catalog.check_year_overlap();

-- ============================================================================
-- 7. FUNCIONES ÚTILES PARA COMPATIBILIDAD
-- ============================================================================

-- Función: Verificar compatibilidad de un producto con un vehículo
CREATE OR REPLACE FUNCTION catalog.check_product_vehicle_compatibility(
    p_product_id UUID,
    p_brand_id UUID DEFAULT NULL,
    p_model_id UUID DEFAULT NULL,
    p_year_id UUID DEFAULT NULL,
    p_spec_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1
        FROM catalog.product_vehicle_compatibility pvc
        WHERE pvc.product_id = p_product_id
          AND pvc.is_active = TRUE
          AND (
            -- Compatibilidad universal
            pvc.is_universal = TRUE
            OR
            -- Compatibilidad específica (jerarquía)
            (
              -- Si hay spec_id, debe coincidir exactamente
              (p_spec_id IS NOT NULL AND pvc.vehicle_spec_id = p_spec_id)
              OR
              -- Si hay year_id, debe coincidir (y puede tener spec_id o no)
              (p_year_id IS NOT NULL AND pvc.vehicle_year_id = p_year_id 
               AND (pvc.vehicle_spec_id IS NULL OR pvc.vehicle_spec_id = p_spec_id))
              OR
              -- Si hay model_id, debe coincidir (y puede tener year_id o no)
              (p_model_id IS NOT NULL AND pvc.vehicle_model_id = p_model_id
               AND (pvc.vehicle_year_id IS NULL OR pvc.vehicle_year_id = p_year_id)
               AND (pvc.vehicle_spec_id IS NULL OR pvc.vehicle_spec_id = p_spec_id))
              OR
              -- Si solo hay brand_id, debe coincidir (y puede tener model_id o no)
              (p_brand_id IS NOT NULL AND pvc.vehicle_brand_id = p_brand_id
               AND (pvc.vehicle_model_id IS NULL OR pvc.vehicle_model_id = p_model_id)
               AND (pvc.vehicle_year_id IS NULL OR pvc.vehicle_year_id = p_year_id)
               AND (pvc.vehicle_spec_id IS NULL OR pvc.vehicle_spec_id = p_spec_id))
            )
          )
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION catalog.check_product_vehicle_compatibility IS 'Verifica si un producto es compatible con un vehículo específico';

-- Función: Obtener vehículos compatibles con un producto
CREATE OR REPLACE FUNCTION catalog.get_compatible_vehicles(
    p_product_id UUID
)
RETURNS TABLE (
    brand_name VARCHAR(100),
    model_name VARCHAR(100),
    year_start INTEGER,
    year_end INTEGER,
    generation VARCHAR(50),
    engine_code VARCHAR(50),
    transmission_type VARCHAR(50),
    drivetrain VARCHAR(20),
    body_type VARCHAR(50),
    is_universal BOOLEAN,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        vb.name as brand_name,
        vm.name as model_name,
        vy.year_start,
        vy.year_end,
        vy.generation,
        vs.engine_code,
        vs.transmission_type,
        vs.drivetrain,
        vs.body_type,
        pvc.is_universal,
        pvc.notes
    FROM catalog.product_vehicle_compatibility pvc
    LEFT JOIN catalog.vehicle_brands vb ON pvc.vehicle_brand_id = vb.id
    LEFT JOIN catalog.vehicle_models vm ON pvc.vehicle_model_id = vm.id
    LEFT JOIN catalog.vehicle_years vy ON pvc.vehicle_year_id = vy.id
    LEFT JOIN catalog.vehicle_specs vs ON pvc.vehicle_spec_id = vs.id
    WHERE pvc.product_id = p_product_id
      AND pvc.is_active = TRUE
    ORDER BY 
        pvc.is_universal DESC, -- Universales primero
        vb.name,
        vm.name,
        vy.year_start;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION catalog.get_compatible_vehicles IS 'Obtiene todos los vehículos compatibles con un producto';

-- ============================================================================
-- 8. DATOS INICIALES: MARCAS COMUNES
-- ============================================================================

-- Insertar marcas comunes de vehículos
INSERT INTO catalog.vehicle_brands (id, name, code, display_order, is_active)
VALUES
    ('00000001-0000-0000-0000-000000000001', 'Toyota', 'TOYOTA', 1, TRUE),
    ('00000002-0000-0000-0000-000000000001', 'Honda', 'HONDA', 2, TRUE),
    ('00000003-0000-0000-0000-000000000001', 'Nissan', 'NISSAN', 3, TRUE),
    ('00000004-0000-0000-0000-000000000001', 'Ford', 'FORD', 4, TRUE),
    ('00000005-0000-0000-0000-000000000001', 'Chevrolet', 'CHEVROLET', 5, TRUE),
    ('00000006-0000-0000-0000-000000000001', 'Volkswagen', 'VOLKSWAGEN', 6, TRUE),
    ('00000007-0000-0000-0000-000000000001', 'Mazda', 'MAZDA', 7, TRUE),
    ('00000008-0000-0000-0000-000000000001', 'Hyundai', 'HYUNDAI', 8, TRUE),
    ('00000009-0000-0000-0000-000000000001', 'Kia', 'KIA', 9, TRUE),
    ('00000010-0000-0000-0000-000000000001', 'BMW', 'BMW', 10, TRUE),
    ('00000011-0000-0000-0000-000000000001', 'Mercedes-Benz', 'MERCEDES', 11, TRUE),
    ('00000012-0000-0000-0000-000000000001', 'Audi', 'AUDI', 12, TRUE)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- 9. DATOS INICIALES: MODELOS COMUNES
-- ============================================================================

-- Insertar modelos comunes (ejemplos para Toyota y Honda)
INSERT INTO catalog.vehicle_models (id, brand_id, name, code, display_order, is_active)
VALUES
    -- Toyota
    ('00000001-0000-0000-0000-000000000010', '00000001-0000-0000-0000-000000000001', 'Corolla', 'COROLLA', 1, TRUE),
    ('00000001-0000-0000-0000-000000000020', '00000001-0000-0000-0000-000000000001', 'Camry', 'CAMRY', 2, TRUE),
    ('00000001-0000-0000-0000-000000000030', '00000001-0000-0000-0000-000000000001', 'RAV4', 'RAV4', 3, TRUE),
    ('00000001-0000-0000-0000-000000000040', '00000001-0000-0000-0000-000000000001', 'Hilux', 'HILUX', 4, TRUE),
    -- Honda
    ('00000002-0000-0000-0000-000000000010', '00000002-0000-0000-0000-000000000001', 'Civic', 'CIVIC', 1, TRUE),
    ('00000002-0000-0000-0000-000000000020', '00000002-0000-0000-0000-000000000001', 'Accord', 'ACCORD', 2, TRUE),
    ('00000002-0000-0000-0000-000000000030', '00000002-0000-0000-0000-000000000001', 'CR-V', 'CRV', 3, TRUE),
    -- Nissan
    ('00000003-0000-0000-0000-000000000010', '00000003-0000-0000-0000-000000000001', 'Sentra', 'SENTRA', 1, TRUE),
    ('00000003-0000-0000-0000-000000000020', '00000003-0000-0000-0000-000000000001', 'Altima', 'ALTIMA', 2, TRUE),
    ('00000003-0000-0000-0000-000000000030', '00000003-0000-0000-0000-000000000001', 'Versa', 'VERSA', 3, TRUE)
ON CONFLICT (brand_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- 10. DATOS INICIALES: AÑOS/GENERACIONES (EJEMPLOS)
-- ============================================================================

-- Ejemplos para Toyota Corolla
INSERT INTO catalog.vehicle_years (id, model_id, year_start, year_end, generation, is_active)
VALUES
    ('00000001-0000-0000-0000-000000000100', '00000001-0000-0000-0000-000000000010', 2010, 2013, '10th Gen', TRUE),
    ('00000001-0000-0000-0000-000000000110', '00000001-0000-0000-0000-000000000010', 2014, 2018, '11th Gen', TRUE),
    ('00000001-0000-0000-0000-000000000120', '00000001-0000-0000-0000-000000000010', 2019, 2022, '12th Gen', TRUE),
    ('00000001-0000-0000-0000-000000000130', '00000001-0000-0000-0000-000000000010', 2023, NULL, '13th Gen', TRUE)
ON CONFLICT DO NOTHING;

-- Ejemplos para Honda Civic
INSERT INTO catalog.vehicle_years (id, model_id, year_start, year_end, generation, is_active)
VALUES
    ('00000002-0000-0000-0000-000000000100', '00000002-0000-0000-0000-000000000010', 2012, 2015, '9th Gen', TRUE),
    ('00000002-0000-0000-0000-000000000110', '00000002-0000-0000-0000-000000000010', 2016, 2021, '10th Gen', TRUE),
    ('00000002-0000-0000-0000-000000000120', '00000002-0000-0000-0000-000000000010', 2022, NULL, '11th Gen', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar marcas creadas
SELECT 
    name,
    code,
    display_order,
    is_active
FROM catalog.vehicle_brands
ORDER BY display_order;

-- Verificar modelos creados
SELECT 
    vb.name as marca,
    vm.name as modelo,
    vm.code,
    vm.display_order
FROM catalog.vehicle_models vm
JOIN catalog.vehicle_brands vb ON vm.brand_id = vb.id
ORDER BY vb.display_order, vm.display_order;

-- Verificar años creados
SELECT 
    vb.name as marca,
    vm.name as modelo,
    vy.year_start,
    vy.year_end,
    vy.generation
FROM catalog.vehicle_years vy
JOIN catalog.vehicle_models vm ON vy.model_id = vm.id
JOIN catalog.vehicle_brands vb ON vm.brand_id = vb.id
ORDER BY vb.name, vm.name, vy.year_start;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

