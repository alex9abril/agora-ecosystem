-- ============================================================================
-- AGORA ECOSYSTEM - Nota: Webhook Skydropx y core.webhook_secrets
-- ============================================================================
-- Descripción: No altera el esquema. La tabla core.webhook_secrets ya admite
--              cualquier valor en `provider`. Para el webhook
--              POST /api/logistics/skydropx/webhook el backend lee todas las
--              filas activas con provider = 'skydropx' y valida Bearer o HMAC
--              (SHA-512 del body crudo). Alternativa local: variables
--              SKYDROPPX_WEBHOOK_HMAC_SECRET / SKYDROPPX_WEBHOOK_BEARER.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-03-31
-- Hora: 14:00:00
-- ============================================================================

SET search_path TO core, public;

COMMENT ON COLUMN core.webhook_secrets.provider IS
  'Proveedor del webhook: karlopay, integration_cart, skydropx, etc. Skydropx: mismo valor secreto en BD que configuras en el panel Skydropx (Bearer o clave HMAC según modo).';

-- ============================================================================
-- EJEMPLO (ejecutar manualmente con UUID y secret deseados; o usar API admin)
-- ============================================================================
-- INSERT INTO core.webhook_secrets (name, secret, provider, is_active, expires_at)
-- VALUES (
--   'Skydropx webhook producción',
--   'pegar_aqui_el_token_o_secreto_compartido_con_skydropx',
--   'skydropx',
--   true,
--   NULL
-- );

-- ============================================================================
-- NOTAS
-- ============================================================================
-- - Crear clave vía API (JWT admin): POST /api/settings/webhook-secrets?provider=skydropx
-- - El servicio genera formato ago_secret_...; si Skydropx exige otro formato,
--   puede insertarse el valor exacto por SQL en Supabase.
-- ============================================================================
