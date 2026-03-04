-- ============================================================================
-- [AGORA] - Migration: Tabla core.user_connections (últimas conexiones)
-- ============================================================================
-- Descripción: Crea la tabla para registrar cada acceso del usuario al sitio
--              (web-local). Permite mostrar en "Mi perfil" las últimas
--              conexiones (fecha, IP, user agent). Cada fila es inmutable.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-03-02
-- Hora: 14:00:00
-- ============================================================================

SET search_path TO core, public;

-- ----------------------------------------------------------------------------
-- Tabla user_connections
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS core.user_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT,
  app_context VARCHAR(50) DEFAULT 'web-local'
);

COMMENT ON TABLE core.user_connections IS 'Registro de accesos del usuario al sitio (ej. web-local). Cada fila es una conexión; no se actualiza.';
COMMENT ON COLUMN core.user_connections.user_id IS 'Usuario que accedió (auth.users)';
COMMENT ON COLUMN core.user_connections.connected_at IS 'Momento del acceso';
COMMENT ON COLUMN core.user_connections.ip_address IS 'IP del cliente (nullable)';
COMMENT ON COLUMN core.user_connections.user_agent IS 'User-Agent del navegador (nullable)';
COMMENT ON COLUMN core.user_connections.app_context IS 'Contexto de la app: web-local, etc.';

-- Índices para listar últimas por usuario
CREATE INDEX IF NOT EXISTS idx_user_connections_user_id ON core.user_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_connected_at ON core.user_connections(connected_at DESC);

-- ============================================================================
-- NOTAS
-- ============================================================================
-- - No hay updated_at: cada fila es solo inserción.
-- - El backend inserta una fila al registrar conexión (POST /auth/me/connection).
-- - GET /auth/me/connections consulta por user_id ordenado por connected_at DESC.
-- ============================================================================
