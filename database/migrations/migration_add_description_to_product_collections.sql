-- ============================================================================
-- AGORA ECOSYSTEM - Add: Description to Product Collections
-- ============================================================================
-- Descripción: Agrega el campo description a las colecciones de productos
-- para almacenar una descripción visible en el storefront y paneles
-- administrativos. Incluye validación posterior para confirmar la columna.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-01-21
-- Hora: 11:00:00
-- ============================================================================

-- ============================================================================
-- CONFIGURACION INICIAL
-- ============================================================================
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- CUERPO DEL SCRIPT
-- ============================================================================
ALTER TABLE catalog.product_colecciones
ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN catalog.product_colecciones.description IS 'Descripción visible de la colección';

-- ============================================================================
-- VERIFICACIONES
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'catalog'
      AND table_name = 'product_colecciones'
      AND column_name = 'description'
  ) THEN
    RAISE EXCEPTION 'No se creó la columna description en catalog.product_colecciones';
  END IF;
END $$;

-- ============================================================================
-- NOTAS:
-- ============================================================================
-- 1. Esta migración no cambia datos existentes; el campo es opcional.
-- 2. La descripción puede usarse en el storefront para mostrar contexto.
-- ============================================================================
