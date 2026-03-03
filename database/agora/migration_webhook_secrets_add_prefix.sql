-- ============================================================================
-- [AGORA] - Migration: secret_prefix en core.webhook_secrets
-- ============================================================================
-- Descripción: Añade la columna secret_prefix para mostrar en listado los
--              primeros caracteres de la clave (ej. ago_secret_xxxxxxxx);
--              el secret completo sigue guardado en secret con prefijo ago_secret_.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-03-03
-- Hora: 12:00:00
-- ============================================================================

SET search_path TO core, public;

-- ----------------------------------------------------------------------------
-- Añadir columna secret_prefix (primeros 24 caracteres del secret, solo para listado)
-- ----------------------------------------------------------------------------
ALTER TABLE core.webhook_secrets
  ADD COLUMN IF NOT EXISTS secret_prefix VARCHAR(32);

COMMENT ON COLUMN core.webhook_secrets.secret_prefix IS 'Primeros caracteres del secret para mostrar en listado (no expone el valor completo).';

-- Rellenar para filas existentes: primeros 24 chars del secret, o placeholder
UPDATE core.webhook_secrets
SET secret_prefix = CASE
  WHEN LENGTH(secret) >= 24 THEN LEFT(secret, 24)
  ELSE secret || REPEAT('•', 24 - LENGTH(secret))
END
WHERE secret_prefix IS NULL;

-- ============================================================================
-- NOTAS
-- ============================================================================
-- - El secret completo (con prefijo ago_secret_) se guarda en secret.
-- - secret_prefix permite en la UI mostrar "ago_secret_xxxx••••••••" con ojito y copy.
-- - Ejecución: el usuario debe correr este script en la base de datos.
-- ============================================================================
