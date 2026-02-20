-- ============================================================================
-- AGORA ECOSYSTEM - Migración: Agregar store_context a orders.orders
-- ============================================================================
-- Descripción: Agrega la columna store_context (TEXT) para guardar la ruta
--              de contexto de tienda desde la que se hizo el pedido
--              (ej: /sucursal/toyota-satelite, /grupo/toyota-group, /marca/xxx).
--              Usada para construir la URL de "Ver detalle del pedido" en el
--              correo de confirmación y redirigir a la misma tienda.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-02-19
-- Hora: 12:00:00
-- ============================================================================

SET search_path TO orders, public;

-- ============================================================================
-- AGREGAR COLUMNA store_context A orders.orders
-- ============================================================================

ALTER TABLE orders.orders
ADD COLUMN IF NOT EXISTS store_context TEXT DEFAULT NULL;

COMMENT ON COLUMN orders.orders.store_context IS
  'Ruta de contexto de tienda desde la que se solicitó el pedido (ej: /sucursal/toyota-satelite, /grupo/toyota-group). Se usa para la URL de redirección en el correo de confirmación. NULL = sin contexto (fallback a sucursal por business_id).';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'orders'
          AND table_name = 'orders'
          AND column_name = 'store_context'
    ) THEN
        RAISE NOTICE 'Columna orders.orders.store_context creada o ya existía correctamente.';
    ELSE
        RAISE EXCEPTION 'No se pudo crear la columna store_context en orders.orders.';
    END IF;
END $$;

-- ============================================================================
-- NOTAS:
-- ============================================================================
-- 1. store_context es opcional (NULL). Pedidos existentes y APIs sin contexto quedan NULL.
-- 2. El front envía storeContext en CheckoutDto (ej: /grupo/toyota-group). Guardar tal cual.
-- 3. Al enviar el correo: orderUrl = FRONTEND_URL + (store_context || /sucursal/{slug}) + /orders/{id}
-- ============================================================================
