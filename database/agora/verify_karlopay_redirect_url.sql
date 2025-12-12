-- ============================================================================
-- AGORA ECOSYSTEM - Verificar campos Redirect URL de Karlopay
-- ============================================================================
-- Descripción: Verifica que los campos redirect_url estén correctamente
--              configurados en la base de datos
-- ============================================================================

SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- Verificar que los campos redirect_url existen
SELECT 
    key,
    label,
    value,
    category,
    display_order,
    is_active,
    created_at,
    updated_at
FROM catalog.site_settings
WHERE key LIKE 'integrations.payments.karlopay.%redirect_url%'
ORDER BY key;

-- Verificar el orden de visualización de todos los campos de Karlopay
SELECT 
    key,
    label,
    display_order,
    is_active
FROM catalog.site_settings
WHERE key LIKE 'integrations.payments.karlopay.%'
ORDER BY display_order, key;

-- Contar total de settings de Karlopay
SELECT 
    COUNT(*) as total_settings,
    COUNT(CASE WHEN key LIKE '%redirect_url%' THEN 1 END) as redirect_url_count
FROM catalog.site_settings
WHERE key LIKE 'integrations.payments.karlopay.%';

