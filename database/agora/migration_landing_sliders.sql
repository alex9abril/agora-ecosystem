-- ============================================================================
-- MIGRACIÓN: Landing Sliders (Sliders del Landing Page)
-- ============================================================================
-- Descripción: Crea la tabla commerce.landing_sliders para gestionar
--              sliders promocionales en el landing page de grupos y sucursales.
--
-- Uso: Ejecutar después de migration_business_groups.sql
--
-- Características:
-- - Soporte para sliders a nivel de grupo empresarial (business_group_id)
-- - Soporte para sliders a nivel de sucursal (business_id)
-- - Redirecciones a categorías, promociones, o sucursales
-- - Contenido flexible en JSONB (compatible con PromotionalSlider)
-- - Orden de visualización y fechas de validez
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLA: landing_sliders
-- ----------------------------------------------------------------------------
-- Los sliders pueden estar asociados a:
-- 1. Un grupo empresarial (business_group_id) - se muestra en /grupo/{slug}
-- 2. Una sucursal específica (business_id) - se muestra en /sucursal/{slug}
--
-- NOTA: Solo uno de los dos campos debe estar presente (business_group_id o business_id)
--
CREATE TABLE IF NOT EXISTS commerce.landing_sliders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Contexto: Grupo empresarial O Sucursal (solo uno debe estar presente)
    business_group_id UUID REFERENCES core.business_groups(id) ON DELETE CASCADE,
    business_id UUID REFERENCES core.businesses(id) ON DELETE CASCADE,
    
    -- Constraint: Solo uno de los dos debe estar presente
    CONSTRAINT landing_sliders_context_check CHECK (
        (business_group_id IS NOT NULL AND business_id IS NULL) OR
        (business_group_id IS NULL AND business_id IS NOT NULL)
    ),
    
    -- Contenido del slider (compatible con SlideContent de PromotionalSlider)
    -- Estructura JSONB:
    -- {
    --   "imageUrl": "https://...",
    --   "imageAlt": "Texto alternativo",
    --   "backgroundColor": "#FF5733",
    --   "gradientColors": ["#8b5cf6", "#1e1b4b"],
    --   "overlay": {
    --     "position": "left|center|right",
    --     "title": "Título principal",
    --     "titleHighlight": "Parte destacada",
    --     "subtitle": "Subtítulo",
    --     "description": "Descripción",
    --     "badge": "YA DISPONIBLE",
    --     "badgeColor": "#FF5733",
    --     "badgePosition": "top-left|top-right|top-center",
    --     "ctaText": "Ver más",
    --     "ctaColor": "#FFFFFF",
    --     "secondaryText": "HASTA 15 MESES SIN INTERESES",
    --     "discountCode": "PROMO2024",
    --     "validUntil": "2024-12-31",
    --     "termsText": "Ver términos y condiciones"
    --   },
    --   "productImages": [...],
    --   "decorativeElements": true
    -- }
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Configuración de redirección
    redirect_type VARCHAR(50), -- 'category', 'promotion', 'branch', 'url', 'none'
    redirect_target_id UUID, -- ID de categoría, promoción, o sucursal (según redirect_type)
    redirect_url TEXT, -- URL externa o ruta personalizada (si redirect_type = 'url')
    
    -- Configuración de visualización
    display_order INTEGER DEFAULT 0, -- Orden de visualización (menor = primero)
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Fechas de validez (opcional)
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Comentarios
COMMENT ON TABLE commerce.landing_sliders IS 'Sliders promocionales para el landing page de grupos empresariales y sucursales.';
COMMENT ON COLUMN commerce.landing_sliders.business_group_id IS 'Grupo empresarial al que pertenece este slider (se muestra en /grupo/{slug}).';
COMMENT ON COLUMN commerce.landing_sliders.business_id IS 'Sucursal a la que pertenece este slider (se muestra en /sucursal/{slug}).';
COMMENT ON COLUMN commerce.landing_sliders.content IS 'Contenido del slider en formato JSONB (compatible con SlideContent de PromotionalSlider).';
COMMENT ON COLUMN commerce.landing_sliders.redirect_type IS 'Tipo de redirección: category, promotion, branch, url, o none.';
COMMENT ON COLUMN commerce.landing_sliders.redirect_target_id IS 'ID del objetivo de redirección (categoría, promoción, o sucursal).';
COMMENT ON COLUMN commerce.landing_sliders.redirect_url IS 'URL externa o ruta personalizada para redirección.';
COMMENT ON COLUMN commerce.landing_sliders.display_order IS 'Orden de visualización (menor número = aparece primero).';

-- Índices
CREATE INDEX IF NOT EXISTS idx_landing_sliders_business_group_id 
    ON commerce.landing_sliders(business_group_id) 
    WHERE business_group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_landing_sliders_business_id 
    ON commerce.landing_sliders(business_id) 
    WHERE business_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_landing_sliders_is_active 
    ON commerce.landing_sliders(is_active) 
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_landing_sliders_display_order 
    ON commerce.landing_sliders(display_order);

CREATE INDEX IF NOT EXISTS idx_landing_sliders_dates 
    ON commerce.landing_sliders(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_landing_sliders_redirect_type 
    ON commerce.landing_sliders(redirect_type) 
    WHERE redirect_type IS NOT NULL;

-- Índice compuesto para consultas comunes (grupo + activo + orden)
CREATE INDEX IF NOT EXISTS idx_landing_sliders_group_active_order 
    ON commerce.landing_sliders(business_group_id, is_active, display_order) 
    WHERE business_group_id IS NOT NULL AND is_active = TRUE;

-- Índice compuesto para consultas comunes (sucursal + activo + orden)
CREATE INDEX IF NOT EXISTS idx_landing_sliders_branch_active_order 
    ON commerce.landing_sliders(business_id, is_active, display_order) 
    WHERE business_id IS NOT NULL AND is_active = TRUE;

-- ----------------------------------------------------------------------------
-- TRIGGER: update_landing_slider_updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION commerce.update_landing_slider_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION commerce.update_landing_slider_updated_at IS 'Actualiza automáticamente el campo updated_at de commerce.landing_sliders.';

DROP TRIGGER IF EXISTS update_landing_slider_updated_at ON commerce.landing_sliders;
CREATE TRIGGER update_landing_slider_updated_at
BEFORE UPDATE ON commerce.landing_sliders
FOR EACH ROW
EXECUTE FUNCTION commerce.update_landing_slider_updated_at();

-- ----------------------------------------------------------------------------
-- FUNCIÓN: get_landing_sliders_by_context
-- ----------------------------------------------------------------------------
-- Obtiene los sliders activos para un grupo o sucursal, ordenados por display_order
--
CREATE OR REPLACE FUNCTION commerce.get_landing_sliders_by_context(
    p_business_group_id UUID DEFAULT NULL,
    p_business_id UUID DEFAULT NULL,
    p_only_active BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
    id UUID,
    business_group_id UUID,
    business_id UUID,
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
        (p_business_group_id IS NULL OR ls.business_group_id = p_business_group_id)
        AND (p_business_id IS NULL OR ls.business_id = p_business_id)
        AND (NOT p_only_active OR ls.is_active = TRUE)
        AND (ls.start_date IS NULL OR ls.start_date <= CURRENT_TIMESTAMP)
        AND (ls.end_date IS NULL OR ls.end_date >= CURRENT_TIMESTAMP)
    ORDER BY ls.display_order ASC, ls.created_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION commerce.get_landing_sliders_by_context IS 'Obtiene los sliders activos para un grupo o sucursal, ordenados por display_order.';

-- ============================================================================
-- RESUMEN DE CAMBIOS
-- ============================================================================
-- ✅ Creada tabla commerce.landing_sliders
-- ✅ Agregados índices para optimización
-- ✅ Creado trigger para updated_at
-- ✅ Creada función get_landing_sliders_by_context
-- ✅ Constraint para asegurar que solo grupo O sucursal esté presente

