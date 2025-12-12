-- ============================================================================
-- AGORA ECOSYSTEM - Agregar campo Redirect URL para Karlopay
-- ============================================================================
-- Descripción: Agrega el campo redirect_url para dev y prod de Karlopay
--              sin modificar los campos existentes
-- 
-- Uso: Ejecutar después de migration_integrations_settings.sql
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- AGREGAR REDIRECT URL PARA KARLOPAY (DEV Y PROD)
-- ============================================================================

-- Redirect URL para Desarrollo
INSERT INTO catalog.site_settings (key, value, category, label, description, help_text, value_type, validation, display_order, is_active)
VALUES
    (
        'integrations.payments.karlopay.dev.redirect_url',
        '"http://localhost:8000{tienda}/karlopay-redirect?session_id={session_id}"'::jsonb,
        'integrations',
        'Karlopay - Redirect URL (Desarrollo)',
        'URL base de redirección después del pago en desarrollo. Placeholders disponibles: {tienda} (ruta de la tienda/grupo), {session_id} (ID de sesión de pago).',
        'Ejemplos: http://localhost:8000{tienda}/karlopay-redirect?session_id={session_id} o http://localhost:8000/grupo/toyota-group/karlopay-redirect?session_id={session_id}',
        'string',
        NULL,
        16,
        TRUE
    )
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    help_text = EXCLUDED.help_text,
    updated_at = CURRENT_TIMESTAMP;

-- Redirect URL para Producción
INSERT INTO catalog.site_settings (key, value, category, label, description, help_text, value_type, validation, display_order, is_active)
VALUES
    (
        'integrations.payments.karlopay.prod.redirect_url',
        '"https://agoramp.com{tienda}/karlopay-redirect?session_id={session_id}"'::jsonb,
        'integrations',
        'Karlopay - Redirect URL (Producción)',
        'URL base de redirección después del pago en producción. Placeholders disponibles: {tienda} (ruta de la tienda/grupo), {session_id} (ID de sesión de pago).',
        'Ejemplos: https://agoramp.com{tienda}/karlopay-redirect?session_id={session_id} o https://agoramp.com/grupo/toyota-group/karlopay-redirect?session_id={session_id}',
        'string',
        NULL,
        21,
        TRUE
    )
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    help_text = EXCLUDED.help_text,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar que los campos se agregaron correctamente
SELECT 
    key,
    label,
    value,
    display_order
FROM catalog.site_settings
WHERE key LIKE 'integrations.payments.karlopay.%redirect_url%'
ORDER BY key;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================



