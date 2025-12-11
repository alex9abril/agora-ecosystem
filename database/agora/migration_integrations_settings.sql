-- ============================================================================
-- AGORA ECOSYSTEM - Migración: Sistema de Integraciones a Terceros
-- ============================================================================
-- Descripción: Crea configuraciones para métodos de pago y proveedores de logística
--              con soporte para modo desarrollo y producción
-- 
-- Uso: Ejecutar después de migration_site_settings.sql
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2025-12-10
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- 1. CONFIGURACIÓN GLOBAL: MODO DESARROLLO/PRODUCCIÓN
-- ============================================================================

-- Toggle global para modo desarrollo
INSERT INTO catalog.site_settings (key, value, category, label, description, help_text, value_type, validation, display_order, is_active)
VALUES
    (
        'integrations.dev_mode',
        'true'::jsonb,
        'integrations',
        'Modo Desarrollo',
        'Activa el modo desarrollo para todas las integraciones. Cuando está activado, todos los métodos de pago y proveedores de logística usarán sus endpoints y credenciales de desarrollo.',
        'En modo desarrollo, todas las transacciones se procesan en los ambientes de prueba de cada proveedor. Desactiva esta opción solo cuando estés listo para procesar transacciones reales.',
        'boolean',
        NULL,
        1,
        TRUE
    )
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value, -- importante: actualizar el valor para precargar credenciales dev
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    help_text = EXCLUDED.help_text,
    value_type = EXCLUDED.value_type,
    validation = EXCLUDED.validation,
    display_order = EXCLUDED.display_order,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- 2. MÉTODOS DE PAGO: KARLOPAY
-- ============================================================================

INSERT INTO catalog.site_settings (key, value, category, label, description, help_text, value_type, validation, display_order, is_active)
VALUES
    (
        'integrations.payments.karlopay.enabled',
        'false'::jsonb,
        'integrations',
        'Habilitar Karlopay',
        'Activa o desactiva el método de pago Karlopay.',
        'Cuando está activado, los clientes podrán pagar usando Karlopay en el checkout.',
        'boolean',
        NULL,
        10,
        TRUE
    ),
    (
        'integrations.payments.karlopay.dev.domain',
        '"https://backend-staging.karlopay.com"'::jsonb,
        'integrations',
        'Karlopay - Dominio (Desarrollo)',
        'Dominio base de Karlopay en ambiente de desarrollo/staging.',
        'Proporcionado por Karlopay: https://backend-staging.karlopay.com',
        'string',
        NULL,
        11,
        TRUE
    ),
    (
        'integrations.payments.karlopay.dev.login_endpoint',
        '"https://backend-staging.karlopay.com/api/auth/login"'::jsonb,
        'integrations',
        'Karlopay - Endpoint Login (Desarrollo)',
        'Endpoint de login de Karlopay para el ambiente de desarrollo/staging.',
        'Proporcionado por Karlopay: https://backend-staging.karlopay.com/api/auth/login',
        'string',
        NULL,
        12,
        TRUE
    ),
    (
        'integrations.payments.karlopay.dev.orders_endpoint',
        '"https://backend-staging.karlopay.com/api/orders/create-or-update"'::jsonb,
        'integrations',
        'Karlopay - Endpoint Órdenes (Desarrollo)',
        'Endpoint para crear/actualizar órdenes en Karlopay (desarrollo/staging).',
        'Proporcionado por Karlopay: https://backend-staging.karlopay.com/api/orders/create-or-update',
        'string',
        NULL,
        13,
        TRUE
    ),
    (
        'integrations.payments.karlopay.dev.auth_email',
        '"ecommerce.agora+stg@karlo.io"'::jsonb,
        'integrations',
        'Karlopay - Email Auth (Desarrollo)',
        'Email de autenticación para el ambiente de desarrollo/staging.',
        'Proporcionado por Karlopay',
        'string',
        NULL,
        14,
        TRUE
    ),
    (
        'integrations.payments.karlopay.dev.auth_password',
        '"XSy3EZW%yF0"'::jsonb,
        'integrations',
        'Karlopay - Password Auth (Desarrollo)',
        'Password de autenticación para el ambiente de desarrollo/staging.',
        'Proporcionado por Karlopay',
        'string',
        NULL,
        15,
        TRUE
    ),
    (
        'integrations.payments.karlopay.prod.domain',
        '"https://api.karlopay.com"'::jsonb,
        'integrations',
        'Karlopay - Dominio (Producción)',
        'Dominio base de Karlopay en producción.',
        'Proporcionado por Karlopay: https://api.karlopay.com',
        'string',
        NULL,
        16,
        TRUE
    ),
    (
        'integrations.payments.karlopay.prod.login_endpoint',
        '""'::jsonb,
        'integrations',
        'Karlopay - Endpoint Login (Producción)',
        'Endpoint de login para obtener token en producción.',
        'Solicita a Karlopay el endpoint productivo.',
        'string',
        NULL,
        17,
        TRUE
    ),
    (
        'integrations.payments.karlopay.prod.orders_endpoint',
        '""'::jsonb,
        'integrations',
        'Karlopay - Endpoint Órdenes (Producción)',
        'Endpoint para crear/actualizar órdenes en producción.',
        'Solicita a Karlopay el endpoint productivo.',
        'string',
        NULL,
        18,
        TRUE
    ),
    (
        'integrations.payments.karlopay.prod.auth_email',
        '""'::jsonb,
        'integrations',
        'Karlopay - Email Auth (Producción)',
        'Email de autenticación en producción.',
        'Solicita a Karlopay las credenciales productivas.',
        'string',
        NULL,
        19,
        TRUE
    ),
    (
        'integrations.payments.karlopay.prod.auth_password',
        '""'::jsonb,
        'integrations',
        'Karlopay - Password Auth (Producción)',
        'Password de autenticación en producción.',
        'Solicita a Karlopay las credenciales productivas.',
        'string',
        NULL,
        20,
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
-- 3. MÉTODOS DE PAGO: MERCADO PAGO
-- ============================================================================

INSERT INTO catalog.site_settings (key, value, category, label, description, help_text, value_type, validation, display_order, is_active)
VALUES
    (
        'integrations.payments.mercadopago.enabled',
        'false'::jsonb,
        'integrations',
        'Habilitar Mercado Pago',
        'Activa o desactiva el método de pago Mercado Pago.',
        'Cuando está activado, los clientes podrán pagar usando Mercado Pago en el checkout.',
        'boolean',
        NULL,
        20,
        TRUE
    ),
    (
        'integrations.payments.mercadopago.dev.access_token',
        '""'::jsonb,
        'integrations',
        'Mercado Pago - Access Token (Desarrollo)',
        'Access Token de Mercado Pago para el ambiente de desarrollo (test).',
        'Obtén este token desde el dashboard de Mercado Pago en la sección de credenciales de prueba.',
        'string',
        NULL,
        21,
        TRUE
    ),
    (
        'integrations.payments.mercadopago.dev.public_key',
        '""'::jsonb,
        'integrations',
        'Mercado Pago - Public Key (Desarrollo)',
        'Public Key de Mercado Pago para el ambiente de desarrollo (test).',
        'Obtén esta clave pública desde el dashboard de Mercado Pago en la sección de credenciales de prueba.',
        'string',
        NULL,
        22,
        TRUE
    ),
    (
        'integrations.payments.mercadopago.dev.endpoint',
        '"https://api.mercadopago.com"'::jsonb,
        'integrations',
        'Mercado Pago - Endpoint (Desarrollo)',
        'URL del API de Mercado Pago para el ambiente de desarrollo.',
        'Endpoint base de la API de Mercado Pago. Usa el mismo endpoint para test y producción, pero con diferentes credenciales.',
        'string',
        NULL,
        23,
        TRUE
    ),
    (
        'integrations.payments.mercadopago.prod.access_token',
        '""'::jsonb,
        'integrations',
        'Mercado Pago - Access Token (Producción)',
        'Access Token de Mercado Pago para el ambiente de producción.',
        'Obtén este token desde el dashboard de Mercado Pago en la sección de credenciales de producción.',
        'string',
        NULL,
        24,
        TRUE
    ),
    (
        'integrations.payments.mercadopago.prod.public_key',
        '""'::jsonb,
        'integrations',
        'Mercado Pago - Public Key (Producción)',
        'Public Key de Mercado Pago para el ambiente de producción.',
        'Obtén esta clave pública desde el dashboard de Mercado Pago en la sección de credenciales de producción.',
        'string',
        NULL,
        25,
        TRUE
    ),
    (
        'integrations.payments.mercadopago.prod.endpoint',
        '"https://api.mercadopago.com"'::jsonb,
        'integrations',
        'Mercado Pago - Endpoint (Producción)',
        'URL del API de Mercado Pago para el ambiente de producción.',
        'Endpoint base de la API de Mercado Pago para producción.',
        'string',
        NULL,
        26,
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
-- 4. MÉTODOS DE PAGO: STRIPE
-- ============================================================================

INSERT INTO catalog.site_settings (key, value, category, label, description, help_text, value_type, validation, display_order, is_active)
VALUES
    (
        'integrations.payments.stripe.enabled',
        'false'::jsonb,
        'integrations',
        'Habilitar Stripe',
        'Activa o desactiva el método de pago Stripe.',
        'Cuando está activado, los clientes podrán pagar usando Stripe en el checkout.',
        'boolean',
        NULL,
        30,
        TRUE
    ),
    (
        'integrations.payments.stripe.dev.secret_key',
        '""'::jsonb,
        'integrations',
        'Stripe - Secret Key (Desarrollo)',
        'Secret Key de Stripe para el ambiente de desarrollo (test).',
        'Obtén esta clave desde el dashboard de Stripe en la sección de API Keys de prueba (test mode).',
        'string',
        NULL,
        31,
        TRUE
    ),
    (
        'integrations.payments.stripe.dev.publishable_key',
        '""'::jsonb,
        'integrations',
        'Stripe - Publishable Key (Desarrollo)',
        'Publishable Key de Stripe para el ambiente de desarrollo (test).',
        'Obtén esta clave pública desde el dashboard de Stripe en la sección de API Keys de prueba (test mode).',
        'string',
        NULL,
        32,
        TRUE
    ),
    (
        'integrations.payments.stripe.dev.webhook_secret',
        '""'::jsonb,
        'integrations',
        'Stripe - Webhook Secret (Desarrollo)',
        'Webhook Secret de Stripe para el ambiente de desarrollo.',
        'Obtén este secret desde el dashboard de Stripe en la sección de Webhooks de prueba.',
        'string',
        NULL,
        33,
        TRUE
    ),
    (
        'integrations.payments.stripe.dev.endpoint',
        '"https://api.stripe.com"'::jsonb,
        'integrations',
        'Stripe - Endpoint (Desarrollo)',
        'URL del API de Stripe para el ambiente de desarrollo.',
        'Endpoint base de la API de Stripe. Usa el mismo endpoint para test y producción, pero con diferentes credenciales.',
        'string',
        NULL,
        34,
        TRUE
    ),
    (
        'integrations.payments.stripe.prod.secret_key',
        '""'::jsonb,
        'integrations',
        'Stripe - Secret Key (Producción)',
        'Secret Key de Stripe para el ambiente de producción.',
        'Obtén esta clave desde el dashboard de Stripe en la sección de API Keys de producción (live mode).',
        'string',
        NULL,
        35,
        TRUE
    ),
    (
        'integrations.payments.stripe.prod.publishable_key',
        '""'::jsonb,
        'integrations',
        'Stripe - Publishable Key (Producción)',
        'Publishable Key de Stripe para el ambiente de producción.',
        'Obtén esta clave pública desde el dashboard de Stripe en la sección de API Keys de producción (live mode).',
        'string',
        NULL,
        36,
        TRUE
    ),
    (
        'integrations.payments.stripe.prod.webhook_secret',
        '""'::jsonb,
        'integrations',
        'Stripe - Webhook Secret (Producción)',
        'Webhook Secret de Stripe para el ambiente de producción.',
        'Obtén este secret desde el dashboard de Stripe en la sección de Webhooks de producción.',
        'string',
        NULL,
        37,
        TRUE
    ),
    (
        'integrations.payments.stripe.prod.endpoint',
        '"https://api.stripe.com"'::jsonb,
        'integrations',
        'Stripe - Endpoint (Producción)',
        'URL del API de Stripe para el ambiente de producción.',
        'Endpoint base de la API de Stripe para producción.',
        'string',
        NULL,
        38,
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
-- 5. PROVEEDORES DE LOGÍSTICA (ESTRUCTURA BASE)
-- ============================================================================
-- Nota: Se pueden agregar más proveedores según se necesiten

INSERT INTO catalog.site_settings (key, value, category, label, description, help_text, value_type, validation, display_order, is_active)
VALUES
    (
        'integrations.logistics.enabled',
        'false'::jsonb,
        'integrations',
        'Habilitar Integraciones de Logística',
        'Activa o desactiva las integraciones con proveedores de logística.',
        'Cuando está activado, el sistema podrá integrarse con proveedores de logística para gestionar envíos y entregas.',
        'boolean',
        NULL,
        50,
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

-- Verificar configuraciones de integraciones creadas
SELECT 
    category,
    key,
    label,
    value_type,
    display_order,
    is_active
FROM catalog.site_settings
WHERE category = 'integrations'
  AND is_active = TRUE
ORDER BY display_order, key;

-- Contar configuraciones por tipo
SELECT 
    CASE 
        WHEN key LIKE 'integrations.dev_mode' THEN 'Configuración Global'
        WHEN key LIKE 'integrations.payments.%' THEN 'Métodos de Pago'
        WHEN key LIKE 'integrations.logistics.%' THEN 'Logística'
        ELSE 'Otro'
    END as tipo,
    COUNT(*) as total
FROM catalog.site_settings
WHERE category = 'integrations'
  AND is_active = TRUE
GROUP BY 
    CASE 
        WHEN key LIKE 'integrations.dev_mode' THEN 'Configuración Global'
        WHEN key LIKE 'integrations.payments.%' THEN 'Métodos de Pago'
        WHEN key LIKE 'integrations.logistics.%' THEN 'Logística'
        ELSE 'Otro'
    END
ORDER BY tipo;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

