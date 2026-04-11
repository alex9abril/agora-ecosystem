-- ============================================================================
-- AGORA ECOSYSTEM - Add: frontend_origin column to orders.orders
-- ============================================================================
-- Descripción: Agrega la columna frontend_origin a la tabla orders.orders
-- para guardar la URL base del frontend desde donde se realizó el pedido.
-- Esto permite que los correos de notificación generen links correctos
-- apuntando al dominio real (producción, staging, localhost, etc.).
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-04-11
-- Hora: 14:30:00
-- ============================================================================

-- Agregar columna frontend_origin si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'orders'
          AND table_name = 'orders'
          AND column_name = 'frontend_origin'
    ) THEN
        ALTER TABLE orders.orders ADD COLUMN frontend_origin VARCHAR(255);
        RAISE NOTICE 'Columna frontend_origin agregada a orders.orders';
    ELSE
        RAISE NOTICE 'Columna frontend_origin ya existe en orders.orders';
    END IF;
END $$;

-- ============================================================================
-- NOTAS
-- ============================================================================
-- - frontend_origin guarda la URL base del frontend (ej: https://agoramp.mx,
--   http://localhost:3008) desde donde se realizó el pedido.
-- - Es nullable: pedidos antiguos no tendrán este valor y se usará
--   FRONTEND_URL del .env como fallback.
-- - No requiere índice ya que solo se lee al enviar correos.
-- ============================================================================
