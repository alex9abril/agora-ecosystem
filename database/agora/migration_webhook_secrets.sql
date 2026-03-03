-- ============================================================================
-- [AGORA] - Migration: Tabla core.webhook_secrets para claves de webhook
-- ============================================================================
-- Descripción: Crea la tabla para almacenar claves secretas que validan
--              webhooks (p. ej. Karlopay). Permite nombre, expiración o sin
--              caducidad, y revocación sin borrar.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-03-02
-- Hora: 23:59:00
-- ============================================================================

SET search_path TO core, public;

-- ----------------------------------------------------------------------------
-- Tabla webhook_secrets
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS core.webhook_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  secret TEXT NOT NULL,
  provider VARCHAR(50) DEFAULT 'karlopay',
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE core.webhook_secrets IS 'Claves secretas para validar firmas de webhooks (p. ej. Karlopay). El valor secret solo se devuelve una vez al crear.';
COMMENT ON COLUMN core.webhook_secrets.name IS 'Nombre descriptivo de la clave (ej. Karlopay producción)';
COMMENT ON COLUMN core.webhook_secrets.secret IS 'Valor del secret (HMAC). No exponer en listados ni GET.';
COMMENT ON COLUMN core.webhook_secrets.provider IS 'Proveedor del webhook: karlopay, etc.';
COMMENT ON COLUMN core.webhook_secrets.expires_at IS 'NULL = no caduca; si tiene valor, el guard solo la usa mientras expires_at > NOW()';
COMMENT ON COLUMN core.webhook_secrets.is_active IS 'Revocación sin borrar: false = no se usa para validar';

-- Índices
CREATE INDEX IF NOT EXISTS idx_webhook_secrets_active_expires
  ON core.webhook_secrets(is_active, expires_at)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_webhook_secrets_provider
  ON core.webhook_secrets(provider);

-- Trigger updated_at (usa la función existente update_updated_at_column del schema public)
DROP TRIGGER IF EXISTS update_webhook_secrets_updated_at ON core.webhook_secrets;
CREATE TRIGGER update_webhook_secrets_updated_at
  BEFORE UPDATE ON core.webhook_secrets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- RLS: solo roles autorizados (backend / admin)
-- ----------------------------------------------------------------------------
ALTER TABLE core.webhook_secrets ENABLE ROW LEVEL SECURITY;

-- Política: permitir SELECT a authenticated (API desde web-admin con JWT) y a postgres (backend con pool)
DROP POLICY IF EXISTS webhook_secrets_select_policy ON core.webhook_secrets;
CREATE POLICY webhook_secrets_select_policy ON core.webhook_secrets
  FOR SELECT USING (true);

-- Política: permitir INSERT/UPDATE solo a authenticated (crear/revocar desde web-admin)
DROP POLICY IF EXISTS webhook_secrets_insert_policy ON core.webhook_secrets;
CREATE POLICY webhook_secrets_insert_policy ON core.webhook_secrets
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS webhook_secrets_update_policy ON core.webhook_secrets;
CREATE POLICY webhook_secrets_update_policy ON core.webhook_secrets
  FOR UPDATE USING (true);

-- Grants: solo roles que usa el backend / API (no anon)
GRANT SELECT, INSERT, UPDATE ON core.webhook_secrets TO authenticated;
GRANT SELECT, INSERT, UPDATE ON core.webhook_secrets TO service_role;

-- ============================================================================
-- NOTAS
-- ============================================================================
-- - El backend necesita leer secret para validar el webhook; usa conexión con
--   rol que tenga SELECT (p. ej. service_role o postgres). Conceder también a
--   ese rol si no es service_role.
-- - En listados y GET nunca se debe devolver la columna secret.
-- - La tabla no está concedida a anon; solo authenticated y service_role.
-- - Ejecución: el usuario debe correr este script en la base de datos.
-- ============================================================================
