-- ============================================================================
-- VERIFICACIÓN: Configuraciones de Skydropx
-- ============================================================================
-- Script para verificar que todas las configuraciones de Skydropx estén presentes
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- Verificar configuraciones de Skydropx
SELECT 
    key,
    label,
    value,
    value_type,
    is_active,
    display_order
FROM catalog.site_settings
WHERE key LIKE 'integrations.logistics.skydropx%'
ORDER BY display_order, key;

-- Verificar específicamente las configuraciones requeridas
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM catalog.site_settings WHERE key = 'integrations.logistics.skydropx.enabled') 
        THEN '✓ Existe' 
        ELSE '✗ FALTA' 
    END as enabled,
    CASE 
        WHEN EXISTS (SELECT 1 FROM catalog.site_settings WHERE key = 'integrations.logistics.skydropx.dev.endpoint') 
        THEN '✓ Existe' 
        ELSE '✗ FALTA' 
    END as dev_endpoint,
    CASE 
        WHEN EXISTS (SELECT 1 FROM catalog.site_settings WHERE key = 'integrations.logistics.skydropx.dev.quotations_endpoint') 
        THEN '✓ Existe' 
        ELSE '✗ FALTA' 
    END as dev_quotations_endpoint,
    CASE 
        WHEN EXISTS (SELECT 1 FROM catalog.site_settings WHERE key = 'integrations.logistics.skydropx.prod.endpoint') 
        THEN '✓ Existe' 
        ELSE '✗ FALTA' 
    END as prod_endpoint,
    CASE 
        WHEN EXISTS (SELECT 1 FROM catalog.site_settings WHERE key = 'integrations.logistics.skydropx.prod.quotations_endpoint') 
        THEN '✓ Existe' 
        ELSE '✗ FALTA' 
    END as prod_quotations_endpoint;

