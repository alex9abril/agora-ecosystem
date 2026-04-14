-- ============================================================================
-- AGORA ECOSYSTEM - Verify: Template password_recovery
-- ============================================================================
-- Descripción: Comprueba que exista el template global y que la función
--              communication.get_email_template lo resuelva sin business_id.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-04-14
-- Hora: 15:00:00
-- ============================================================================

SET search_path = communication, core, public;

-- Fila en tabla global
SELECT id, trigger_type, name, is_active, LENGTH(template_html) AS html_len
FROM communication.email_templates
WHERE trigger_type = 'password_recovery';

-- Misma ruta que usa el backend (Nest EmailService)
SELECT level, subject, LENGTH(template_html) AS html_len
FROM communication.get_email_template('password_recovery', NULL, NULL);

-- ============================================================================
-- NOTAS
-- ============================================================================
-- - Si la segunda consulta no devuelve filas, el correo de recuperación no se enviará.
-- - Ejecutar después de scripts/010_upsert_password_recovery_email_template.sql
-- ============================================================================
