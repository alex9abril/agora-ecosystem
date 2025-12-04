-- ============================================================================
-- AGORA ECOSYSTEM - Migration: Campos Adicionales para Sucursales
-- ============================================================================
-- Descripción: Agrega campos adicionales a la tabla core.businesses:
--              - accepts_pickup: Si la sucursal acepta recolección de productos
--              - slug: Identificador amigable para el storefront
--              - is_active: Validación y actualización si no existe
-- 
-- Uso: Ejecutar después de schema.sql
-- Nota: Este script es idempotente, puede ejecutarse múltiples veces sin errores
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2025-12-03
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- 1. CAMPO: accepts_pickup (Acepta recolección de productos)
-- ============================================================================

-- Verificar si la columna ya existe antes de agregarla
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'core' 
        AND table_name = 'businesses' 
        AND column_name = 'accepts_pickup'
    ) THEN
        ALTER TABLE core.businesses 
        ADD COLUMN accepts_pickup BOOLEAN DEFAULT FALSE;
        
        COMMENT ON COLUMN core.businesses.accepts_pickup IS 
            'Indica si la sucursal acepta recolección de productos en la unidad física (picking en la agencia)';
    ELSE
        RAISE NOTICE 'La columna accepts_pickup ya existe, omitiendo...';
    END IF;
END $$;

-- ============================================================================
-- 2. CAMPO: slug (Identificador amigable para storefront)
-- ============================================================================

-- Verificar si la columna ya existe antes de agregarla
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'core' 
        AND table_name = 'businesses' 
        AND column_name = 'slug'
    ) THEN
        ALTER TABLE core.businesses 
        ADD COLUMN slug VARCHAR(255);
        
        COMMENT ON COLUMN core.businesses.slug IS 
            'Identificador amigable para usar en el storefront en lugar del ID';
    ELSE
        RAISE NOTICE 'La columna slug ya existe, omitiendo...';
    END IF;
END $$;

-- Crear índice único para slug (solo si no existe)
CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_slug_unique 
    ON core.businesses(slug) 
    WHERE slug IS NOT NULL;

-- Crear índice para búsquedas por slug
CREATE INDEX IF NOT EXISTS idx_businesses_slug 
    ON core.businesses(slug);

-- ============================================================================
-- 3. VALIDACIÓN: is_active (Asegurar que existe)
-- ============================================================================

-- Verificar si is_active existe, si no, agregarlo
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'core' 
        AND table_name = 'businesses' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE core.businesses 
        ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        
        COMMENT ON COLUMN core.businesses.is_active IS 
            'Indica si la sucursal está activa y disponible para ventas en el storefront';
    ELSE
        RAISE NOTICE 'La columna is_active ya existe, omitiendo...';
    END IF;
END $$;

-- ============================================================================
-- 4. FUNCIÓN: Generar slug automáticamente desde el nombre
-- ============================================================================

CREATE OR REPLACE FUNCTION core.generate_slug(input_text TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    -- Convertir a minúsculas
    result := LOWER(input_text);
    
    -- Reemplazar espacios y caracteres especiales por guiones
    result := REGEXP_REPLACE(result, '[^a-z0-9]+', '-', 'g');
    
    -- Eliminar guiones al inicio y final
    result := TRIM(BOTH '-' FROM result);
    
    -- Limitar longitud a 100 caracteres
    IF LENGTH(result) > 100 THEN
        result := LEFT(result, 100);
        -- Asegurar que no termine en guion
        result := RTRIM(result, '-');
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION core.generate_slug IS 
    'Genera un slug amigable desde un texto, eliminando caracteres especiales y espacios';

-- ============================================================================
-- 5. FUNCIÓN: Generar slug único (agregando número si es necesario)
-- ============================================================================

CREATE OR REPLACE FUNCTION core.generate_unique_slug(base_name TEXT, exclude_id UUID DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    candidate_slug TEXT;
    counter INTEGER := 0;
    exists_check BOOLEAN;
BEGIN
    -- Generar slug base
    base_slug := core.generate_slug(base_name);
    candidate_slug := base_slug;
    
    -- Verificar si el slug ya existe
    LOOP
        SELECT EXISTS(
            SELECT 1 
            FROM core.businesses 
            WHERE slug = candidate_slug 
            AND (exclude_id IS NULL OR id != exclude_id)
        ) INTO exists_check;
        
        -- Si no existe, retornar este slug
        IF NOT exists_check THEN
            RETURN candidate_slug;
        END IF;
        
        -- Si existe, agregar un número al final
        counter := counter + 1;
        candidate_slug := base_slug || '-' || counter::TEXT;
        
        -- Prevenir loops infinitos (máximo 1000 intentos)
        IF counter > 1000 THEN
            -- Si llegamos aquí, usar timestamp como fallback
            candidate_slug := base_slug || '-' || EXTRACT(EPOCH FROM NOW())::BIGINT;
            RETURN candidate_slug;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.generate_unique_slug IS 
    'Genera un slug único para un negocio, agregando un número si el slug base ya existe';

-- ============================================================================
-- 6. TRIGGER: Generar slug automáticamente al crear/actualizar
-- ============================================================================

CREATE OR REPLACE FUNCTION core.auto_generate_business_slug()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo generar slug si no se proporcionó uno explícitamente
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := core.generate_unique_slug(NEW.name, NEW.id);
    ELSE
        -- Si se proporciona un slug, validar que sea único
        IF EXISTS(
            SELECT 1 
            FROM core.businesses 
            WHERE slug = NEW.slug 
            AND id != NEW.id
        ) THEN
            -- Si no es único, generar uno automático
            NEW.slug := core.generate_unique_slug(NEW.name, NEW.id);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger si existe
DROP TRIGGER IF EXISTS trigger_auto_generate_business_slug ON core.businesses;

-- Crear trigger
CREATE TRIGGER trigger_auto_generate_business_slug
    BEFORE INSERT OR UPDATE ON core.businesses
    FOR EACH ROW
    EXECUTE FUNCTION core.auto_generate_business_slug();

-- ============================================================================
-- 7. ACTUALIZAR SLUGS EXISTENTES (si no tienen slug)
-- ============================================================================

-- Generar slugs para negocios existentes que no tienen slug
UPDATE core.businesses
SET slug = core.generate_unique_slug(name, id)
WHERE slug IS NULL OR slug = '';

-- ============================================================================
-- 8. VERIFICACIÓN
-- ============================================================================

-- Verificar que las columnas se crearon correctamente
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'core'
    AND table_name = 'businesses'
    AND column_name IN ('accepts_pickup', 'slug', 'is_active')
ORDER BY column_name;

-- Verificar índices
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'core'
    AND tablename = 'businesses'
    AND indexname LIKE '%slug%';

-- Mostrar algunos ejemplos de slugs generados
SELECT 
    id,
    name,
    slug,
    is_active,
    accepts_pickup
FROM core.businesses
ORDER BY created_at DESC
LIMIT 5;

