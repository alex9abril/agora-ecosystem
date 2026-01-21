-- ============================================================================
-- AGORA ECOSYSTEM - Add: Image URL to Product Collections
-- ============================================================================
-- Descripción: Agrega el campo image_url a las colecciones de productos
-- para almacenar la URL pública de una imagen asociada a la colección.
-- Incluye validación posterior para confirmar la columna.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-01-20
-- Hora: 10:00:00
-- ============================================================================

-- ============================================================================
-- CONFIGURACION INICIAL
-- ============================================================================
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- CUERPO DEL SCRIPT
-- ============================================================================
ALTER TABLE catalog.product_colecciones
ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN catalog.product_colecciones.image_url IS 'URL pública de la imagen de la colección';

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
      AND column_name = 'image_url'
  ) THEN
    RAISE EXCEPTION 'No se creó la columna image_url en catalog.product_colecciones';
  END IF;
END $$;

-- ============================================================================
-- NOTAS:
-- ============================================================================
-- 1. Esta migración NO carga imágenes, solo agrega la columna de URL.
-- 2. La carga de imágenes se gestiona vía endpoint y storage de Supabase.
-- ============================================================================
