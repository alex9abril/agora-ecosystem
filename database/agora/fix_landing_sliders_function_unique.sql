-- ============================================================================
-- AGORA ECOSYSTEM - Fix: función get_landing_sliders_by_context única
-- ============================================================================
-- Descripción: Elimina la versión antigua (3 parámetros) de
--              get_landing_sliders_by_context para que no haya ambigüedad.
--              Ejecutar si la migración_landing_sliders_global_and_brand.sql
--              falló con "function name is not unique".
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-02-20
-- ============================================================================

SET search_path TO core, catalog, commerce, public;

-- Eliminar solo la versión de 3 parámetros (grupo, sucursal, only_active)
DROP FUNCTION IF EXISTS commerce.get_landing_sliders_by_context(UUID, UUID, BOOLEAN);

-- Opcional: asegurar comentario en la versión de 4 parámetros
COMMENT ON FUNCTION commerce.get_landing_sliders_by_context(UUID, UUID, UUID, BOOLEAN) IS
  'Obtiene sliders activos para un contexto: grupo, sucursal, marca o global (todos null). Ordenados por display_order.';

-- ============================================================================
-- NOTAS
-- ============================================================================
-- Tras ejecutar este script, solo quedará la función de 4 parámetros que usa
-- el backend. Ejecutar una sola vez.
-- ============================================================================
