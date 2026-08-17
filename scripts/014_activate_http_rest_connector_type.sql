-- ============================================================================
-- AGORA ECOSYSTEM - Activate: HTTP/REST connector type
-- ============================================================================
-- Descripción:
-- Activa integration.connector_types.id = 'http_rest' (antes planned)
-- para permitir crear conectores API con header de autenticación
-- (ej. Ocp-Apim-Subscription-Key) y health check desde el backend.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-08-14
-- Hora: 17:50:00
-- ============================================================================

SET search_path TO integration, public;

INSERT INTO integration.connector_types (id, label, implementation_status, sort_order, metadata)
VALUES (
  'http_rest',
  'HTTP / REST',
  'active',
  2,
  $${"icon":"globe","doc":"Llamadas HTTP con URL base, header de API key y ruta de health check."}$$::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  implementation_status = 'active',
  sort_order = EXCLUDED.sort_order,
  metadata = EXCLUDED.metadata,
  updated_at = CURRENT_TIMESTAMP;

-- Verificación
SELECT id, label, implementation_status, sort_order
FROM integration.connector_types
ORDER BY sort_order, id;

-- ============================================================================
-- NOTAS:
-- - El secreto (API key) se cifra en connectors.password_ciphertext.
-- - config esperado: baseUrl, authHeaderName, healthPath, healthMethod.
-- ============================================================================
