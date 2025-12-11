-- ============================================================================
-- Fix: Limpiar claves antiguas de Karlopay e insertar las nuevas claves
--       (dominio, login, órdenes, auth_email, auth_password) para dev y prod
-- ============================================================================

SET search_path TO core, catalog, public;

-- Eliminar claves antiguas que ya no se usan
DELETE FROM catalog.site_settings
WHERE key IN (
  'integrations.payments.karlopay.dev.api_key',
  'integrations.payments.karlopay.dev.api_secret',
  'integrations.payments.karlopay.dev.endpoint',
  'integrations.payments.karlopay.prod.api_key',
  'integrations.payments.karlopay.prod.api_secret',
  'integrations.payments.karlopay.prod.endpoint'
);

-- Insertar / actualizar claves nuevas para dev
INSERT INTO catalog.site_settings (key, value, category, label, description, help_text, value_type, validation, display_order, is_active)
VALUES
  ('integrations.payments.karlopay.dev.domain', '"https://backend-staging.karlopay.com"'::jsonb, 'integrations',
   'Karlopay - Dominio (Desarrollo)', 'Dominio base de Karlopay en ambiente de desarrollo/staging.',
   'Proporcionado por Karlopay: https://backend-staging.karlopay.com', 'string', NULL, 11, TRUE),
  ('integrations.payments.karlopay.dev.login_endpoint', '"https://backend-staging.karlopay.com/api/auth/login"'::jsonb, 'integrations',
   'Karlopay - Endpoint Login (Desarrollo)', 'Endpoint de login en desarrollo/staging.',
   'Proporcionado por Karlopay: https://backend-staging.karlopay.com/api/auth/login', 'string', NULL, 12, TRUE),
  ('integrations.payments.karlopay.dev.orders_endpoint', '"https://backend-staging.karlopay.com/api/orders/create-or-update"'::jsonb, 'integrations',
   'Karlopay - Endpoint Órdenes (Desarrollo)', 'Endpoint de órdenes en desarrollo/staging.',
   'Proporcionado por Karlopay: https://backend-staging.karlopay.com/api/orders/create-or-update', 'string', NULL, 13, TRUE),
  ('integrations.payments.karlopay.dev.auth_email', '"ecommerce.agora+stg@karlo.io"'::jsonb, 'integrations',
   'Karlopay - Email Auth (Desarrollo)', 'Email de autenticación en desarrollo/staging.',
   'Proporcionado por Karlopay', 'string', NULL, 14, TRUE),
  ('integrations.payments.karlopay.dev.auth_password', '"XSy3EZW%yF0"'::jsonb, 'integrations',
   'Karlopay - Password Auth (Desarrollo)', 'Password de autenticación en desarrollo/staging.',
   'Proporcionado por Karlopay', 'string', NULL, 15, TRUE)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  help_text = EXCLUDED.help_text,
  value_type = EXCLUDED.value_type,
  validation = EXCLUDED.validation,
  display_order = EXCLUDED.display_order,
  updated_at = CURRENT_TIMESTAMP;

-- Insertar / actualizar claves nuevas para prod (vacías para que las llenes)
INSERT INTO catalog.site_settings (key, value, category, label, description, help_text, value_type, validation, display_order, is_active)
VALUES
  ('integrations.payments.karlopay.prod.domain', '"https://api.karlopay.com"'::jsonb, 'integrations',
   'Karlopay - Dominio (Producción)', 'Dominio base de Karlopay en producción.',
   'Proporcionado por Karlopay: https://api.karlopay.com', 'string', NULL, 16, TRUE),
  ('integrations.payments.karlopay.prod.login_endpoint', '""'::jsonb, 'integrations',
   'Karlopay - Endpoint Login (Producción)', 'Endpoint de login en producción.',
   'Solicita a Karlopay el endpoint productivo.', 'string', NULL, 17, TRUE),
  ('integrations.payments.karlopay.prod.orders_endpoint', '""'::jsonb, 'integrations',
   'Karlopay - Endpoint Órdenes (Producción)', 'Endpoint de órdenes en producción.',
   'Solicita a Karlopay el endpoint productivo.', 'string', NULL, 18, TRUE),
  ('integrations.payments.karlopay.prod.auth_email', '""'::jsonb, 'integrations',
   'Karlopay - Email Auth (Producción)', 'Email de autenticación en producción.',
   'Solicita a Karlopay las credenciales productivas.', 'string', NULL, 19, TRUE),
  ('integrations.payments.karlopay.prod.auth_password', '""'::jsonb, 'integrations',
   'Karlopay - Password Auth (Producción)', 'Password de autenticación en producción.',
   'Solicita a Karlopay las credenciales productivas.', 'string', NULL, 20, TRUE)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  help_text = EXCLUDED.help_text,
  value_type = EXCLUDED.value_type,
  validation = EXCLUDED.validation,
  display_order = EXCLUDED.display_order,
  updated_at = CURRENT_TIMESTAMP;

-- Verificación rápida
SELECT key, value
FROM catalog.site_settings
WHERE key LIKE 'integrations.payments.karlopay.%'
ORDER BY key;


