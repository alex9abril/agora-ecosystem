-- ============================================================================
-- AGORA ECOSYSTEM - Confirm email: dalton@agoramp.mx
-- ============================================================================
-- Descripción:
-- Confirma manualmente el correo del usuario auth.users con id
-- 620edb17-63ce-45c3-aba8-ac5c24dfa960 (dalton@agoramp.mx).
-- Actualiza email_confirmed_at y marca email_verified en raw_user_meta_data.
-- Nota: confirmed_at es columna generada; no se actualiza directamente.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-08-14
-- Hora: 17:33:00
-- ============================================================================

SET search_path TO auth, public;

UPDATE auth.users
SET
  email_confirmed_at = COALESCE(email_confirmed_at, CURRENT_TIMESTAMP),
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object('email_verified', true),
  updated_at = CURRENT_TIMESTAMP
WHERE id = '620edb17-63ce-45c3-aba8-ac5c24dfa960'
  AND email = 'dalton@agoramp.mx';

-- Verificación
SELECT
  id,
  email,
  email_confirmed_at,
  confirmed_at,
  raw_user_meta_data ->> 'email_verified' AS email_verified,
  updated_at
FROM auth.users
WHERE id = '620edb17-63ce-45c3-aba8-ac5c24dfa960';

-- ============================================================================
-- NOTAS:
-- - Ejecutado a petición para desbloquear login sin link de confirmación.
-- - Si email_confirmed_at ya existía, COALESCE lo conserva.
-- - No modifica password ni roles.
-- ============================================================================
