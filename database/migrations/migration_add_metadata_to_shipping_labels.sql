-- ============================================================================
-- MIGRACIÓN: Agregar metadata a orders.shipping_labels
-- ============================================================================
-- Descripción: Agrega una columna JSONB para almacenar la respuesta completa
--              de Skydropx cuando se crea un shipment, incluyendo información
--              adicional como workflow_status, carrier, service, etc.
--
-- Fecha: 2025-01-XX
-- Versión: 1.0
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- Agregar columna metadata a orders.shipping_labels
ALTER TABLE orders.shipping_labels
ADD COLUMN IF NOT EXISTS metadata JSONB;

COMMENT ON COLUMN orders.shipping_labels.metadata IS 'Respuesta completa de Skydropx al crear el shipment, incluyendo workflow_status, carrier, service y otros datos adicionales';

-- Crear índice GIN para búsquedas rápidas en JSONB
CREATE INDEX IF NOT EXISTS idx_shipping_labels_metadata
    ON orders.shipping_labels USING GIN (metadata)
    WHERE metadata IS NOT NULL;

-- ============================================================================
-- NOTAS
-- ============================================================================
-- El campo metadata almacena la respuesta completa de Skydropx cuando se crea
-- un shipment, permitiendo acceso a información adicional como:
-- - workflow_status
-- - carrier y service
-- - Respuesta completa de la API
-- - Cualquier otro dato adicional que Skydropx retorne
-- ============================================================================

