-- ============================================================================
-- AGORA ECOSYSTEM - Migración: Agregar campo metadata (JSON) a productos
-- ============================================================================
-- Descripción: Agrega la columna metadata de tipo JSONB a catalog.products
--              para almacenar datos adicionales flexibles por producto
--              (ej. origen, certificaciones, atributos personalizados, etc.).
--
-- Formato: JSON válido. Ejemplo:
--   {"origin": "local", "certifications": ["organic"], "custom_attributes": {}}
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-02-11
-- Hora: 14:00:00
-- ============================================================================

SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- AGREGAR COLUMNA metadata A catalog.products
-- ============================================================================

ALTER TABLE catalog.products
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;

COMMENT ON COLUMN catalog.products.metadata IS
  'Metadatos adicionales del producto en formato JSON. Ej: origen, certificaciones, atributos personalizados.';

-- Índice GIN para consultas sobre claves/valores dentro del JSON (opcional, útil si filtrarás por metadata)
CREATE INDEX IF NOT EXISTS idx_products_metadata
    ON catalog.products USING GIN (metadata)
    WHERE metadata IS NOT NULL;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'catalog'
          AND table_name = 'products'
          AND column_name = 'metadata'
          AND data_type = 'jsonb'
    ) THEN
        RAISE NOTICE 'Columna catalog.products.metadata (JSONB) creada o ya existía correctamente.';
    ELSE
        RAISE EXCEPTION 'No se pudo crear la columna metadata en catalog.products.';
    END IF;
END $$;

-- ============================================================================
-- NOTAS:
-- ============================================================================
-- 1. metadata es opcional (NULL por defecto). Los productos existentes quedan con metadata NULL.
-- 2. Usar JSONB permite consultas y índices sobre el contenido (ej. metadata->>'origin' = 'local').
-- 3. Ejemplo de actualización: UPDATE catalog.products SET metadata = '{"origin":"local","tags":["nuevo"]}'::jsonb WHERE id = $1;
-- 4. Ejemplo de lectura: SELECT id, name, metadata FROM catalog.products WHERE metadata ? 'certifications';
-- ============================================================================
