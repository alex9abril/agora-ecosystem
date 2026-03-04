-- ============================================================================
-- AGORA ECOSYSTEM - Migration: Columna archived_at en core.stores
-- ============================================================================
-- Descripción: Añade la columna archived_at a core.stores para permitir
--              archivar un canal de venta de forma irreversible desde la UI.
--              Las tiendas archivadas no se muestran en listados ni en
--              resolución por path; la fila se mantiene por integridad
--              referencial (orders.store_id, store_status_log).
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-02-19
-- Hora: 14:00:00
-- ============================================================================

SET search_path TO core, catalog, public;

-- ----------------------------------------------------------------------------
-- Añadir columna archived_at
-- ----------------------------------------------------------------------------
ALTER TABLE core.stores
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP NULL;

COMMENT ON COLUMN core.stores.archived_at IS 'Si no es NULL, la tienda está archivada y no debe mostrarse en listados ni resolverse por path. Irreversible desde la UI.';

-- Índice para filtrar listados (excluir archivadas)
CREATE INDEX IF NOT EXISTS idx_stores_archived_at ON core.stores (archived_at) WHERE archived_at IS NULL;

-- ============================================================================
-- NOTAS
-- ============================================================================
-- - Archivado es distinto de deshabilitar (is_active): una tienda deshabilitada
--   puede reactivarse; una archivada no se muestra en ninguna parte.
-- - No se elimina la fila para mantener integridad con orders.store_id y
--   core.store_status_log.
-- - El backend debe: en findAll excluir WHERE archived_at IS NULL; en findById
--   devolver 404 si archived_at IS NOT NULL; en resolveStoreFromPath añadir
--   AND archived_at IS NULL.
-- ============================================================================
