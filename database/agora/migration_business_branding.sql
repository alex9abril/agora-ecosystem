-- ============================================================================
-- AGORA ECOSYSTEM - Migración: Sistema de Personalización/Branding
-- ============================================================================
-- Descripción: Agrega soporte para personalización de branding tanto a nivel
--              de grupo empresarial como a nivel de sucursal individual.
--              Permite configurar logos, colores, textos y otros elementos
--              visuales de la interfaz.
-- 
-- Uso: Ejecutar después de migration_business_groups.sql
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2025-12-02
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- 1. AGREGAR CAMPO SETTINGS A BUSINESSES (si no existe)
-- ============================================================================

-- Agregar columna settings a businesses para personalización a nivel sucursal
ALTER TABLE core.businesses
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN core.businesses.settings IS 'Configuraciones de personalización y branding de la sucursal (JSONB). Incluye colores, textos, logos, etc.';

-- Crear índice GIN para búsquedas eficientes en JSONB
CREATE INDEX IF NOT EXISTS idx_businesses_settings_gin ON core.businesses USING GIN (settings);

-- ============================================================================
-- 2. ESTRUCTURA DE BRANDING (Documentación)
-- ============================================================================

-- La estructura de branding se almacena en el campo settings (JSONB)
-- Tanto en business_groups como en businesses
--
-- Estructura para business_groups.settings:
-- {
--   "branding": {
--     "logo_url": "https://...",
--     "logo_light_url": "https://...",  // Logo para fondos claros
--     "logo_dark_url": "https://...",   // Logo para fondos oscuros
--     "favicon_url": "https://...",
--     "primary_color": "#FF5733",
--     "secondary_color": "#33C3F0",
--     "accent_color": "#FFC300",
--     "text_primary": "#1A1A1A",
--     "text_secondary": "#666666",
--     "background_color": "#FFFFFF",
--     "background_secondary": "#F5F5F5",
--     "success_color": "#28A745",
--     "warning_color": "#FFC107",
--     "error_color": "#DC3545",
--     "info_color": "#17A2B8",
--     "fonts": {
--       "primary": "Inter",
--       "secondary": "Roboto",
--       "heading": "Poppins"
--     },
--     "texts": {
--       "welcome_message": "Bienvenido a nuestra tienda",
--       "tagline": "Tu tienda de confianza",
--       "footer_text": "© 2025 Todos los derechos reservados",
--       "contact_message": "¿Necesitas ayuda? Contáctanos"
--     },
--     "social_media": {
--       "facebook": "https://facebook.com/...",
--       "instagram": "https://instagram.com/...",
--       "twitter": "https://twitter.com/...",
--       "whatsapp": "+521234567890"
--     },
--     "custom_css": "",  // CSS personalizado (opcional)
--     "custom_js": ""    // JavaScript personalizado (opcional)
--   }
-- }
--
-- Estructura para businesses.settings:
-- Similar a business_groups, pero puede sobrescribir valores del grupo
-- Si un campo no está definido en businesses.settings.branding,
-- se hereda del business_group.settings.branding
--
-- Ejemplo de herencia:
-- - Grupo tiene primary_color: "#FF5733"
-- - Sucursal no define primary_color
-- - Sucursal usa "#FF5733" del grupo
-- - Si sucursal define primary_color: "#00FF00", usa ese valor

-- ============================================================================
-- 3. FUNCIÓN: Obtener branding completo (grupo + sucursal)
-- ============================================================================

CREATE OR REPLACE FUNCTION core.get_business_branding(p_business_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_business_settings JSONB;
  v_group_settings JSONB;
  v_branding JSONB;
BEGIN
  -- Obtener settings de la sucursal
  SELECT COALESCE(settings, '{}'::jsonb) INTO v_business_settings
  FROM core.businesses
  WHERE id = p_business_id;
  
  -- Obtener settings del grupo (si existe)
  SELECT COALESCE(bg.settings, '{}'::jsonb) INTO v_group_settings
  FROM core.businesses b
  LEFT JOIN core.business_groups bg ON b.business_group_id = bg.id
  WHERE b.id = p_business_id;
  
  -- Combinar: grupo como base, sucursal sobrescribe
  v_branding := COALESCE(v_group_settings->'branding', '{}'::jsonb);
  
  -- Si la sucursal tiene branding, combinar (sucursal tiene prioridad)
  IF v_business_settings ? 'branding' THEN
    v_branding := v_branding || (v_business_settings->'branding');
  END IF;
  
  RETURN jsonb_build_object('branding', v_branding);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.get_business_branding IS 'Obtiene el branding completo de una sucursal, combinando configuración del grupo (base) y de la sucursal (sobrescritura)';

-- ============================================================================
-- 4. FUNCIÓN: Obtener branding del grupo
-- ============================================================================

CREATE OR REPLACE FUNCTION core.get_group_branding(p_group_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_group_settings JSONB;
BEGIN
  SELECT COALESCE(settings->'branding', '{}'::jsonb) INTO v_group_settings
  FROM core.business_groups
  WHERE id = p_group_id;
  
  RETURN v_group_settings;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.get_group_branding IS 'Obtiene el branding de un grupo empresarial';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar que la columna settings existe
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'core' 
  AND table_name = 'businesses' 
  AND column_name = 'settings';

-- Verificar índices
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'core' 
  AND tablename = 'businesses' 
  AND indexname = 'idx_businesses_settings_gin';

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

