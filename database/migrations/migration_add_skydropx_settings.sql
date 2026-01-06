-- ============================================================================
-- MIGRACIÓN: Configuración de Skydropx
-- ============================================================================
-- Descripción: Agrega las configuraciones necesarias para integrar Skydropx
--              como proveedor de logística
-- 
-- Fecha: 2025-01-XX
-- Versión: 1.0
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- 1. CONFIGURACIÓN DE SKYDROPX
-- ============================================================================
-- NOTA: Este script usa ON CONFLICT DO UPDATE, por lo que:
-- - Si la configuración ya existe, la actualiza (preserva el ID y otros campos)
-- - Si no existe, la crea
-- - Es seguro ejecutarlo múltiples veces (idempotente)
-- - NO borra configuraciones existentes, solo las actualiza
-- ============================================================================

INSERT INTO catalog.site_settings (key, value, category, label, description, help_text, value_type, validation, display_order, is_active)
VALUES
    (
        'integrations.logistics.skydropx.enabled',
        'false'::jsonb,
        'integrations',
        'Habilitar Skydropx',
        'Activa o desactiva el proveedor de logística Skydropx.',
        'Cuando está activado, el sistema podrá calcular cotizaciones y crear envíos usando Skydropx.',
        'boolean',
        NULL,
        51,
        TRUE
    ),
    (
        'integrations.logistics.skydropx.dev.endpoint',
        '"https://pro.skydropx.com/api/v1"'::jsonb,
        'integrations',
        'Skydropx - Endpoint Base (Desarrollo)',
        'Endpoint base de la API de Skydropx para el ambiente de desarrollo. Se usa para operaciones generales (shipments, tracking, etc.).',
        'Endpoint base: https://pro.skydropx.com/api/v1',
        'string',
        NULL,
        52,
        TRUE
    ),
    (
        'integrations.logistics.skydropx.dev.quotations_endpoint',
        '"https://pro.skydropx.com/api/v1"'::jsonb,
        'integrations',
        'Skydropx - Endpoint Cotizaciones (Desarrollo)',
        'Endpoint específico para cotizaciones en el ambiente de desarrollo. Puede ser el mismo que el endpoint base o un endpoint propio para procesar cotizaciones.',
        'Endpoint para quotations. Por defecto: https://pro.skydropx.com/api/v1. En el futuro puede ser un endpoint propio que procese las cotizaciones antes de llamar a Skydropx.',
        'string',
        NULL,
        53,
        TRUE
    ),
    (
        'integrations.logistics.skydropx.prod.endpoint',
        '"https://pro.skydropx.com/api/v1"'::jsonb,
        'integrations',
        'Skydropx - Endpoint Base (Producción)',
        'Endpoint base de la API de Skydropx para el ambiente de producción. Se usa para operaciones generales (shipments, tracking, etc.).',
        'Endpoint base: https://pro.skydropx.com/api/v1',
        'string',
        NULL,
        54,
        TRUE
    ),
    (
        'integrations.logistics.skydropx.prod.quotations_endpoint',
        '"https://pro.skydropx.com/api/v1"'::jsonb,
        'integrations',
        'Skydropx - Endpoint Cotizaciones (Producción)',
        'Endpoint específico para cotizaciones en el ambiente de producción. Puede ser el mismo que el endpoint base o un endpoint propio para procesar cotizaciones.',
        'Endpoint para quotations. Por defecto: https://pro.skydropx.com/api/v1. En el futuro puede ser un endpoint propio que procese las cotizaciones antes de llamar a Skydropx.',
        'string',
        NULL,
        55,
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
-- NOTAS IMPORTANTES
-- ============================================================================
-- Las credenciales (API Key y Secret) se toman de las variables de entorno:
-- - SKYDROPPX_API_KEY
-- - SKYDROPPX_API_SECRET
-- 
-- Estas NO se almacenan en la base de datos por seguridad.
-- ============================================================================

