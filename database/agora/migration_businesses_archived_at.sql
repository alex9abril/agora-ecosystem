-- ============================================================================
-- AGORA ECOSYSTEM - Migration: Columna archived_at en core.businesses
-- ============================================================================
-- Descripción: Añade la columna archived_at a core.businesses para permitir
--              archivar una sucursal de forma irreversible desde la UI, con
--              o sin tienda (canal) asociada. Las sucursales archivadas no
--              deben mostrarse en listados ni en selector de sucursal.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-03-04
-- Hora: 22:30:00
-- ============================================================================

SET search_path TO core, catalog, public;

-- ----------------------------------------------------------------------------
-- Añadir columna archived_at
-- ----------------------------------------------------------------------------
ALTER TABLE core.businesses
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP NULL;

COMMENT ON COLUMN core.businesses.archived_at IS 'Si no es NULL, la sucursal está archivada y no debe mostrarse en listados ni selector. Irreversible desde la UI.';

-- Índice para filtrar listados (excluir archivadas)
CREATE INDEX IF NOT EXISTS idx_businesses_archived_at ON core.businesses (archived_at) WHERE archived_at IS NULL;

-- ============================================================================
-- NOTAS
-- ============================================================================
-- - Archivado es distinto de deshabilitar (is_active): una sucursal deshabilitada
--   puede reactivarse; una archivada no se muestra.
-- - No se elimina la fila para mantener integridad referencial (orders.business_id,
--   business_users, etc.).
-- - El backend debe: en getBranches y listados excluir WHERE archived_at IS NULL;
--   en archiveBranch, si no hay tienda asociada, solo marcar business.archived_at
--   y is_active = FALSE.
-- ============================================================================
