-- ============================================================================
-- AGORA ECOSYSTEM - Migration: Business Groups (Grupos Empresariales)
-- ============================================================================
-- Descripción: Crea la tabla core.business_groups para almacenar información
--              de grupos empresariales que son propietarios de múltiples
--              sucursales (businesses).
--
-- Uso: Ejecutar después de schema.sql y antes de poblar datos
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2025-12-04
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ----------------------------------------------------------------------------
-- TABLA: business_groups
-- ----------------------------------------------------------------------------
-- Esta tabla representa a un grupo empresarial que es propietario de
-- múltiples sucursales (businesses). Por ejemplo: "Grupo Andrade" que
-- tiene 5 sucursales de refacciones.
--
-- Relación:
--   auth.users (owner_id) -> core.business_groups -> core.businesses
--
CREATE TABLE IF NOT EXISTS core.business_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relación con el propietario (usuario principal)
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    
    -- Información del grupo empresarial
    name VARCHAR(255) NOT NULL, -- Ej: "Grupo Andrade", "AutoParts México"
    legal_name VARCHAR(255), -- Razón social: "Grupo Andrade S.A. de C.V."
    description TEXT, -- Descripción del grupo empresarial
    
    -- Identificación y branding
    slug VARCHAR(255) UNIQUE NOT NULL, -- URL amigable: "grupo-andrade", "autoparts-mexico"
    logo_url TEXT, -- URL del logo del grupo
    website_url TEXT, -- Sitio web del grupo
    
    -- Información fiscal
    tax_id VARCHAR(50), -- RFC, NIT, o equivalente según el país
    
    -- Configuraciones adicionales (JSONB para flexibilidad)
    -- Ejemplo: {"branding": {"primary_color": "#FF5733"}, "features": {"multi_branch": true}}
    settings JSONB DEFAULT '{}'::jsonb,
    
    -- Estado
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT business_groups_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT business_groups_slug_not_empty CHECK (LENGTH(TRIM(slug)) > 0)
);

-- Comentarios en la tabla y columnas
COMMENT ON TABLE core.business_groups IS 'Grupos empresariales que son propietarios de múltiples sucursales (businesses).';
COMMENT ON COLUMN core.business_groups.owner_id IS 'Usuario principal (propietario) del grupo empresarial.';
COMMENT ON COLUMN core.business_groups.name IS 'Nombre comercial del grupo empresarial (ej: "Grupo Andrade").';
COMMENT ON COLUMN core.business_groups.legal_name IS 'Razón social o nombre legal del grupo empresarial.';
COMMENT ON COLUMN core.business_groups.slug IS 'Identificador único y amigable para URLs (ej: "grupo-andrade").';
COMMENT ON COLUMN core.business_groups.tax_id IS 'Identificador fiscal (RFC en México, NIT en otros países).';
COMMENT ON COLUMN core.business_groups.settings IS 'Configuraciones adicionales del grupo en formato JSON.';

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_business_groups_owner_id ON core.business_groups(owner_id);
CREATE INDEX IF NOT EXISTS idx_business_groups_slug ON core.business_groups(slug);
CREATE INDEX IF NOT EXISTS idx_business_groups_is_active ON core.business_groups(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_business_groups_owner_active ON core.business_groups(owner_id, is_active) WHERE is_active = TRUE;

-- Índice para búsquedas por nombre
CREATE INDEX IF NOT EXISTS idx_business_groups_name ON core.business_groups(name);

-- ----------------------------------------------------------------------------
-- FUNCIÓN: generate_business_group_slug
-- ----------------------------------------------------------------------------
-- Genera un slug único a partir de un texto de entrada para core.business_groups.
-- Similar a la función generate_business_slug pero para grupos empresariales.
--
CREATE OR REPLACE FUNCTION core.generate_business_group_slug(text_input TEXT)
RETURNS VARCHAR(255)
LANGUAGE plpgsql
AS $$
DECLARE
    generated_slug VARCHAR(255);
    counter INT := 0;
    base_slug VARCHAR(255);
BEGIN
    -- Limpiar y convertir a minúsculas, reemplazar espacios y caracteres especiales por guiones
    base_slug := LOWER(REGEXP_REPLACE(text_input, '[^a-zA-Z0-9]+', '-', 'g'));
    -- Eliminar guiones al inicio o al final
    base_slug := TRIM(BOTH '-' FROM base_slug);

    -- Asegurar que el slug no esté vacío
    IF base_slug = '' THEN
        base_slug := 'business-group';
    END IF;

    generated_slug := base_slug;

    -- Verificar unicidad y añadir sufijo si es necesario
    WHILE EXISTS (SELECT 1 FROM core.business_groups WHERE slug = generated_slug) LOOP
        counter := counter + 1;
        generated_slug := base_slug || '-' || counter;
    END LOOP;

    RETURN generated_slug;
END;
$$;

COMMENT ON FUNCTION core.generate_business_group_slug IS 'Genera un slug único a partir de un texto de entrada para core.business_groups.';

-- ----------------------------------------------------------------------------
-- TRIGGER: set_business_group_slug_from_name
-- ----------------------------------------------------------------------------
-- Genera o valida el slug automáticamente al insertar o actualizar un grupo empresarial.
--
CREATE OR REPLACE FUNCTION core.set_business_group_slug_from_name()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := core.generate_business_group_slug(NEW.name);
    ELSE
        -- Si el slug se proporciona, limpiarlo y asegurar unicidad
        NEW.slug := LOWER(REGEXP_REPLACE(NEW.slug, '[^a-zA-Z0-9]+', '-', 'g'));
        NEW.slug := TRIM(BOTH '-' FROM NEW.slug);
        IF NEW.slug = '' THEN
            NEW.slug := core.generate_business_group_slug(NEW.name);
        END IF;
        -- Si el slug proporcionado ya existe y no es el mismo que el antiguo (en caso de update)
        IF EXISTS (SELECT 1 FROM core.business_groups WHERE slug = NEW.slug AND id IS DISTINCT FROM NEW.id) THEN
            NEW.slug := core.generate_business_group_slug(NEW.slug || '-' || gen_random_uuid()); -- Añadir sufijo único
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION core.set_business_group_slug_from_name IS 'Trigger para generar o validar el slug de un grupo empresarial a partir de su nombre o un slug proporcionado.';

DROP TRIGGER IF EXISTS set_business_group_slug ON core.business_groups;
CREATE TRIGGER set_business_group_slug
BEFORE INSERT OR UPDATE OF name, slug ON core.business_groups
FOR EACH ROW
EXECUTE FUNCTION core.set_business_group_slug_from_name();

-- ----------------------------------------------------------------------------
-- TRIGGER: update_business_group_updated_at
-- ----------------------------------------------------------------------------
-- Actualiza automáticamente el campo updated_at cuando se modifica un registro.
--
CREATE OR REPLACE FUNCTION core.update_business_group_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION core.update_business_group_updated_at IS 'Actualiza automáticamente el campo updated_at de core.business_groups.';

DROP TRIGGER IF EXISTS update_business_group_updated_at ON core.business_groups;
CREATE TRIGGER update_business_group_updated_at
BEFORE UPDATE ON core.business_groups
FOR EACH ROW
EXECUTE FUNCTION core.update_business_group_updated_at();

-- ----------------------------------------------------------------------------
-- MODIFICACIÓN: Agregar business_group_id a core.businesses
-- ----------------------------------------------------------------------------
-- Agrega la columna business_group_id a la tabla core.businesses para
-- relacionar las sucursales con su grupo empresarial.
--
-- NOTA: Esta columna es OPCIONAL para mantener compatibilidad con datos existentes.
-- Las sucursales existentes pueden no tener grupo empresarial asignado.
--
ALTER TABLE core.businesses
ADD COLUMN IF NOT EXISTS business_group_id UUID REFERENCES core.business_groups(id) ON DELETE SET NULL;

COMMENT ON COLUMN core.businesses.business_group_id IS 'Grupo empresarial al que pertenece esta sucursal. NULL si la sucursal no pertenece a ningún grupo.';

-- Índice para optimizar consultas de sucursales por grupo
CREATE INDEX IF NOT EXISTS idx_businesses_business_group_id ON core.businesses(business_group_id) WHERE business_group_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- VISTA: business_groups_with_branches
-- ----------------------------------------------------------------------------
-- Vista útil para obtener grupos empresariales con información agregada
-- de sus sucursales (cantidad, estado, etc.)
--
CREATE OR REPLACE VIEW core.business_groups_with_branches AS
SELECT
    bg.id,
    bg.owner_id,
    bg.name,
    bg.legal_name,
    bg.slug,
    bg.description,
    bg.logo_url,
    bg.website_url,
    bg.tax_id,
    bg.settings,
    bg.is_active,
    bg.created_at,
    bg.updated_at,
    COUNT(b.id) AS total_branches,
    COUNT(b.id) FILTER (WHERE b.is_active = TRUE) AS active_branches,
    COUNT(b.id) FILTER (WHERE b.is_active = FALSE) AS inactive_branches,
    COALESCE(SUM(b.total_orders), 0) AS total_orders,
    COALESCE(AVG(b.rating_average), 0) AS average_rating
FROM core.business_groups bg
LEFT JOIN core.businesses b ON bg.id = b.business_group_id
GROUP BY bg.id, bg.owner_id, bg.name, bg.legal_name, bg.slug, bg.description,
         bg.logo_url, bg.website_url, bg.tax_id, bg.settings, bg.is_active,
         bg.created_at, bg.updated_at;

COMMENT ON VIEW core.business_groups_with_branches IS 'Vista que muestra grupos empresariales con información agregada de sus sucursales.';

-- ----------------------------------------------------------------------------
-- FUNCIÓN: get_business_group_by_owner
-- ----------------------------------------------------------------------------
-- Obtiene el grupo empresarial de un usuario (owner_id).
-- Útil para consultas rápidas.
--
CREATE OR REPLACE FUNCTION core.get_business_group_by_owner(p_owner_id UUID)
RETURNS TABLE (
    id UUID,
    owner_id UUID,
    name VARCHAR(255),
    legal_name VARCHAR(255),
    slug VARCHAR(255),
    description TEXT,
    logo_url TEXT,
    website_url TEXT,
    tax_id VARCHAR(50),
    settings JSONB,
    is_active BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        bg.id,
        bg.owner_id,
        bg.name,
        bg.legal_name,
        bg.slug,
        bg.description,
        bg.logo_url,
        bg.website_url,
        bg.tax_id,
        bg.settings,
        bg.is_active,
        bg.created_at,
        bg.updated_at
    FROM core.business_groups bg
    WHERE bg.owner_id = p_owner_id
      AND bg.is_active = TRUE
    ORDER BY bg.created_at DESC
    LIMIT 1; -- Un usuario puede tener múltiples grupos, pero retornamos el más reciente
END;
$$;

COMMENT ON FUNCTION core.get_business_group_by_owner IS 'Obtiene el grupo empresarial activo más reciente de un usuario (owner_id).';

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
-- Resumen de cambios:
-- ✅ Creada tabla core.business_groups
-- ✅ Agregada columna business_group_id a core.businesses
-- ✅ Creada función generate_business_group_slug
-- ✅ Creados triggers para slug y updated_at
-- ✅ Creados índices para optimización
-- ✅ Creada vista business_groups_with_branches
-- ✅ Creada función get_business_group_by_owner
-- ============================================================================

