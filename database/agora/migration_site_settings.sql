-- ============================================================================
-- AGORA ECOSYSTEM - Migración: Sistema de Configuraciones del Sitio
-- ============================================================================
-- Descripción: Crea un sistema genérico y extensible de configuraciones del sitio
--              que permite gestionar diferentes aspectos de la aplicación,
--              incluyendo configuración de impuestos, preferencias, etc.
-- 
-- Uso: Ejecutar después de migration_vehicle_compatibility.sql
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2025-12-02
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- 1. TABLA: CONFIGURACIONES DEL SITIO (GENÉRICA Y EXTENSIBLE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS catalog.site_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Clave única de la configuración
    key VARCHAR(100) NOT NULL UNIQUE, -- Ej: "taxes.included_in_price", "storefront.currency"
    
    -- Valor de la configuración (JSONB para flexibilidad)
    value JSONB NOT NULL, -- Puede ser string, number, boolean, object, array
    
    -- Categoría de la configuración (para agrupar en la UI)
    category VARCHAR(50) NOT NULL, -- Ej: "taxes", "storefront", "delivery", "notifications"
    
    -- Información descriptiva
    label VARCHAR(200) NOT NULL, -- Etiqueta para mostrar en la UI
    description TEXT, -- Descripción detallada de qué hace esta configuración
    help_text TEXT, -- Texto de ayuda adicional para el usuario
    
    -- Tipo de valor (para validación y UI)
    value_type VARCHAR(20) NOT NULL DEFAULT 'string', -- 'string', 'number', 'boolean', 'object', 'array'
    
    -- Validación (opcional, JSONB con reglas)
    validation JSONB, -- Ej: {"min": 0, "max": 100} para números, {"options": ["option1", "option2"]} para select
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Orden de visualización
    display_order INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_site_settings_key ON catalog.site_settings(key);
CREATE INDEX IF NOT EXISTS idx_site_settings_category ON catalog.site_settings(category);
CREATE INDEX IF NOT EXISTS idx_site_settings_is_active ON catalog.site_settings(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_site_settings_display_order ON catalog.site_settings(category, display_order);

COMMENT ON TABLE catalog.site_settings IS 'Configuraciones genéricas del sitio (extensible para diferentes aspectos)';
COMMENT ON COLUMN catalog.site_settings.key IS 'Clave única de la configuración (formato: categoria.subclave)';
COMMENT ON COLUMN catalog.site_settings.value IS 'Valor de la configuración en formato JSONB (flexible para cualquier tipo)';
COMMENT ON COLUMN catalog.site_settings.category IS 'Categoría para agrupar configuraciones en la UI';
COMMENT ON COLUMN catalog.site_settings.value_type IS 'Tipo de valor para validación y renderizado en UI';

-- ============================================================================
-- 2. TRIGGER: ACTUALIZAR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION catalog.update_site_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_site_settings_updated_at
    BEFORE UPDATE ON catalog.site_settings
    FOR EACH ROW
    EXECUTE FUNCTION catalog.update_site_settings_updated_at();

-- ============================================================================
-- 3. FUNCIONES ÚTILES
-- ============================================================================

-- Función: Obtener configuración por clave
CREATE OR REPLACE FUNCTION catalog.get_site_setting(
    p_key VARCHAR(100)
)
RETURNS JSONB AS $$
DECLARE
    v_value JSONB;
BEGIN
    SELECT value INTO v_value
    FROM catalog.site_settings
    WHERE key = p_key
      AND is_active = TRUE;
    
    RETURN v_value;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION catalog.get_site_setting IS 'Obtiene el valor de una configuración por su clave';

-- Función: Establecer configuración
CREATE OR REPLACE FUNCTION catalog.set_site_setting(
    p_key VARCHAR(100),
    p_value JSONB,
    p_category VARCHAR(50) DEFAULT NULL,
    p_label VARCHAR(200) DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO catalog.site_settings (key, value, category, label, description)
    VALUES (p_key, p_value, 
            COALESCE(p_category, SPLIT_PART(p_key, '.', 1)),
            COALESCE(p_label, p_key),
            p_description)
    ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = CURRENT_TIMESTAMP
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION catalog.set_site_setting IS 'Establece o actualiza una configuración';

-- ============================================================================
-- 4. DATOS INICIALES: CONFIGURACIÓN DE IMPUESTOS
-- ============================================================================

-- Configuración: ¿Los impuestos están incluidos en el precio?
INSERT INTO catalog.site_settings (key, value, category, label, description, help_text, value_type, validation, display_order, is_active)
VALUES
    (
        'taxes.included_in_price',
        'false'::jsonb,
        'taxes',
        'Impuestos Incluidos en Precio',
        'Define si los impuestos ya están incluidos en el precio base de los productos o si se deben agregar al precio mostrado.',
        'Si está activado, el precio mostrado en el storefront ya incluye los impuestos. Si está desactivado, los impuestos se calcularán y agregarán al precio base al momento de mostrar el producto.',
        'boolean',
        NULL,
        1,
        TRUE
    ),
    (
        'taxes.display_tax_breakdown',
        'true'::jsonb,
        'taxes',
        'Mostrar Desglose de Impuestos',
        'Define si se debe mostrar el desglose detallado de impuestos en el storefront.',
        'Cuando está activado, los clientes verán un desglose de cada impuesto aplicado (IVA, IEPS, etc.) en lugar de solo el total.',
        'boolean',
        NULL,
        2,
        TRUE
    ),
    (
        'taxes.show_tax_included_label',
        'true'::jsonb,
        'taxes',
        'Mostrar Etiqueta "Impuestos Incluidos"',
        'Define si se debe mostrar una etiqueta indicando que los impuestos están incluidos en el precio.',
        'Cuando está activado y "Impuestos Incluidos en Precio" también está activado, se mostrará una etiqueta como "Precio con impuestos incluidos" en el storefront.',
        'boolean',
        NULL,
        3,
        TRUE
    )
ON CONFLICT (key) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    help_text = EXCLUDED.help_text,
    value_type = EXCLUDED.value_type,
    validation = EXCLUDED.validation,
    display_order = EXCLUDED.display_order,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- 5. DATOS INICIALES: OTRAS CONFIGURACIONES (EJEMPLOS)
-- ============================================================================

-- Configuración: Moneda
INSERT INTO catalog.site_settings (key, value, category, label, description, help_text, value_type, validation, display_order, is_active)
VALUES
    (
        'storefront.currency',
        '"MXN"'::jsonb,
        'storefront',
        'Moneda',
        'Moneda principal del storefront.',
        'Código de moneda ISO 4217 (MXN para pesos mexicanos, USD para dólares, etc.)',
        'string',
        '{"options": ["MXN", "USD", "EUR"]}'::jsonb,
        1,
        TRUE
    ),
    (
        'storefront.currency_symbol',
        '"$"'::jsonb,
        'storefront',
        'Símbolo de Moneda',
        'Símbolo que se mostrará antes del precio.',
        'Símbolo de moneda (ej: $, €, £). Se mostrará antes del precio en el storefront.',
        'string',
        NULL,
        2,
        TRUE
    )
ON CONFLICT (key) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    help_text = EXCLUDED.help_text,
    value_type = EXCLUDED.value_type,
    validation = EXCLUDED.validation,
    display_order = EXCLUDED.display_order,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar configuraciones creadas
SELECT 
    category,
    key,
    label,
    value_type,
    value,
    display_order
FROM catalog.site_settings
WHERE is_active = TRUE
ORDER BY category, display_order, key;

-- Contar configuraciones por categoría
SELECT 
    category,
    COUNT(*) as total
FROM catalog.site_settings
WHERE is_active = TRUE
GROUP BY category
ORDER BY category;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================



