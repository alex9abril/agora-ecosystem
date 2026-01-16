-- ============================================================================
-- AGORA ECOSYSTEM - Add logo_url field to email templates
-- ============================================================================
-- Descripción: Agrega el campo logo_url a las tablas de templates de correo
--              para permitir personalizar el logo en cada template.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2025-01-15
-- Hora: 15:00:00
-- ============================================================================

SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- AGREGAR CAMPO logo_url A communication.email_templates
-- ============================================================================

ALTER TABLE communication.email_templates 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN communication.email_templates.logo_url IS 'URL del logo personalizado para este template. Si es NULL, se usa el logo por defecto de AGORA.';

-- ============================================================================
-- AGREGAR CAMPO logo_url A core.business_group_email_templates
-- ============================================================================

ALTER TABLE core.business_group_email_templates 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN core.business_group_email_templates.logo_url IS 'URL del logo personalizado para este template de grupo. Si es NULL, se usa el logo del template global o el por defecto.';

-- ============================================================================
-- AGREGAR CAMPO logo_url A core.business_email_templates
-- ============================================================================

ALTER TABLE core.business_email_templates 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN core.business_email_templates.logo_url IS 'URL del logo personalizado para este template de sucursal. Si es NULL, se usa el logo del template de grupo, global o el por defecto.';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

DO $$
BEGIN
    -- Verificar que las columnas se agregaron correctamente
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'communication' 
        AND table_name = 'email_templates' 
        AND column_name = 'logo_url'
    ) THEN
        RAISE EXCEPTION 'No se pudo agregar logo_url a communication.email_templates';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'core' 
        AND table_name = 'business_group_email_templates' 
        AND column_name = 'logo_url'
    ) THEN
        RAISE EXCEPTION 'No se pudo agregar logo_url a core.business_group_email_templates';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'core' 
        AND table_name = 'business_email_templates' 
        AND column_name = 'logo_url'
    ) THEN
        RAISE EXCEPTION 'No se pudo agregar logo_url a core.business_email_templates';
    END IF;

    RAISE NOTICE '✅ Campo logo_url agregado exitosamente a todas las tablas de templates';
END $$;

-- ============================================================================
-- NOTAS:
-- ============================================================================
-- 1. El campo logo_url es opcional (NULL por defecto)
-- 2. Si logo_url es NULL, se debe usar el logo por defecto de AGORA
-- 3. El logo debe ser una URL válida (puede ser de storage o externa)
-- 4. El frontend debe manejar la carga del logo y actualizar este campo
-- 5. Al reconstruir el template HTML, se debe reemplazar el src del img
--    del logo con el valor de logo_url si existe
-- ============================================================================

